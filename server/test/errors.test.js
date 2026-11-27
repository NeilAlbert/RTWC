/* The 404 and 500 replies: a web page for a browser, JSON for /api, and never
   the address that was asked for. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { start, stop, request } = require('./helpers/app');
const { notFound, errorHandler } = require('../middleware/errorHandler');

const HTML = { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };

before(start);
after(stop);

test('an unknown page asked for by a browser gets 404.html', async () => {
  const res = await request('/no-such-page-abc123.html', { headers: HTML });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(res.text, /<h1>Page not found<\/h1>/);
  assert.match(res.text, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(res.text, /abc123/);
});

test('an unknown address deep inside a folder still gets the page, with working links', async () => {
  const res = await request('/admin/a/b/missing-xyz.html', { headers: HTML });
  assert.equal(res.status, 404);
  assert.match(res.text, /href="\/css\/style\.css"/);
  assert.doesNotMatch(res.text, /missing-xyz/);
});

test('an unknown /api address gets JSON, without the address', async () => {
  const res = await request('/api/no-such-route-abc123', { headers: HTML });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(res.json, { success: false, data: null, message: 'Not found.' });
});

test('a request that does not ask for HTML gets JSON', async () => {
  const res = await request('/no-such-file-abc123.css', { headers: { Accept: 'text/css' } });
  assert.equal(res.status, 404);
  assert.doesNotMatch(res.text, /abc123/);
});

test('404.html and 500.html are not offered to search engines', async () => {
  const notFoundPage = await request('/404.html');
  const errorPage = await request('/500.html');
  assert.match(notFoundPage.text, /noindex/);
  assert.match(errorPage.text, /noindex/);
});

// The 500 reply, through the real handlers on a small app whose routes fail.
test('a server error gets 500.html for a page and plain JSON for /api', async () => {
  const failing = express();
  failing.get('/broken.html', (req, res, next) => next(new Error('secret internal detail')));
  failing.get('/api/broken', (req, res, next) => next(Object.assign(new Error('SELECT * FROM admins'), { sqlMessage: 'x' })));
  failing.use(notFound);
  failing.use(errorHandler);
  const server = await new Promise((resolve) => { const s = failing.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(`${base}/broken.html`, { headers: HTML });
    const pageText = await page.text();
    assert.equal(page.status, 500);
    assert.match(pageText, /<h1>Something went wrong<\/h1>/);
    assert.doesNotMatch(pageText, /secret internal detail/);

    const api = await fetch(`${base}/api/broken`, { headers: HTML });
    const apiJson = await api.json();
    assert.equal(api.status, 500);
    assert.deepEqual(apiJson, { success: false, data: null, message: 'The server has a problem and could not complete the request.' });
  } finally {
    await new Promise((resolve) => { server.close(resolve); });
  }
});
