const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseLocation, websocketUrl, metersBetween, preparePath, pointAlongPath, fetchRoadRoute } = require('./load-ts.cjs')('../src/tracking.ts');
test('accepts contract and deployed native WS envelopes', () => {
  const data = { lat: -2.19, lng: -79.88, speed: 5, heading: 370, order_id: 'GYE-1042' };
  assert.deepEqual(parseLocation(JSON.stringify({ event: 'courier:location_update', data }), 'GYE-1042'), { lat: -2.19, lng: -79.88, speed: 5, heading: 10, timestamp: undefined });
  assert.ok(parseLocation(JSON.stringify({ type: 'DRIVER_LOCATION', payload: { lat: -2.19, lon: -79.88, pedidoId: 'GYE-1042' } }), 'GYE-1042'));
});
test('rejects wrong orders, couriers, malformed data and invalid coordinates', () => {
  for (const payload of [{ lat: 91, lng: 0 }, { lat: '0', lng: 0 }, { lat: 0, lng: 181 }, { lat: 0, lng: 0, order_id: 'other' }, { lat: 0, lng: 0, timestamp: 'bad' }]) {
    assert.equal(parseLocation(JSON.stringify({ event: 'courier:location_update', payload }), 'GYE-1042'), null);
  }
  assert.equal(parseLocation('{bad', 'GYE-1042'), null);
  assert.equal(parseLocation(JSON.stringify({ type: 'SUBSCRIBED' }), 'GYE-1042'), null);
  assert.equal(parseLocation(JSON.stringify({ event: 'courier:location_update', payload: { lat: 0, lng: 0, courier_id: 'other' } }), 'GYE-1042', 'driver'), null);
});
test('normalizes HTTP addresses preserving the gateway path', () => {
  assert.equal(websocketUrl('http://localhost:8080/ws/'), 'ws://localhost:8080/ws/');
  assert.equal(websocketUrl('https://example.test/ws/'), 'wss://example.test/ws/');
  assert.throws(() => websocketUrl('file:///tmp/a'));
});
test('animation follows the bend of a road instead of its diagonal', () => {
  const points = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }, { lat: 0.001, lng: 0.001 }];
  const path = preparePath(points);
  assert.ok(metersBetween(points[0], points[1]) > 111 && metersBetween(points[0], points[1]) < 112);
  assert.deepEqual(pointAlongPath(path, 0), points[0]);
  assert.ok(Math.abs(pointAlongPath(path, 0.5).lat) < 0.000001);
  assert.deepEqual(pointAlongPath(path, 1), points[2]);
  assert.deepEqual(pointAlongPath(preparePath([points[0], points[0]]), 0.5), points[0]);
});
test('OSRM uses lng,lat and preserves road meters and seconds', async () => {
  global.fetch = async url => {
    assert.ok(url.includes('/-79.88,-2.19;-79.89,-2.18?'));
    return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 1500, duration: 300, geometry: { type: 'LineString', coordinates: [[-79.88, -2.19], [-79.89, -2.18]] } }] }));
  };
  const route = await fetchRoadRoute('http://localhost:5001/', { lat: -2.19, lng: -79.88 }, { lat: -2.18, lng: -79.89 }, new AbortController().signal);
  assert.equal(route.distance, 1500); assert.equal(route.duration, 300);
  assert.deepEqual(route.points[0], { lat: -2.19, lng: -79.88 });
});
test('no-route and invalid geometries do not fabricate an ETA', async () => {
  for (const data of [{ code: 'NoRoute' }, { code: 'Ok', routes: [{ distance: 10, duration: 10, geometry: { type: 'LineString', coordinates: [[0, 95], [1, 1]] } }] }]) {
    global.fetch = async () => new Response(JSON.stringify(data));
    await assert.rejects(fetchRoadRoute('http://localhost:5001', { lat: 0, lng: 0 }, { lat: 1, lng: 1 }, new AbortController().signal));
  }
});
