const { test } = require('node:test');
const assert = require('node:assert/strict');
const { searchGeocodingAddresses, reverseGeocodeAddress } = require('../src/services/trackingClientApi.ts');

test('searchGeocodingAddresses: consulta endpoints con parámetros de query y cantón', async () => {
  const mockFetch = async (url) => {
    assert.ok(url.includes('tracking/geocoding/search'));
    assert.ok(url.includes('canton=montalvo'));
    assert.ok(url.includes('q=Parque'));
    return new Response(JSON.stringify({
      success: true,
      data: [
        {
          id: 'geo-mtv-01',
          direccion: 'Av. 25 de Abril y 10 de Agosto',
          barrio: 'Centro',
          canton: 'montalvo',
          lat: -1.7905,
          lon: -79.288,
          referencia: 'Parque Central de Montalvo',
          tipo: 'parque',
        },
      ],
    }));
  };

  const results = await searchGeocodingAddresses('https://api.test/api/v1', 'Parque', 'montalvo', mockFetch);
  assert.equal(results.length, 1);
  assert.equal(results[0].canton, 'montalvo');
  assert.equal(results[0].lat, -1.7905);
});

test('searchGeocodingAddresses: ante fallo HTTP o red retorna array vacío con resiliencia', async () => {
  const failingFetch = async () => new Response('Internal Server Error', { status: 500 });
  const results = await searchGeocodingAddresses('https://api.test/api/v1', 'calle', 'baba', failingFetch);
  assert.deepEqual(results, []);
});

test('reverseGeocodeAddress: retorna el punto más cercano o null en caso de error', async () => {
  const mockFetch = async (url) => {
    assert.ok(url.includes('tracking/geocoding/reverse'));
    assert.ok(url.includes('lat=-1.7905'));
    assert.ok(url.includes('lon=-79.288'));
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: 'geo-mtv-01',
        direccion: 'Av. 25 de Abril y 10 de Agosto',
        canton: 'montalvo',
      },
    }));
  };

  const item = await reverseGeocodeAddress('https://api.test/api/v1', -1.7905, -79.288, mockFetch);
  assert.ok(item);
  assert.equal(item.canton, 'montalvo');
});
