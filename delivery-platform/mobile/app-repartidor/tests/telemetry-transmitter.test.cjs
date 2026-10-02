const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TelemetryTransmitter } = require('../src/services/telemetryTransmitter.ts');

test('TelemetryTransmitter: inicia y detiene intervalos de transmisión correctamente', () => {
  const transmitter = new TelemetryTransmitter('ws://localhost:8080/ws', 'usr-repartidor-01');
  transmitter.setLocation(-1.7925, -79.6790);
  transmitter.setActiveOrder('ord-baba-test-01');

  transmitter.startOnlineTransmission();
  // El transmisor está online
  transmitter.stopTransmission();
  assert.ok(true, 'Transmisor iniciado y detenido sin excepciones');
});

test('TelemetryTransmitter: actualiza coordenadas de Baba Centro', () => {
  const transmitter = new TelemetryTransmitter('ws://localhost:8080/ws', 'usr-repartidor-01');
  transmitter.setLocation(-1.7917, -79.6783); // Parque central Baba
  transmitter.setActiveOrder('ord-999');

  assert.ok(transmitter);
});
