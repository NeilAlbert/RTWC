/**
 * services/backupCrypto.js: the encrypted .rtwcbackup file format.
 *
 * A backup holds private prayer requests, messages and email addresses, so the
 * whole file is encrypted with AES-256-GCM. The key comes from a passphrase via
 * scrypt with a random salt. Nothing about the passphrase is stored, only what is
 * needed to check it.
 *
 * GCM can only check a message once it has all of it, which would mean holding a
 * whole backup in memory. So the data is split into chunks of 64 KiB and each
 * chunk is encrypted and checked on its own (the "STREAM" construction):
 * - nonce of chunk i = noncePrefix (7 bytes) | i (4 bytes, big-endian) | last (1 byte: 1 on the final chunk)
 * - every chunk is authenticated together with the whole header (as additional data),
 *   so a changed header, a changed chunk, chunks swapped or removed, or a file cut
 *   short are all detected. A wrong passphrase is told apart from a damaged file by
 *   the key check value in the header.
 *
 * File layout (all numbers big-endian):
 *   offset  size  content
 *        0     8  magic "RTWCBKUP"
 *        8     1  format version (1)
 *        9     1  key derivation: 1 = scrypt
 *       10     1  scrypt log2(N)
 *       11     1  scrypt r
 *       12     1  scrypt p
 *       13     1  log2(chunk size), 16 = 64 KiB
 *       14    16  salt
 *       30     7  nonce prefix
 *       37    16  key check: HMAC-SHA256(check key, bytes 0 to 36), first 16 bytes
 *       53     .  chunks: ciphertext (chunk size, the last one shorter) + 16-byte tag
 *
 * The scrypt output is split with HKDF into an encryption key and a check key.
 */
const crypto = require('crypto');
const fs = require('fs');
const { Transform, Readable } = require('stream');
const yauzl = require('yauzl');

const MAGIC = Buffer.from('RTWCBKUP', 'ascii');
const FORMAT_VERSION = 1;
const KDF_SCRYPT = 1;
const HEADER_BYTES = 53;
const SIGNED_HEADER_BYTES = 37;
const TAG_BYTES = 16;
const FILE_EXTENSION = '.rtwcbackup';

// scrypt N = 2^17, r = 8, p = 1 takes about 128 MiB of memory for a moment while
// the key is made. A file may say other values; only these limits are accepted
// when reading one, so a crafted file cannot make the server use more.
const SCRYPT = { logN: 17, r: 8, p: 1 };
const SCRYPT_MAX_MEMORY = 256 * 1024 * 1024 + 1024 * 1024;
const CHUNK_LOG2 = 16;

/** A problem with a backup file. `reason` is one of the keys of MESSAGES. */
class BackupFileError extends Error {
  constructor(reason) {
    super(BackupFileError.MESSAGES[reason] || BackupFileError.MESSAGES.damaged);
    this.name = 'BackupFileError';
    this.reason = reason;
    this.status = 400;
  }
}
BackupFileError.MESSAGES = {
  not_backup: 'This is not a Royal Temple backup file.',
  unsupported: 'This backup file was made by a newer version of the website and cannot be opened here.',
  wrong_passphrase: 'The passphrase is not correct for this backup file.',
  damaged: 'The backup file has been changed or damaged, so it cannot be opened.',
  rows: 'Some rows in the backup file do not match the database, so it cannot be restored.',
};

function scryptAsync(passphrase, salt, { logN, r, p }) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(Buffer.from(passphrase, 'utf8'), salt, 32, { N: 2 ** logN, r, p, maxmem: SCRYPT_MAX_MEMORY }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

function subKeys(master) {
  return {
    encKey: Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'rtwc backup encryption', 32)),
    checkKey: Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'rtwc backup key check', 32)),
  };
}

function keyCheck(checkKey, signedHeader) {
  return crypto.createHmac('sha256', checkKey).update(signedHeader).digest().subarray(0, 16);
}

/**
 * Makes a new header and key for one file: a random salt and nonce prefix each time.
 * Returns { header, encKey, noncePrefix, chunkSize }.
 */
async function newFileKey(passphrase) {
  const salt = crypto.randomBytes(16);
  const noncePrefix = crypto.randomBytes(7);
  const signed = Buffer.concat([
    MAGIC,
    Buffer.from([FORMAT_VERSION, KDF_SCRYPT, SCRYPT.logN, SCRYPT.r, SCRYPT.p, CHUNK_LOG2]),
    salt,
    noncePrefix,
  ]);
  const { encKey, checkKey } = subKeys(await scryptAsync(passphrase, salt, SCRYPT));
  const header = Buffer.concat([signed, keyCheck(checkKey, signed)]);
  return { header, encKey, noncePrefix, chunkSize: 2 ** CHUNK_LOG2 };
}

/** Reads the header fields. Throws BackupFileError when it is not a backup this code can read. */
function parseHeader(header) {
  if (header.length < HEADER_BYTES || !header.subarray(0, 8).equals(MAGIC)) throw new BackupFileError('not_backup');
  const version = header[8];
  if (version !== FORMAT_VERSION) throw new BackupFileError(version > FORMAT_VERSION ? 'unsupported' : 'not_backup');
  const kdf = header[9];
  const logN = header[10];
  const r = header[11];
  const p = header[12];
  const chunkLog2 = header[13];
  // The limits a genuine file never goes beyond. 128 * N * r must fit in SCRYPT_MAX_MEMORY.
  if (kdf !== KDF_SCRYPT || logN < 14 || logN > 18 || r < 1 || r > 16 || p < 1 || p > 4
      || 128 * (2 ** logN) * r > SCRYPT_MAX_MEMORY - 1024 * 1024 || chunkLog2 < 12 || chunkLog2 > 20) {
    throw new BackupFileError('damaged');
  }
  return {
    scrypt: { logN, r, p },
    chunkSize: 2 ** chunkLog2,
    salt: header.subarray(14, 30),
    noncePrefix: header.subarray(30, 37),
    check: header.subarray(37, 53),
    header: header.subarray(0, HEADER_BYTES),
  };
}

/**
 * Checks the passphrase against a header. Returns { encKey, noncePrefix, chunkSize, header }.
 * Throws BackupFileError('wrong_passphrase') when it does not match.
 */
async function openFileKey(headerBytes, passphrase) {
  const parsed = parseHeader(headerBytes);
  const { encKey, checkKey } = subKeys(await scryptAsync(passphrase, parsed.salt, parsed.scrypt));
  const expected = keyCheck(checkKey, parsed.header.subarray(0, SIGNED_HEADER_BYTES));
  if (!crypto.timingSafeEqual(expected, parsed.check)) throw new BackupFileError('wrong_passphrase');
  return { encKey, noncePrefix: parsed.noncePrefix, chunkSize: parsed.chunkSize, header: parsed.header };
}

function nonceFor(noncePrefix, index, isLast) {
  const nonce = Buffer.alloc(12);
  noncePrefix.copy(nonce, 0);
  nonce.writeUInt32BE(index, 7);
  nonce[11] = isLast ? 1 : 0;
  return nonce;
}

function sealChunk(key, noncePrefix, header, index, isLast, plaintext) {
  if (index > 0xffffffff) throw new Error('Backup file is too large for its format');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonceFor(noncePrefix, index, isLast));
  cipher.setAAD(header);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([body, cipher.getAuthTag()]);
}

function openChunk(key, noncePrefix, header, index, isLast, sealed) {
  if (sealed.length < TAG_BYTES) throw new BackupFileError('damaged');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonceFor(noncePrefix, index, isLast));
  decipher.setAAD(header);
  decipher.setAuthTag(sealed.subarray(sealed.length - TAG_BYTES));
  try {
    return Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - TAG_BYTES)), decipher.final()]);
  } catch (err) {
    throw new BackupFileError('damaged');
  }
}

/** Collects incoming buffers and hands them out in exact sizes, without copying more than needed. */
class ByteQueue {
  constructor() {
    this.parts = [];
    this.length = 0;
  }

  push(buffer) {
    if (buffer.length === 0) return;
    this.parts.push(buffer);
    this.length += buffer.length;
  }

  take(size) {
    const out = Buffer.allocUnsafe(size);
    let filled = 0;
    while (filled < size) {
      const part = this.parts[0];
      const needed = size - filled;
      if (part.length <= needed) {
        part.copy(out, filled);
        filled += part.length;
        this.parts.shift();
      } else {
        part.copy(out, filled, 0, needed);
        this.parts[0] = part.subarray(needed);
        filled += needed;
      }
    }
    this.length -= size;
    return out;
  }
}

/**
 * The encrypting stream: plain bytes in, the complete .rtwcbackup file out.
 * A chunk is sealed only once more data follows it, so the final chunk is known.
 */
function createEncryptStream({ header, encKey, noncePrefix, chunkSize }) {
  const queue = new ByteQueue();
  let index = 0;
  let headerSent = false;
  const sendHeader = (stream) => {
    if (!headerSent) {
      stream.push(header);
      headerSent = true;
    }
  };
  return new Transform({
    transform(chunk, encoding, callback) {
      try {
        sendHeader(this);
        queue.push(chunk);
        while (queue.length > chunkSize) {
          this.push(sealChunk(encKey, noncePrefix, header, index, false, queue.take(chunkSize)));
          index += 1;
        }
        callback();
      } catch (err) {
        callback(err);
      }
    },
    flush(callback) {
      try {
        sendHeader(this);
        this.push(sealChunk(encKey, noncePrefix, header, index, true, queue.take(queue.length)));
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}

/**
 * The decrypting stream: the chunks of a file (everything after the header) in,
 * checked plain bytes out. Nothing is passed on before its chunk is checked, and
 * a file that ends early fails at the end.
 */
function createDecryptStream({ header, encKey, noncePrefix, chunkSize }) {
  const queue = new ByteQueue();
  const sealedSize = chunkSize + TAG_BYTES;
  let index = 0;
  return new Transform({
    transform(chunk, encoding, callback) {
      try {
        queue.push(chunk);
        while (queue.length > sealedSize) {
          this.push(openChunk(encKey, noncePrefix, header, index, false, queue.take(sealedSize)));
          index += 1;
        }
        callback();
      } catch (err) {
        callback(err);
      }
    },
    flush(callback) {
      try {
        if (queue.length < TAG_BYTES) throw new BackupFileError('damaged');
        this.push(openChunk(encKey, noncePrefix, header, index, true, queue.take(queue.length)));
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}

/** Reads the first HEADER_BYTES of a file. */
async function readHeader(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEADER_BYTES, 0);
    if (bytesRead < HEADER_BYTES) throw new BackupFileError('not_backup');
    return buffer;
  } finally {
    await handle.close();
  }
}

/**
 * Lets yauzl read the zip inside an encrypted file as if it were a plain file,
 * by decrypting only the chunks each read needs. No decrypted copy is written to
 * disk and the file is never held in memory. Every chunk read is checked.
 */
class EncryptedFileReader extends yauzl.RandomAccessReader {
  constructor(handle, fileSize, { header, encKey, noncePrefix, chunkSize }) {
    super();
    const body = fileSize - HEADER_BYTES;
    const sealedSize = chunkSize + TAG_BYTES;
    const count = Math.ceil(body / sealedSize);
    const lastSealed = body - (count - 1) * sealedSize;
    if (body < TAG_BYTES || count < 1 || lastSealed < TAG_BYTES) throw new BackupFileError('damaged');
    Object.assign(this, { handle, header, encKey, noncePrefix, chunkSize, sealedSize, count, lastSealed });
    this.plainSize = body - count * TAG_BYTES;
    this.cached = { index: -1, plain: null };
  }

  async plainChunk(index) {
    if (this.cached.index === index) return this.cached.plain;
    const isLast = index === this.count - 1;
    const size = isLast ? this.lastSealed : this.sealedSize;
    const sealed = Buffer.alloc(size);
    const { bytesRead } = await this.handle.read(sealed, 0, size, HEADER_BYTES + index * this.sealedSize);
    if (bytesRead !== size) throw new BackupFileError('damaged');
    const plain = openChunk(this.encKey, this.noncePrefix, this.header, index, isLast, sealed);
    this.cached = { index, plain };
    return plain;
  }

  _readStreamForRange(start, end) {
    const reader = this;
    async function* range() {
      let position = start;
      while (position < end) {
        const index = Math.floor(position / reader.chunkSize);
        if (index >= reader.count) throw new BackupFileError('damaged');
        const plain = await reader.plainChunk(index);
        const offset = position - index * reader.chunkSize;
        const piece = plain.subarray(offset, Math.min(plain.length, offset + (end - position)));
        if (piece.length === 0) throw new BackupFileError('damaged');
        position += piece.length;
        yield Buffer.from(piece);
      }
    }
    return Readable.from(range(), { objectMode: false });
  }

  // A handle that is already closed is not a problem here, so its error is not passed on
  // (yauzl would raise it as an unhandled 'error' event).
  close(callback) {
    this.handle.close().then(() => callback(), () => callback());
  }
}

/**
 * Opens the zip inside an encrypted backup file. Returns { zip, close() }.
 * keyInfo comes from openFileKey() or newFileKey().
 */
async function openEncryptedZip(filePath, keyInfo) {
  const handle = await fs.promises.open(filePath, 'r');
  let reader;
  try {
    const { size } = await handle.stat();
    reader = new EncryptedFileReader(handle, size, keyInfo);
    const zip = await yauzl.fromRandomAccessReaderPromise(reader, reader.plainSize, { autoClose: false, strictFileNames: true });
    return {
      zip,
      // yauzl closes the reader once nothing uses it; closing the handle here makes sure it goes.
      close: async () => {
        zip.close();
        await handle.close().catch(() => undefined);
      },
    };
  } catch (err) {
    await handle.close().catch(() => {});
    if (err instanceof BackupFileError) throw err;
    throw new BackupFileError('damaged');
  }
}

/** Throws BackupFileError unless the bytes start like a backup file this code can read. */
function checkHeader(headerBytes) {
  parseHeader(headerBytes);
}

module.exports = {
  FILE_EXTENSION,
  checkHeader,
  HEADER_BYTES,
  MAGIC,
  BackupFileError,
  newFileKey,
  openFileKey,
  readHeader,
  createEncryptStream,
  createDecryptStream,
  openEncryptedZip,
};
