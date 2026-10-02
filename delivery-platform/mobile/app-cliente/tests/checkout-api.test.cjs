const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildOrderPayload, submitOrder } = require('../src/services/checkoutApi.ts');

test('buildOrderPayload builds valid payload for Baba pilot', () => {
  const items = [
    { id: 'seco-gallina', name: 'Seco de gallina', quantity: 2, priceCents: 450 },
    { id: 'maracuya', name: 'Jugo de maracuyá', quantity: 1, priceCents: 150 },
  ];
  const address = 'Barrio San Antonio, Calle Bolívar y Sucre, Baba';
  const payload = buildOrderPayload(items, address, 'efectivo');

  assert.equal(payload.clienteId, 'usr-cliente-01');
  assert.equal(payload.comercioId, '55555555-5555-5555-5555-555555555555');
  assert.equal(payload.items.length, 2);
  assert.equal(payload.items[0].precio, 4.5);
  assert.equal(payload.items[0].cantidad, 2);
  assert.equal(payload.items[1].precio, 1.5);
  assert.equal(payload.metodoPago, 'efectivo');
  assert.equal(payload.costoEnvio, 1.5);
  assert.equal(payload.latEntrega, -1.7940);
  assert.equal(payload.lonEntrega, -79.6810);
});

test('buildOrderPayload rejects empty cart and short address', () => {
  assert.throws(
    () => buildOrderPayload([], 'Barrio San Antonio, Calle Bolívar, Baba', 'efectivo'),
    /vacío/
  );
  assert.throws(
    () => buildOrderPayload([{ id: '1', name: 'Plato', quantity: 1, priceCents: 100 }], 'Corta', 'efectivo'),
    /dirección/
  );
});

test('submitOrder successfully creates order against gateway API', async () => {
  const fakePayload = {
    clienteId: 'usr-cliente-01',
    comercioId: '55555555-5555-5555-5555-555555555555',
    items: [{ id: 'seco-gallina', cantidad: 1, precio: 4.5 }],
    direccionEntrega: 'Barrio San Antonio, Baba',
    metodoPago: 'efectivo',
    latEntrega: -1.794,
    lonEntrega: -79.681,
    costoEnvio: 1.5,
  };

  const fakeFetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8080/api/v1/orders/checkout');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    const body = JSON.parse(options.body);
    assert.equal(body.clienteId, 'usr-cliente-01');

    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Pedido creado exitosamente',
        pedido: {
          id: 'ord-test-uuid-1234',
          estado: 'creado',
          total: '6.00',
          fecha_creacion: '2026-10-02T18:25:00.000Z',
        },
      }),
    };
  };

  const result = await submitOrder('http://localhost:8080/api/v1', fakePayload, undefined, fakeFetch);
  assert.equal(result.success, true);
  assert.equal(result.pedido.id, 'ord-test-uuid-1234');
  assert.equal(result.pedido.estado, 'creado');
  assert.equal(result.pedido.total, '6.00');
});

test('submitOrder rejects HTTP error responses with server error message', async () => {
  const fakePayload = {
    clienteId: 'usr-cliente-01',
    comercioId: '55555555-5555-5555-5555-555555555555',
    items: [],
    direccionEntrega: 'Dirección de prueba',
    metodoPago: 'efectivo',
    latEntrega: -1.794,
    lonEntrega: -79.681,
    costoEnvio: 1.5,
  };

  const fakeFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      success: false,
      error: 'No hay ítems para procesar el pedido.',
    }),
  });

  await assert.rejects(
    () => submitOrder('http://localhost:8080/api/v1', fakePayload, undefined, fakeFetch),
    /No hay ítems para procesar el pedido/
  );
});

test('submitOrder rejects malformed responses without order id', async () => {
  const fakePayload = {
    clienteId: 'usr-cliente-01',
    comercioId: '55555555-5555-5555-5555-555555555555',
    items: [{ id: 'seco-gallina', cantidad: 1, precio: 4.5 }],
    direccionEntrega: 'Barrio San Antonio, Baba',
    metodoPago: 'efectivo',
    latEntrega: -1.794,
    lonEntrega: -79.681,
    costoEnvio: 1.5,
  };

  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true }), // falta data o pedido
  });

  await assert.rejects(
    () => submitOrder('http://localhost:8080/api/v1', fakePayload, undefined, fakeFetch),
    /Respuesta inválida/
  );
});
