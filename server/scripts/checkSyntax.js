/**
 * scripts/checkSyntax.js: checks that every JavaScript file in the project can be
 * parsed (node --check), without running any of them. Part of `npm run check`.
 *
 * Covers the public site (js/), the admin (admin/js/) and the server. Skips
 * node_modules, admin-old (not served) and tool folders.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SKIP = new Set(['node_modules', 'admin-old', '.git', '.claude', '.agents', '.freebuff', 'logs', 'backups']);

function jsFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return jsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const files = jsFiles(ROOT);
const failed = files.filter((file) => {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status === 0) return false;
  process.stderr.write(`${path.relative(ROOT, file)}\n${result.stderr}\n`);
  return true;
});

if (failed.length > 0) {
  process.stderr.write(`Syntax check failed: ${failed.length} of ${files.length} files.\n`);
  process.exit(1);
}
process.stdout.write(`Syntax check passed: ${files.length} files.\n`);
