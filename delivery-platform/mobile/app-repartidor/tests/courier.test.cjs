const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initialShift, setAvailability, transition, navigationUrls, COURIER_ID } = require('../src/courierModel.ts');
test('Baba shift starts offline with ready deliveries and rejects offline acceptance', () => {
  const shift = initialShift();
  assert.equal(shift.online, false);
  assert.ok(shift.orders.every(order => order.status === 'READY_FOR_PICKUP' && order.address.includes('Baba')));
  assert.throws(() => transition(shift, shift.orders[0].id, 'ACCEPT'), /Online/);
});
test('accept, start and deliver preserves details and assigns the courier', () => {
  const original = initialShift(); const id = original.orders[0].id;
  let shift = setAvailability(original, true);
  for (const [action, status] of [['ACCEPT', 'ACCEPTED'], ['START', 'ON_THE_WAY'], ['DELIVER', 'DELIVERED']]) {
    shift = transition(shift, id, action);
    assert.equal(shift.orders[0].status, status);
    assert.equal(shift.orders[0].assignedTo, COURIER_ID);
    assert.equal(shift.orders[0].totalCents, original.orders[0].totalCents);
    assert.deepEqual(shift.orders[0].destination, original.orders[0].destination);
  }
  assert.equal(original.orders[0].status, 'READY_FOR_PICKUP');
  assert.equal(setAvailability(shift, false).online, false);
});
test('skipped, repeated and terminal transitions are rejected', () => {
  let shift = setAvailability(initialShift(), true); const id = shift.orders[0].id;
  assert.throws(() => transition(shift, id, 'DELIVER'));
  assert.throws(() => transition(shift, 'unknown', 'ACCEPT'));
  shift = transition(shift, id, 'ACCEPT');
  assert.throws(() => transition(shift, id, 'ACCEPT'));
  assert.throws(() => transition(shift, id, 'DELIVER'));
  shift = transition(transition(shift, id, 'START'), id, 'DELIVER');
  assert.throws(() => transition(shift, id, 'DELIVER'));
});
test('active delivery prevents a second acceptance and going offline; other couriers cannot be overwritten', () => {
  const ready = setAvailability(initialShift(), true);
  const active = transition(ready, ready.orders[0].id, 'ACCEPT');
  assert.throws(() => transition(active, active.orders[1].id, 'ACCEPT'), /activa/);
  assert.throws(() => setAvailability(active, false), /Termina/);
  ready.orders[0].assignedTo = 'another-courier';
  assert.throws(() => transition(ready, ready.orders[0].id, 'ACCEPT'), /otro/);
});
test('navigation uses exact Baba coordinates and validates destinations', () => {
  const point = { lat: -1.794, lng: -79.681 };
  const urls = navigationUrls(point, 'android');
  assert.equal(urls.waze, 'waze://?ll=-1.794,-79.681&navigate=yes');
  assert.equal(urls.maps, 'google.navigation:q=-1.794,-79.681');
  assert.match(navigationUrls(point, 'ios').maps, /^comgooglemaps:/);
  assert.match(urls.mapsWeb, /destination=-1.794,-79.681/);
  assert.throws(() => navigationUrls({ lat: NaN, lng: -79.681 }, 'android'));
});
