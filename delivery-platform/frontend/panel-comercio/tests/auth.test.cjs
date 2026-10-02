const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createAuthClient, SESSION_KEY, tokenExpiresAt } = require('./load-ts.cjs')('../src/auth.ts');
const token = seconds => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url')}.signature`;
const session = (seconds = 600) => ({ accessToken: token(seconds), refreshToken: 'opaque-refresh-token' });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const response = value => new Response(JSON.stringify(value));
const client = (refreshEnabled = true) => createAuthClient({ apiBaseUrl: 'http://localhost:8080/api/v1', refreshEnabled });
const signIn = (auth, remember = false) => auth.signIn(' chef@example.com ', ' pass ', remember, new AbortController().signal);
beforeEach(() => {
  global.window = { localStorage: storage(), sessionStorage: storage() };
  global.fetch = async url => response(url.endsWith('/auth/comercio/check') ? { success: true } : session());
});
test('login posts credentials, checks server permission then persists according to Recordarme', async () => {
  const auth = client(); const urls = [];
  global.fetch = async (url, options) => {
    urls.push(url);
    if (url.endsWith('/login')) assert.deepEqual(JSON.parse(options.body), { email: 'chef@example.com', password: ' pass ' });
    else assert.equal(options.headers.get('Authorization'), `Bearer ${session().accessToken}`);
    return response(url.endsWith('/login') ? { data: session() } : { success: true });
  };
  await signIn(auth, true);
  assert.equal(auth.getSnapshot().status, 'authenticated');
  assert.ok(window.localStorage.getItem(SESSION_KEY));
  assert.equal(urls.length, 2);
  await signIn(auth, false);
  assert.equal(window.localStorage.getItem(SESSION_KEY), null);
  assert.ok(window.sessionStorage.getItem(SESSION_KEY));
});
test('a valid-looking JWT without server permission never opens the panel', async () => {
  const auth = client();
  global.fetch = async url => url.endsWith('/login') ? response(session()) : new Response('internal detail', { status: 403 });
  await assert.rejects(signIn(auth), /no tiene acceso/);
  assert.notEqual(auth.getSnapshot().status, 'authenticated');
  assert.equal(window.sessionStorage.getItem(SESSION_KEY), null);
});
test('server errors use controlled, actionable messages', async () => {
  for (const [status, text] of [[401, /incorrectos/], [403, /no tiene acceso/], [429, /Demasiados/], [502, /más tarde/]]) {
    global.fetch = async () => new Response('secret internal detail', { status });
    await assert.rejects(signIn(client()), text);
  }
});
test('malformed responses and expired access tokens are rejected', async () => {
  for (const value of ['bad json', '{}', JSON.stringify({ accessToken: token(60) }), JSON.stringify(session(-1))]) {
    global.fetch = async () => new Response(value);
    await assert.rejects(signIn(client()), /sesión válida/);
  }
  assert.equal(tokenExpiresAt('bad'), 0);
});
test('network or disabled storage cannot authenticate a user', async () => {
  const auth = client();
  window.localStorage.setItem = () => { throw new Error('blocked'); };
  await assert.rejects(signIn(auth, true), /almacenamiento/);
  assert.notEqual(auth.getSnapshot().status, 'authenticated');
  global.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(signIn(auth), /conexión/);
});
test('restore rechecks permissions and keeps stored session during a server outage', async () => {
  const auth = client(); await signIn(auth);
  global.fetch = async () => new Response(null, { status: 502 });
  await auth.restore();
  assert.equal(auth.getSnapshot().status, 'unavailable');
  assert.ok(window.sessionStorage.getItem(SESSION_KEY));
  global.fetch = async () => response({ success: true });
  await auth.restore(); assert.equal(auth.getSnapshot().status, 'authenticated');
});
test('concurrent refresh shares a single operation and rotates persisted tokens', async () => {
  const auth = client(); await signIn(auth, true);
  let calls = 0;
  global.fetch = async url => { if (url.endsWith('/refresh')) calls++; return response(url.endsWith('/refresh') ? session(1800) : {}); };
  const values = await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()]);
  assert.equal(calls, 1); assert.equal(values[0].accessToken, token(1800));
  assert.equal(JSON.parse(window.localStorage.getItem(SESSION_KEY)).accessToken, token(1800));
});
test('late refresh after logout cannot resurrect the session', async () => {
  const auth = client(); await signIn(auth);
  let release;
  global.fetch = url => url.endsWith('/refresh') ? new Promise(resolve => { release = resolve; }) : Promise.resolve(response({}));
  const pending = auth.refresh(); auth.signOut(); release(response(session(1800)));
  await assert.rejects(pending, /sesión cambió/);
  assert.equal(auth.getSnapshot().status, 'anonymous');
  assert.equal(window.sessionStorage.getItem(SESSION_KEY), null);
});
test('revoked refresh clears storage, but a disabled refresh never calls an invented endpoint', async () => {
  const auth = client(); await signIn(auth);
  global.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(auth.refresh()); assert.equal(auth.getSnapshot().status, 'anonymous');
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session(-1)));
  const disabled = client(false); let calls = 0;
  global.fetch = async () => { calls++; return response(session()); };
  await disabled.restore(); assert.equal(calls, 0); assert.equal(disabled.getSnapshot().status, 'anonymous');
});
test('authorized requests retry a GET once, never automatically repeat a mutation', async () => {
  const auth = client(); await signIn(auth);
  let reads = 0, writes = 0;
  global.fetch = async (url, options) => {
    if (url.endsWith('/refresh')) return response(session(1800));
    if (url.endsWith('/comercio/check')) return response({});
    if (options.method === 'PATCH') { writes++; return new Response(null, { status: 401 }); }
    return ++reads === 1 ? new Response(null, { status: 401 }) : response({ orders: [] });
  };
  await auth.authorizedRequest('/orders'); assert.equal(reads, 2);
  await assert.rejects(auth.authorizedRequest('/orders/1', { method: 'PATCH', body: '{}' }), /Reintenta/);
  assert.equal(writes, 1);
});
test('aborted login and malformed saved sessions do not grant access', async () => {
  const auth = client();
  const controller = new AbortController(); controller.abort();
  await auth.signIn('a@b.com', 'pass', false, controller.signal);
  assert.notEqual(auth.getSnapshot().status, 'authenticated');
  window.localStorage.setItem(SESSION_KEY, '{bad');
  await auth.restore(); assert.equal(auth.getSnapshot().status, 'anonymous');
});
