/* Sign-in, tokens retired by a password change or log out, and the sign-in limit. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, request, createAdmin, login } = require('./helpers/app');

let admin;

before(async () => {
  await start();
  admin = await createAdmin();
});
after(stop);

test('the right password signs in and the token works', async () => {
  const res = await request('/api/auth/login', { method: 'POST', body: { email: admin.email, password: admin.password } });
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.ok(res.json.data.token);
  assert.equal(res.json.data.admin.password_hash, undefined);

  const me = await request('/api/auth/me', { token: res.json.data.token });
  assert.equal(me.status, 200);
  assert.equal(me.json.data.email, admin.email);
});

test('a wrong password and an unknown email get the same 401 answer', async () => {
  const wrong = await request('/api/auth/login', { method: 'POST', body: { email: admin.email, password: 'not the password' } });
  const unknown = await request('/api/auth/login', { method: 'POST', body: { email: 'nobody@test.invalid', password: 'whatever it is' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.json.message, unknown.json.message);
  assert.equal(wrong.json.data, null);
});

test('a token issued before a password change is refused; the new one works', async () => {
  const oldToken = await login(admin.email, admin.password);
  const changed = await request('/api/auth/password', {
    method: 'PUT',
    token: oldToken,
    body: { current_password: admin.password, new_password: 'a brand new long password' },
  });
  assert.equal(changed.status, 200);
  const newToken = changed.json.data.token;

  assert.equal((await request('/api/auth/me', { token: oldToken })).status, 401);
  assert.equal((await request('/api/admin/stats', { token: oldToken })).status, 401);
  assert.equal((await request('/api/auth/me', { token: newToken })).status, 200);

  admin.password = 'a brand new long password';
});

test('a token used to log out is refused afterwards', async () => {
  const token = await login(admin.email, admin.password);
  assert.equal((await request('/api/auth/logout', { method: 'POST', token })).status, 200);
  assert.equal((await request('/api/auth/me', { token })).status, 401);
});

test('a forged token is refused', async () => {
  const token = await login(admin.email, admin.password);
  const [head, body] = token.split('.');
  assert.equal((await request('/api/auth/me', { token: `${head}.${body}.not-the-signature` })).status, 401);
});

test('sign-in allows 10 attempts per 15 minutes from one address, then 429', async () => {
  const ip = '203.0.113.77';
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await request('/api/auth/login', { method: 'POST', ip, body: { email: admin.email, password: 'wrong guess' } });
    assert.equal(res.status, 401, `attempt ${attempt}`);
  }
  const blocked = await request('/api/auth/login', { method: 'POST', ip, body: { email: admin.email, password: admin.password } });
  assert.equal(blocked.status, 429);

  // Another address is not affected.
  const other = await request('/api/auth/login', { method: 'POST', body: { email: admin.email, password: admin.password } });
  assert.equal(other.status, 200);
});
