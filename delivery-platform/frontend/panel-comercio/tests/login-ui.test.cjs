const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3003/login' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { render, screen, cleanup, within, act } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const loadTs = require('./load-ts.cjs');
const { authClient } = loadTs('../src/auth.ts');
const { AuthProvider } = loadTs('../src/AuthProvider.tsx');
const { ThemeProvider } = loadTs('../src/ThemeProvider.tsx');
const Login = loadTs('../src/pages/Login.tsx').default;
const KanbanOrders = loadTs('../src/pages/KanbanOrders.tsx').default;
const { createMockOrders, createIncomingOrder } = loadTs('../src/orders.ts');
const h = React.createElement;
const accessToken = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.signature`;
function mount() {
  return render(h(ThemeProvider, null, h(AuthProvider, null, h(MemoryRouter, { initialEntries: ['/login'], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, h(Routes, null,
    h(Route, { path: '/login', element: h(Login) }), h(Route, { path: '/pedidos', element: h('h1', null, 'Panel autorizado') }),
  )))));
}
const sockets = [];
beforeEach(() => {
  localStorage.clear(); window.sessionStorage.clear(); authClient.signOut(); sockets.length = 0;
  global.WebSocket = class {
    constructor(url) { this.url = url; this.sent = []; sockets.push(this); }
    send(raw) { this.sent.push(JSON.parse(raw)); }
    close() { this.closed = true; this.onclose?.(); }
  };
});
afterEach(() => { cleanup(); });
test('empty form focuses invalid email and never calls the network', async () => {
  let calls = 0; global.fetch = async () => { calls++; throw new Error(); };
  mount(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Ingresar al panel' }));
  assert.equal(screen.getByLabelText('Correo electrónico').getAttribute('aria-invalid'), 'true');
  assert.equal(document.activeElement, screen.getByLabelText('Correo electrónico'));
  assert.equal(calls, 0);
});
test('theme survives remount and password visibility stays accessible', async () => {
  const user = userEvent.setup(); const view = mount();
  await user.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
  assert.equal(localStorage.getItem('delivery.comercio.theme'), 'dark');
  await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
  assert.equal(screen.getByLabelText('Contraseña').type, 'text');
  view.unmount(); mount();
  assert.ok(screen.getByRole('button', { name: 'Activar modo claro' }));
});
test('server outage shows a focused error and allows retry', async () => {
  global.fetch = async () => new Response(null, { status: 502 });
  mount(); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), 'chef@example.com');
  await user.type(screen.getByLabelText('Contraseña'), 'test password');
  await user.click(screen.getByRole('button', { name: 'Ingresar al panel' }));
  const alert = await screen.findByRole('alert');
  assert.match(alert.textContent, /más tarde/);
  assert.equal(document.activeElement, alert.parentElement);
  assert.equal(screen.getByRole('button', { name: 'Ingresar al panel' }).disabled, false);
});
test('successful login redirects only after server permission check, without saving password', async () => {
  const urls = [];
  global.fetch = async url => { urls.push(url); return new Response(JSON.stringify(url.endsWith('/login') ? { success: true, data: { user: { role: 'comercio' }, tokens: { accessToken, refreshToken: 'opaque' } } } : { success: true })); };
  mount(); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Correo electrónico'), 'chef@example.com');
  await user.type(screen.getByLabelText('Contraseña'), 'test password');
  await user.click(screen.getByLabelText('Recordarme en este dispositivo'));
  await user.click(screen.getByRole('button', { name: 'Ingresar al panel' }));
  await screen.findByRole('heading', { name: 'Panel autorizado' });
  assert.ok(urls[1].endsWith('/auth/comercio/check'));
  assert.ok(!localStorage.getItem('delivery.comercio.session').includes('test password'));
});
test('Kanban filters do not lose orders and advancing a card preserves keyboard focus', async () => {
  render(h(KanbanOrders, { source: 'mock' })); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Buscar pedido o cliente'), 'maria');
  assert.equal(screen.getAllByRole('article').length, 1);
  await user.click(screen.getByRole('button', { name: 'Empezar preparación, pedido ORD-BABA-004' }));
  const kitchen = screen.getByRole('region', { name: 'En Cocina / Preparación' });
  assert.ok(within(kitchen).getByRole('heading', { name: '#ORD-BABA-004' }));
  assert.equal(document.activeElement.id, 'order-ORD-BABA-004');
  await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  assert.equal(screen.getAllByRole('article').length, 4);
});
test('sound triggers for arrivals, not initial data, filters or state transitions', async () => {
  let tones = 0;
  window.AudioContext = class {
    state = 'running'; currentTime = 0; destination = {};
    resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
    createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { tones++; }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  };
  render(h(React.StrictMode, null, h(KanbanOrders, { source: 'mock' }))); const user = userEvent.setup();
  assert.equal(tones, 0);
  await user.click(screen.getByRole('button', { name: 'Activar sonido' }));
  assert.equal(tones, 2);
  await user.click(screen.getByRole('button', { name: 'Simular nuevo pedido' }));
  assert.equal(tones, 4);
  await user.type(screen.getByLabelText('Buscar pedido o cliente'), 'maria');
  await user.click(screen.getByRole('button', { name: 'Empezar preparación, pedido ORD-BABA-004' }));
  assert.equal(tones, 4);
  await user.click(screen.getByRole('button', { name: 'Sonido activado' }));
  await user.click(screen.getByRole('button', { name: 'Simular nuevo pedido' }));
  assert.equal(tones, 4);
  assert.equal(localStorage.getItem('delivery.comercio.sound'), 'muted');
});
test('API board is silent on initial load and alerts once for a newly fetched pending order', async () => {
  let tones = 0;
  window.AudioContext = class {
    state = 'running'; currentTime = 0; destination = {};
    resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
    createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { tones++; }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  };
  let data = createMockOrders();
  const api = { list: async () => data, advance: async () => 'PREPARING' };
  render(h(KanbanOrders, { source: 'api', merchantId: 'merch-baba-01', api })); const user = userEvent.setup();
  await screen.findByRole('heading', { name: '#ORD-BABA-004' });
  assert.equal(tones, 0);
  assert.equal(screen.queryByRole('button', { name: 'Simular nuevo pedido' }), null);
  await user.click(screen.getByRole('button', { name: 'Activar sonido' })); assert.equal(tones, 2);
  data = [...data, createIncomingOrder(0)];
  await user.click(screen.getByRole('button', { name: 'Actualizar pedidos' }));
  await screen.findByRole('heading', { name: '#ORD-BABA-005' });
  assert.equal(tones, 4);
  await user.click(screen.getByRole('button', { name: 'Actualizar pedidos' }));
  assert.equal(tones, 4);
});
test('API failures retain cards, failed mutations never move a card, unmount aborts requests', async () => {
  let signal; let rejectLoad = false; let releaseMutation;
  const api = {
    list: async (_, currentSignal) => { signal = currentSignal; if (rejectLoad) throw new Error('Servidor no disponible'); return createMockOrders(); },
    advance: () => new Promise((_, reject) => { releaseMutation = () => reject(new Error('No se pudo guardar')); }),
  };
  const view = render(h(KanbanOrders, { source: 'api', merchantId: 'merch-baba-01', api })); const user = userEvent.setup();
  await screen.findByRole('heading', { name: '#ORD-BABA-004' });
  const button = screen.getByRole('button', { name: 'Empezar preparación, pedido ORD-BABA-004' });
  await user.click(button); assert.equal(button.disabled, true);
  await act(async () => releaseMutation());
  await screen.findByText('No se pudo guardar');
  assert.ok(within(screen.getByRole('region', { name: 'Nuevos / Pendientes' })).getByRole('heading', { name: '#ORD-BABA-004' }));
  rejectLoad = true;
  await user.click(screen.getByRole('button', { name: 'Actualizar pedidos' }));
  await screen.findByText('Servidor no disponible');
  assert.equal(screen.getAllByRole('article').length, 4);
  view.unmount(); assert.equal(signal.aborted, true);
});
test('a late poll response cannot undo a confirmed state change', async () => {
  let calls = 0; let releasePoll;
  const api = { list: () => ++calls === 1 ? Promise.resolve(createMockOrders()) : new Promise(resolve => { releasePoll = resolve; }), advance: async () => 'PREPARING' };
  render(h(KanbanOrders, { source: 'api', merchantId: 'merch-baba-01', api })); const user = userEvent.setup();
  await screen.findByRole('heading', { name: '#ORD-BABA-004' });
  await user.click(screen.getByRole('button', { name: 'Actualizar pedidos' }));
  await user.click(screen.getByRole('button', { name: 'Empezar preparación, pedido ORD-BABA-004' }));
  await act(async () => releasePoll(createMockOrders()));
  assert.ok(within(screen.getByRole('region', { name: 'En Cocina / Preparación' })).getByRole('heading', { name: '#ORD-BABA-004' }));
});
