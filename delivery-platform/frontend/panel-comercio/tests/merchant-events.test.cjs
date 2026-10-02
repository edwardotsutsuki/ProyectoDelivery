const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isMerchantOrderEvent, subscribeMerchant } = require('./load-ts.cjs')('../src/merchantEvents.ts');
const merchant = '55555555-5555-5555-5555-555555555555';
test('merchant events accept creation/status envelopes and reject malformed or foreign events', () => {
  for (const payload of [{ event: 'order:created', pedido: { comercioId: merchant } }, { type: 'ORDER_STATUS_CHANGED', comercioId: merchant }]) {
    assert.equal(isMerchantOrderEvent(JSON.stringify({ type: 'ORDER_EVENT', payload }), merchant), true);
  }
  assert.equal(isMerchantOrderEvent(JSON.stringify({ event: 'order:created', data: { merchant_id: merchant } }), merchant), true);
  for (const raw of ['{bad', 'null', '{}', JSON.stringify({ type: 'ORDER_EVENT', payload: { event: 'order:created', comercioId: 'other' } }), JSON.stringify({ type: 'ORDER_EVENT', payload: { event: 'order:status_updated' } })]) {
    assert.equal(isMerchantOrderEvent(raw, merchant), false);
  }
});
test('subscription reconnects, reconciles on acknowledgement and stops after cleanup', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const sockets = []; const states = []; let invalidations = 0;
  global.WebSocket = class {
    constructor(url) { this.url = url; this.sent = []; sockets.push(this); }
    send(raw) { this.sent.push(JSON.parse(raw)); }
    close() { this.closed = true; this.onclose?.(); }
  };
  const stop = subscribeMerchant(merchant, () => invalidations++, value => states.push(value));
  sockets[0].onopen();
  assert.equal(sockets[0].url, 'ws://localhost:8080/ws/');
  assert.deepEqual(sockets[0].sent, [{ type: 'SUBSCRIBE_MERCHANT', comercioId: merchant }]);
  sockets[0].onmessage({ data: JSON.stringify({ type: 'SUBSCRIBED_MERCHANT', comercioId: merchant }) });
  assert.equal(states.at(-1), 'connected'); assert.equal(invalidations, 1);
  sockets[0].close(); t.mock.timers.tick(1000);
  assert.equal(sockets.length, 2);
  sockets[1].onopen(); assert.equal(sockets[1].sent[0].comercioId, merchant);
  stop(); t.mock.timers.tick(60000);
  assert.equal(sockets.length, 2); assert.equal(sockets[1].closed, true);
  sockets[1].onmessage({ data: JSON.stringify({ type: 'SUBSCRIBED_MERCHANT', comercioId: merchant }) });
  assert.equal(invalidations, 1);
});
