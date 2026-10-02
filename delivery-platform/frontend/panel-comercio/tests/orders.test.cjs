const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const compiled = new Module(__filename);
compiled._compile(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/orders.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, __filename);
const { createMockOrders, createIncomingOrder, advanceOrder, orderTotal, elapsedTime } = compiled.exports;
test('kitchen filters ignore accents, sort oldest first and exclude ready orders from overdue', () => {
  const { selectOrders } = compiled.exports;
  const now = Date.now();
  const orders = createMockOrders(now);
  assert.equal(selectOrders(orders, 'maria', false, now).length, 1);
  assert.equal(selectOrders(orders, '', false, now)[0].id, 'ORD-BABA-001');
  assert.equal(selectOrders(orders, '', true, now).length, 0);
  assert.equal(selectOrders(orders, '', true, now + 20 * 60000).length, 3);
  assert.equal(orders[0].id, 'ORD-BABA-004');
});
test('a comanda advances through all three columns without changing its details', () => {
  const orders = createMockOrders();
  const preparing = advanceOrder(orders, orders[0].id, 'PENDING');
  assert.equal(preparing[0].status, 'PREPARING');
  assert.equal(orders[0].status, 'PENDING');
  assert.deepEqual(preparing[0].items, orders[0].items);
  const ready = advanceOrder(preparing, orders[0].id, 'PREPARING');
  assert.equal(ready[0].status, 'READY_FOR_PICKUP');
  assert.deepEqual(advanceOrder(ready, orders[0].id, 'READY_FOR_PICKUP'), ready);
});
test('repeated stale clicks cannot skip preparation', () => {
  const orders = createMockOrders();
  const next = advanceOrder(orders, orders[0].id, 'PENDING');
  assert.deepEqual(advanceOrder(next, orders[0].id, 'PENDING'), next);
  assert.deepEqual(advanceOrder(orders, 'missing', 'PENDING'), orders);
});
test('totals use quantities and cents', () => {
  assert.equal(orderTotal(createMockOrders()[0]), 12);
  assert.equal(orderTotal({ items: [{ quantity: 3, unitPrice: 0.1 }, { quantity: 1, unitPrice: 0.2 }] }), 0.5);
});
test('elapsed time handles hour boundaries and future timestamps', () => {
  assert.equal(elapsedTime(0, 59000), '0 min');
  assert.equal(elapsedTime(0, 60000), '1 min');
  assert.equal(elapsedTime(0, 61 * 60000), '1 h 1 min');
  assert.equal(elapsedTime(100, 0), '0 min');
});
test('simulated arrivals have unique IDs, pending state and current timestamps', () => {
  const initial = createMockOrders(1000);
  const incoming = Array.from({ length: 30 }, (_, i) => createIncomingOrder(i, 1000));
  assert.equal(new Set([...initial, ...incoming].map(order => order.id)).size, 34);
  assert.ok(incoming.every(order => order.status === 'PENDING' && order.createdAt === 1000));
  assert.deepEqual(new Set(initial.map(order => order.status)), new Set(['PENDING', 'PREPARING', 'READY_FOR_PICKUP']));
});
