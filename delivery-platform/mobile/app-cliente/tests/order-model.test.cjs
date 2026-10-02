const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CATALOG, RESTAURANT, DEFAULT_ADDRESS, cartLines, cartTotals, changeQuantity, checkoutError, prepareCheckout, money } = require('../src/orderModel.ts');

test('Baba catalog starts with an empty cart and never charges empty delivery', () => {
  assert.match(RESTAURANT.name, /Baba Centro/);
  assert.ok(CATALOG.some(item => item.name === 'Seco de gallina'));
  assert.ok(CATALOG.some(item => item.name === 'Bolón mixto'));
  assert.deepEqual(cartTotals({}), { count: 0, subtotalCents: 0, deliveryCents: 0, totalCents: 0 });
});
test('adding quantities merges a product and calculates exact cents plus one delivery fee', () => {
  let cart = changeQuantity({}, 'seco-gallina', 1);
  cart = changeQuantity(cart, 'seco-gallina', 1);
  cart = changeQuantity(cart, 'bolon-mixto', 1);
  assert.equal(cartLines(cart).length, 2);
  assert.deepEqual(cartTotals(cart), { count: 3, subtotalCents: 1275, deliveryCents: 150, totalCents: 1425 });
  assert.equal(money(cartTotals(cart).totalCents), '$14.25');
});
test('decrement, remove and quantity limit preserve immutable state', () => {
  const cart = { 'bolon-mixto': 2 };
  const next = changeQuantity(cart, 'bolon-mixto', -1);
  assert.equal(cart['bolon-mixto'], 2);
  assert.equal(next['bolon-mixto'], 1);
  assert.deepEqual(changeQuantity(next, 'bolon-mixto', -1), {});
  assert.deepEqual(changeQuantity({}, 'bolon-mixto', -1), {});
  assert.equal(changeQuantity(cart, 'bolon-mixto', 100)['bolon-mixto'], 99);
  assert.deepEqual(changeQuantity(cart, 'unknown', 1), cart);
  assert.deepEqual(changeQuantity(cart, 'bolon-mixto', 0.5), cart);
});
test('checkout rejects empty cart, malformed quantities, address and payment', () => {
  const valid = { 'seco-gallina': 1 };
  for (const args of [[{}, DEFAULT_ADDRESS, 'efectivo'], [valid, '  ', 'efectivo'], [valid, 'a'.repeat(201), 'efectivo'], [valid, DEFAULT_ADDRESS, 'tarjeta'], [{ ...valid, 'bolon-mixto': -1 }, DEFAULT_ADDRESS, 'efectivo'], [{ ...valid, unknown: 1 }, DEFAULT_ADDRESS, 'efectivo']]) {
    assert.ok(checkoutError(...args));
    assert.throws(() => prepareCheckout(...args));
  }
});
test('cash and transfer summaries capture address and items without changing the cart', () => {
  const cart = { 'bolon-mixto': 2, cafe: 1 };
  for (const payment of ['efectivo', 'transferencia']) {
    const receipt = prepareCheckout(cart, `  ${DEFAULT_ADDRESS}  `, payment);
    assert.equal(receipt.address, DEFAULT_ADDRESS);
    assert.equal(receipt.payment, payment);
    assert.equal(receipt.totalCents, 1050);
    assert.equal(receipt.city, 'Baba');
    assert.equal(receipt.items[0].quantity, 2);
  }
  const receipt = prepareCheckout(cart, DEFAULT_ADDRESS, 'efectivo');
  cart['bolon-mixto'] = 9;
  assert.equal(receipt.items[0].quantity, 2);
  assert.equal(receipt.totalCents, 1050);
});
