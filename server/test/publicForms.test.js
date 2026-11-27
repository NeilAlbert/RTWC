/* The contact, prayer request and newsletter forms: validation, honeypots, the
   notification emails (through the mail stub) and the per-address limit. */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { sentMail } = require('./helpers/setup');
const { start, stop, request, getPool } = require('./helpers/app');
const { PRIVATE_NOTICE } = require('../controllers/prayerRequestsController');

before(start);
after(stop);
beforeEach(() => { sentMail.length = 0; });

async function count(table) {
  const [[row]] = await getPool().query(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(row.total);
}

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

test('contact: a valid message is saved and emailed with Reply-To set to the visitor', async () => {
  const res = await request('/api/contact', {
    method: 'POST',
    body: { name: 'Ama Mensah', email: 'Ama.Mensah@Gmail.com', message: 'Please tell me the service times.' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.success, true);

  const [[row]] = await getPool().query('SELECT name, email, message FROM contact_messages ORDER BY id DESC LIMIT 1');
  // Lowercased and trimmed only: the dot in a Gmail address is kept (N3).
  assert.equal(row.email, 'ama.mensah@gmail.com');

  assert.equal(sentMail.length, 1);
  assert.equal(sentMail[0].replyTo, 'ama.mensah@gmail.com');
  assert.equal(sentMail[0].to, 'office@test.invalid');
  assert.equal(sentMail[0].subject, 'New message from the church website');
  assert.match(sentMail[0].text, /Please tell me the service times\./);
});

test('contact: visitor text cannot change the subject or add headers', async () => {
  const res = await request('/api/contact', {
    method: 'POST',
    body: { name: 'Kofi\r\nBcc: someone@test.invalid', email: 'kofi@test.invalid', message: 'Hello\r\nSubject: changed' },
  });
  assert.equal(res.status, 201);
  assert.equal(sentMail.length, 1);
  const mail = sentMail[0];
  assert.equal(mail.subject, 'New message from the church website');
  assert.equal(mail.bcc, undefined);
  assert.equal(mail.cc, undefined);
  assert.deepEqual(Object.keys(mail).sort(), ['from', 'html', 'replyTo', 'subject', 'text', 'to']);
});

test('contact: an address with a line break is refused, not used as Reply-To', async () => {
  const res = await request('/api/contact', {
    method: 'POST',
    body: { name: 'Kofi', email: 'kofi@test.invalid\r\nBcc: x@test.invalid', message: 'Hello there' },
  });
  assert.equal(res.status, 400);
  assert.equal(sentMail.length, 0);
});

test('contact: a bad email or a short message is refused and nothing is saved', async () => {
  const before = await count('contact_messages');
  const badEmail = await request('/api/contact', { method: 'POST', body: { name: 'Ama', email: 'not-an-email', message: 'Hello there' } });
  const shortMessage = await request('/api/contact', { method: 'POST', body: { name: 'Ama', email: 'ama@test.invalid', message: 'Hi' } });
  const noName = await request('/api/contact', { method: 'POST', body: { email: 'ama@test.invalid', message: 'Hello there' } });
  [badEmail, shortMessage, noName].forEach((res) => {
    assert.equal(res.status, 400);
    assert.equal(res.json.success, false);
  });
  assert.equal(await count('contact_messages'), before);
  assert.equal(sentMail.length, 0);
});

test('contact: a filled-in honeypot gets the normal reply, and nothing is saved or sent', async () => {
  const before = await count('contact_messages');
  const res = await request('/api/contact', {
    method: 'POST',
    body: { name: 'Bot', email: 'bot@test.invalid', message: 'Buy now buy now', website: 'https://spam.test.invalid' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.success, true);
  assert.equal(res.json.message, 'Thank you. We received your message.');
  assert.equal(await count('contact_messages'), before);
  assert.equal(sentMail.length, 0);
});

test('contact: 5 messages per 15 minutes from one address, then 429', async () => {
  const ip = '203.0.113.50';
  for (let i = 1; i <= 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await request('/api/contact', { method: 'POST', ip, body: { name: 'Ama', email: 'ama@test.invalid', message: `Message number ${i}` } });
    assert.equal(res.status, 201, `message ${i}`);
  }
  const blocked = await request('/api/contact', { method: 'POST', ip, body: { name: 'Ama', email: 'ama@test.invalid', message: 'One too many' } });
  assert.equal(blocked.status, 429);
});

// ---------------------------------------------------------------------------
// Prayer requests
// ---------------------------------------------------------------------------

test('prayer: a private request is saved, and the email holds no name or text', async () => {
  const res = await request('/api/prayer-requests', {
    method: 'POST',
    body: { name: 'Esi Owusu', request_text: 'Please pray for my mother in hospital.', is_private: true },
  });
  assert.equal(res.status, 201);

  const [[row]] = await getPool().query('SELECT name, request_text, is_private FROM prayer_requests ORDER BY id DESC LIMIT 1');
  assert.equal(row.name, 'Esi Owusu');
  assert.equal(row.is_private, 1);

  assert.equal(sentMail.length, 1);
  assert.equal(sentMail[0].text, PRIVATE_NOTICE);
  assert.doesNotMatch(JSON.stringify(sentMail[0]), /Esi|mother|hospital/);
  assert.equal(sentMail[0].subject, 'New prayer request from the church website');
});

test('prayer: a request that may be shared is emailed with its name and text', async () => {
  const res = await request('/api/prayer-requests', {
    method: 'POST',
    body: { name: 'Yaw', request_text: 'Thanksgiving for a safe journey.', is_private: false },
  });
  assert.equal(res.status, 201);
  assert.equal(sentMail.length, 1);
  assert.match(sentMail[0].text, /Name: Yaw/);
  assert.match(sentMail[0].text, /Thanksgiving for a safe journey\./);
});

test('prayer: a blank name is saved as Anonymous; a short request is refused', async () => {
  const ok = await request('/api/prayer-requests', { method: 'POST', body: { request_text: 'Pray for our exams.', is_private: false } });
  assert.equal(ok.status, 201);
  const [[row]] = await getPool().query('SELECT name FROM prayer_requests ORDER BY id DESC LIMIT 1');
  assert.equal(row.name, 'Anonymous');

  const short = await request('/api/prayer-requests', { method: 'POST', body: { request_text: 'Hi' } });
  assert.equal(short.status, 400);
});

test('prayer: a filled-in honeypot gets the normal reply, and nothing is saved or sent', async () => {
  const before = await count('prayer_requests');
  const res = await request('/api/prayer-requests', {
    method: 'POST',
    body: { request_text: 'Spam spam spam spam', website: 'x' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.message, 'Thank you. We received your prayer request.');
  assert.equal(await count('prayer_requests'), before);
  assert.equal(sentMail.length, 0);
});

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

test('newsletter: a valid address is saved once; the reply is the same the second time', async () => {
  const first = await request('/api/newsletter/subscribe', { method: 'POST', body: { email: 'Kwame@Test.invalid' } });
  const second = await request('/api/newsletter/subscribe', { method: 'POST', body: { email: 'kwame@test.invalid' } });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.json.message, second.json.message);
  const [rows] = await getPool().query('SELECT email FROM newsletter_subscribers WHERE email = ?', ['kwame@test.invalid']);
  assert.equal(rows.length, 1);
});

test('newsletter: a bad address is refused', async () => {
  const res = await request('/api/newsletter/subscribe', { method: 'POST', body: { email: 'not an email' } });
  assert.equal(res.status, 400);
});

test('newsletter: a filled-in honeypot gets the normal reply, and nothing is saved', async () => {
  const before = await count('newsletter_subscribers');
  const res = await request('/api/newsletter/subscribe', { method: 'POST', body: { email: 'bot@test.invalid', website: 'x' } });
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.equal(await count('newsletter_subscribers'), before);
});
