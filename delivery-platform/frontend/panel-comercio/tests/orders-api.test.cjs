const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');
const { parseOrders, createOrdersApi } = loadTs('../src/ordersApi.ts');
const { apiRequest } = loadTs('../src/http.ts');
const { createMockOrders, createIncomingOrder, orderTotal } = loadTs('../src/orders.ts');
const row = () => ({ id: 'ORD-BABA-001', estado: 'creado', cliente_nombre: 'María Vera', direccion_entrega: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba', fecha_creacion: new Date(Date.now() - 60000).toISOString(), total: '10.50', items: [{ producto: 'Seco de gallina', cantidad: 2, precio_unitario: '4.50' }] });
test('normalizes the existing controller response and preserves the total including delivery fees', () => {
  const [order] = parseOrders({ success: true, data: [row()] }, 'merch-baba-01');
  assert.equal(order.status, 'PENDING'); assert.equal(order.items[0].unitPrice, 4.5);
  assert.equal(orderTotal(order), 10.5);
});
test('supports canonical contract states and removes delivered/cancelled orders from the board', () => {
  const data = { ...row(), id: undefined, order_id: 'ORD-BABA-002', estado: undefined, status: 'PREPARING', merchant_id: 'merch-baba-01', customer_name: 'Cliente de Baba', items: [{ name: 'Bolón mixto', qty: 1, price: 3.75 }] };
  assert.equal(parseOrders([data], 'merch-baba-01')[0].status, 'PREPARING');
  assert.equal(parseOrders([{ ...data, status: 'DELIVERED' }], 'merch-baba-01').length, 0);
});
test('rejects cross-merchant, duplicate, malformed and unknown-state responses', () => {
  for (const value of [{ data: [row(), row()] }, { data: [{ ...row(), comercio_id: 'other' }] }, { data: [{ ...row(), estado: 'constructor' }] }, { data: [{ ...row(), total: '' }] }, { data: [{ ...row(), fecha_creacion: null }] }, { data: [{ ...row(), items: [] }] }, { success: false, data: [] }]) {
    assert.throws(() => parseOrders(value, 'merch-baba-01'));
  }
});
test('GET and PATCH target the configured orders gateway and observed backend routes', async () => {
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(options.method === 'PATCH' ? { success: true } : { success: true, data: [row()] })); };
  const api = createOrdersApi(apiRequest);
  const [order] = await api.list('merch-baba-01', new AbortController().signal);
  assert.equal(calls[0].url, 'http://localhost:8080/api/v1/orders/comercio/merch-baba-01');
  assert.equal(await api.advance(order, new AbortController().signal), 'PREPARING');
  assert.equal(calls[1].url, 'http://localhost:8080/api/v1/orders/ORD-BABA-001/estado');
  assert.deepEqual(JSON.parse(calls[1].options.body), { nuevoEstado: 'en_preparacion' });
});
test('an unconfirmed mutation or missing merchant never appears successful', async () => {
  let requests = 0;
  const api = createOrdersApi(async () => { requests++; return new Response(JSON.stringify({ success: false })); });
  await assert.rejects(api.list('', new AbortController().signal), /identificar tu comercio/);
  assert.equal(requests, 0);
  await assert.rejects(api.advance(createMockOrders()[0], new AbortController().signal), /no confirmó/);
});
test('all initial and incoming demo deliveries belong to Baba', () => {
  const orders = [...createMockOrders(), ...Array.from({ length: 12 }, (_, i) => createIncomingOrder(i))];
  assert.ok(orders.every(order => order.id.startsWith('ORD-BABA-') && order.address.includes('Baba') && order.restaurant.includes('Baba')));
  assert.ok(orders.some(order => order.address.includes('Parque Central')));
  assert.ok(orders.some(order => order.address.includes('Bolívar y Sucre')));
});
