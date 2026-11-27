/* The public sermon list the Sermons page and the home page read (B3). */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, request, createAdmin, login } = require('./helpers/app');

let token;

before(async () => {
  await start();
  const admin = await createAdmin();
  token = await login(admin.email, admin.password);
});
after(stop);

test('with no sermons the list is empty', async () => {
  const res = await request('/api/sermons?page=1&limit=20');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data.items, []);
  assert.equal(res.json.data.pagination.total, 0);
});

test('sermons saved in the admin appear at once, newest first, 20 to a page', async () => {
  for (let day = 1; day <= 25; day += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await request('/api/admin/sermons', {
      method: 'POST',
      token,
      body: {
        title: `Sermon ${day}`,
        speaker: day % 2 ? 'Elder Speaker A' : 'Pastor Speaker B',
        sermon_date: `2026-10-${String(day).padStart(2, '0')}`,
        video_url: day === 25 ? 'https://www.facebook.com/example/videos/1' : '',
      },
    });
    assert.equal(res.status, 201);
  }

  const first = await request('/api/sermons?page=1&limit=20');
  assert.equal(first.json.data.items.length, 20);
  assert.equal(first.json.data.pagination.totalPages, 2);
  assert.equal(first.json.data.items[0].title, 'Sermon 25');
  assert.equal(first.json.data.items[0].sermon_date, '2026-10-25');

  const second = await request('/api/sermons?page=2&limit=20');
  assert.equal(second.json.data.items.length, 5);

  const newest = await request('/api/sermons?page=1&limit=1');
  assert.equal(newest.json.data.items[0].video_url, 'https://www.facebook.com/example/videos/1');
});

test('the search box (q) and the speaker filter narrow the list', async () => {
  const search = await request(`/api/sermons?q=${encodeURIComponent('Sermon 2')}&limit=20`);
  // Sermon 2 and Sermon 20 to 25.
  assert.equal(search.json.data.pagination.total, 7);

  const speaker = await request(`/api/sermons?speaker=${encodeURIComponent('Pastor Speaker B')}&limit=20`);
  assert.equal(speaker.json.data.pagination.total, 12);
  assert.ok(speaker.json.data.items.every((sermon) => sermon.speaker === 'Pastor Speaker B'));
});
