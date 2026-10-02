const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchOrderEta, fetchDriverPosition, calculateLiveFee } = require('../src/services/trackingClientApi.ts');

test('fetchOrderEta normalizes tracking response for Baba delivery', async () => {
  const fakeFetch = async (url) => {
    assert.equal(url, 'http://localhost:8080/api/v1/tracking/pedido/ord-123/eta');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        pedidoId: 'ord-123',
        estado: 'en_camino',
        repartidorId: 'rep-01',
        origen: { lat: -1.7917, lon: -79.6783 },
        destino: { lat: -1.7940, lon: -79.6810 },
        distanciaMetros: 505,
        etaMinutos: 4,
      }),
    };
  };

  const eta = await fetchOrderEta('http://localhost:8080/api/v1', 'ord-123', fakeFetch);
  assert.equal(eta.pedidoId, 'ord-123');
  assert.equal(eta.estado, 'en_camino');
  assert.equal(eta.distanciaMetros, 505);
  assert.equal(eta.etaMinutos, 4);
});

test('fetchDriverPosition returns live coordinates from Redis', async () => {
  const fakeFetch = async (url) => {
    assert.equal(url, 'http://localhost:8080/api/v1/tracking/driver-pos/rep-01');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        source: 'live-redis',
        data: {
          repartidorId: 'rep-01',
          lat: -1.7925,
          lon: -79.6790,
          heading: 90,
          speed: 25,
          timestamp: '2026-10-02T18:30:00.000Z',
          status: 'online',
        },
      }),
    };
  };

  const pos = await fetchDriverPosition('http://localhost:8080/api/v1', 'rep-01', fakeFetch);
  assert.equal(pos.repartidorId, 'rep-01');
  assert.equal(pos.lat, -1.7925);
  assert.equal(pos.lon, -79.6790);
  assert.equal(pos.status, 'online');
});

test('calculateLiveFee validates geofencing and returns dynamic fee breakdown', async () => {
  const fakeFetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8080/api/v1/tracking/calcular-tarifa');
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    assert.equal(body.originLat, -1.7917);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        coberturaValida: true,
        zona: { nombre: 'Baba Centro y Casco Urbano', canton: 'Baba' },
        distanciaKm: 0.51,
        etaMinutos: 2,
        desgloseTarifa: {
          tarifaFinal: 1.25,
        },
      }),
    };
  };

  const fee = await calculateLiveFee(
    'http://localhost:8080/api/v1',
    -1.7917,
    -79.6783,
    -1.7940,
    -79.6810,
    fakeFetch
  );
  assert.equal(fee.coberturaValida, true);
  assert.equal(fee.zonaNombre, 'Baba Centro y Casco Urbano');
  assert.equal(fee.tarifaFinal, 1.25);
});
