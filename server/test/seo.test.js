/* utils/seo.js: canonical links, share image, Church details, sitemap and
   robots.txt, with and without SITE_URL. Needs no database. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const seo = require('../utils/seo');

const SITE_ROOT = path.join(__dirname, '..', '..');
const readPage = (file) => fs.readFileSync(path.join(SITE_ROOT, file), 'utf8');
const original = process.env.SITE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = original;
});

test('the public pages carry the marker, and the error pages do not', () => {
  assert.deepEqual(seo.publicPages(), [
    'index.html', 'about.html', 'contact.html', 'events.html',
    'gallery.html', 'live.html', 'ministries.html', 'sermons.html',
  ]);
  assert.ok(!readPage('404.html').includes(seo.MARKER));
  assert.ok(!readPage('500.html').includes(seo.MARKER));
});

test('SITE_URL is read as an origin, and a bad value is ignored', () => {
  process.env.SITE_URL = 'https://www.example.org/';
  assert.equal(seo.siteUrl(), 'https://www.example.org');
  ['', 'example.org', 'ftp://example.org', 'https://example.org/church', 'https://user:pw@example.org']
    .forEach((value) => {
      process.env.SITE_URL = value;
      assert.equal(seo.siteUrl(), '', value);
    });
});

test('without SITE_URL the marker line is removed and nothing else changes', () => {
  delete process.env.SITE_URL;
  const html = readPage('about.html');
  const out = seo.renderPage(html, 'about.html', null);
  assert.ok(!out.includes(seo.MARKER));
  assert.ok(!out.includes('canonical'));
  assert.equal(out, html.replace(/[ \t]*<!-- seo:head -->\r?\n?/, ''));
  assert.equal(seo.sitemap(), null);
  assert.equal(seo.robots('User-agent: *\nDisallow: /admin/\n'), 'User-agent: *\nDisallow: /admin/\n');
});

test('a page gets its canonical link, og:url and share image', () => {
  process.env.SITE_URL = 'https://www.example.org';
  const out = seo.renderPage(readPage('events.html'), 'events.html', null);
  assert.match(out, /<link rel="canonical" href="https:\/\/www\.example\.org\/events\.html">/);
  assert.match(out, /<meta property="og:url" content="https:\/\/www\.example\.org\/events\.html">/);
  assert.match(out, /<meta property="og:image" content="https:\/\/www\.example\.org\/assets\/images\/hero\.jpg">/);
  assert.doesNotMatch(out, /ld\+json/);
});

test('the home page is canonical at / and lists only the settings that are filled in', () => {
  process.env.SITE_URL = 'https://www.example.org';
  const settings = {
    church_address: 'Line one\nLine two',
    phone_number: '[ADD: phone]',
    email: '',
    youtube_channel_url: 'https://www.youtube.com/@example',
  };
  const out = seo.renderPage(readPage('index.html'), 'index.html', settings);
  assert.match(out, /<link rel="canonical" href="https:\/\/www\.example\.org\/">/);
  const json = JSON.parse(out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(json['@type'], 'Church');
  assert.equal(json.name, 'Royal Temple Worship Centre');
  assert.equal(json.address, 'Line one, Line two');
  assert.equal(json.telephone, undefined);
  assert.equal(json.email, undefined);
  assert.deepEqual(json.sameAs, ['https://www.facebook.com/cop.rtwc', 'https://www.youtube.com/@example']);
});

test('a setting cannot close the Church script element', () => {
  process.env.SITE_URL = 'https://www.example.org';
  const out = seo.renderPage(readPage('index.html'), 'index.html', { church_address: '</script><script>alert(1)</script>' });
  const script = out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(script, /</);
  assert.equal(JSON.parse(script).address, '</script><script>alert(1)</script>');
});

test('the sitemap lists the eight public pages and robots.txt points to it', () => {
  process.env.SITE_URL = 'https://www.example.org';
  const xml = seo.sitemap();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, 8);
  assert.equal(locs[0], 'https://www.example.org/');
  assert.ok(!locs.some((loc) => /404|500|admin/.test(loc)));
  assert.equal(
    seo.robots('User-agent: *\nDisallow: /admin/\n'),
    'User-agent: *\nDisallow: /admin/\n\nSitemap: https://www.example.org/sitemap.xml\n',
  );
});
