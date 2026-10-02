const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3003', pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement; global.Element = dom.window.Element;
window.SVGSVGElement.prototype.createSVGRect = () => ({});
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
global.ResizeObserver = class { observe() {} disconnect() {} };
global.IS_REACT_ACT_ENVIRONMENT = true;
const sockets = [];
global.WebSocket = class {
  constructor(url) { this.url = url; this.sent = []; sockets.push(this); }
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { this.closed = true; this.onclose?.(); }
};
const React = require('react');
const { render, screen, cleanup, act } = require('@testing-library/react');
const Map = require('./load-ts.cjs')('../src/components/CourierTrackingMap.tsx').default;
const props = { orderId: 'ORD-BABA-001', restaurant: { lat: -1.7925, lng: -79.679, name: 'Restaurante de prueba' }, destination: { lat: -1.794, lng: -79.681, name: 'Entrega de prueba' } };
beforeEach(() => {
  sockets.length = 0;
  global.fetch = async () => new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 1200, duration: 240, geometry: { type: 'LineString', coordinates: [[-79.679, -1.7925], [-79.681, -1.794]] } }] }));
});
afterEach(() => cleanup());
test('map subscribes to one order, displays OSRM ETA and ignores positions from another order', async () => {
  const view = render(React.createElement(Map, props));
  await screen.findByText('4 min');
  assert.ok(screen.getByText('1.2 km'));
  await act(async () => sockets[0].onopen());
  assert.deepEqual(sockets[0].sent, [{ type: 'SUBSCRIBE_ORDER', pedidoId: 'ORD-BABA-001' }]);
  const send = orderId => sockets[0].onmessage({ data: JSON.stringify({ type: 'DRIVER_LOCATION', payload: { pedidoId: orderId, lat: -1.793, lon: -79.68, speed: 5, heading: 90 } }) });
  await act(async () => send('other'));
  assert.equal(document.querySelector('[title="Repartidor"]'), null);
  await act(async () => send('ORD-BABA-001'));
  assert.ok(document.querySelector('[title="Repartidor"]'));
  assert.match(screen.getByText(/Última señal/).textContent, /18 km\/h/);
  view.unmount(); assert.equal(sockets[0].closed, true);
});
test('OSRM failure does not fabricate ETA and unmount cancels pending requests', async () => {
  global.fetch = async () => new Response(null, { status: 503 });
  const view = render(React.createElement(Map, props));
  await screen.findByText(/OSRM no disponible o sin ruta/);
  assert.ok(screen.getByText('ETA no disponible'));
  view.unmount();
  let aborted = false;
  global.fetch = (_, options) => new Promise((resolve, reject) => { options.signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }); });
  const pending = render(React.createElement(Map, props));
  await act(async () => pending.unmount());
  assert.equal(aborted, true);
});
test('changing the selected order closes the previous subscription', async () => {
  const view = render(React.createElement(Map, props));
  await screen.findByText('4 min');
  view.rerender(React.createElement(Map, { ...props, orderId: 'ORD-BABA-002' }));
  await act(async () => sockets[1].onopen());
  assert.equal(sockets[0].closed, true);
  assert.equal(sockets[1].sent[0].pedidoId, 'ORD-BABA-002');
});
