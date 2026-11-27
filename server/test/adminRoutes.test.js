/*
 * Every admin route refuses a request without a token. The list of routes is
 * read from the app itself, so a route added later is tested too, and a route
 * under /api/admin without authMiddleware fails this test unless it is listed
 * in PUBLIC_ADMIN_ROUTES on purpose.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, request, getApp } = require('./helpers/app');
const authMiddleware = require('../middleware/authMiddleware');

// Reached with a single-use download ticket instead of a sign-in (routes/adminBackups.js).
const PUBLIC_ADMIN_ROUTES = new Set(['GET /api/admin/backups/download/:ticket']);

// A sample value for each route parameter, in the form its validator accepts.
const SAMPLE_PARAMS = {
  id: '1',
  filename: '0123456789abcdef0123456789abcdef.jpg',
  ticket: 'A'.repeat(43),
  jobId: '0123456789abcdef0123456789abcdef',
  sessionId: '0123456789abcdef0123456789abcdef',
  slug: 'sample',
};

/** "/^\/api\/admin\/?(?=\/|$)/i" (how Express 4 stores a mount path) back to "/api/admin". */
function mountPath(layer) {
  if (layer.path) return layer.path;
  return layer.regexp.source
    .replace('^', '')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\\\//g, '/');
}

/** Every route in the app: { method, path, protected }. */
function listRoutes(stack, prefix = '', guarded = false) {
  const routes = [];
  let routerGuarded = guarded;
  stack.forEach((layer) => {
    if (layer.route) {
      const routeGuarded = routerGuarded || layer.route.stack.some((step) => step.handle === authMiddleware);
      Object.keys(layer.route.methods).forEach((method) => {
        routes.push({ method: method.toUpperCase(), path: `${prefix}${layer.route.path}`, protected: routeGuarded });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      routes.push(...listRoutes(layer.handle.stack, `${prefix}${mountPath(layer)}`, routerGuarded));
    } else if (layer.handle === authMiddleware) {
      // router.use(authMiddleware): every route after it in this router is guarded.
      routerGuarded = true;
    }
  });
  return routes;
}

let routes = [];

before(async () => {
  await start();
  routes = listRoutes(getApp()._router.stack);
});
after(stop);

test('the route list was read from the app', () => {
  const admin = routes.filter((route) => route.path.startsWith('/api/admin'));
  assert.ok(admin.length >= 40, `found only ${admin.length} admin routes`);
});

test('every /api/admin route is guarded by authMiddleware, apart from the listed exceptions', () => {
  const unguarded = routes
    .filter((route) => route.path.startsWith('/api/admin') && !route.protected)
    .map((route) => `${route.method} ${route.path}`)
    .filter((name) => !PUBLIC_ADMIN_ROUTES.has(name));
  assert.deepEqual(unguarded, []);
});

test('every guarded route answers 401 without a token', async () => {
  const guarded = routes.filter((route) => route.protected);
  const failures = [];
  for (const route of guarded) {
    const url = route.path.replace(/:([A-Za-z]+)/g, (match, name) => SAMPLE_PARAMS[name] || 'x');
    const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method) ? {} : undefined;
    // eslint-disable-next-line no-await-in-loop
    const res = await request(url, { method: route.method, body });
    if (res.status !== 401) failures.push(`${route.method} ${route.path} answered ${res.status}`);
    else assert.equal(res.json.success, false);
  }
  assert.deepEqual(failures, []);
  assert.ok(guarded.length >= 45, `only ${guarded.length} guarded routes were tried`);
});

test('a made-up token is refused too', async () => {
  const res = await request('/api/admin/contact', { token: 'not.a.token' });
  assert.equal(res.status, 401);
});
