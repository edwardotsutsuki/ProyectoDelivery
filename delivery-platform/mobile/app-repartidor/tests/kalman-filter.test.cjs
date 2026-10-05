const { test } = require('node:test');
const assert = require('node:assert/strict');
const { KalmanGpsFilter } = require('../src/services/kalmanFilter.ts');

test('KalmanGpsFilter: inicializa con la primera lectura satelital', () => {
  const filter = new KalmanGpsFilter(4.0, 3.0);
  const loc = filter.filter(-1.7925, -79.6790, 5.0, 1000);

  assert.equal(loc.lat, -1.7925);
  assert.equal(loc.lon, -79.6790);
  assert.equal(loc.accuracy, 5.0);
  assert.equal(loc.speedMps, 0);
});

test('KalmanGpsFilter: amortigua jitter y saltos bruscos entre lecturas con ruido', () => {
  const filter = new KalmanGpsFilter(2.0, 5.0);
  const now = Date.now();

  filter.filter(-1.7925, -79.6790, 4.0, now);

  // Lectura ruidosa con salto brusco y baja precisión (accuracy 20m)
  const noisy = filter.filter(-1.7910, -79.6770, 25.0, now + 1000);

  // La posición filtrada debe estar más cerca del origen que del punto ruidoso
  assert.ok(Math.abs(noisy.lat - -1.7925) < Math.abs(-1.7910 - -1.7925));
  assert.ok(Math.abs(noisy.lon - -79.6790) < Math.abs(-79.6770 - -79.6790));
});

test('KalmanGpsFilter: calcula velocidad y rumbo al desplazarse en ruta continua', () => {
  const filter = new KalmanGpsFilter(4.0, 3.0);
  const t0 = 10000;

  filter.filter(-1.7925, -79.6790, 3.0, t0);
  // Movimiento hacia el este (aumento de longitud) en 2 segundos
  const step1 = filter.filter(-1.7925, -79.6780, 3.0, t0 + 2000);

  assert.ok(step1.speedMps > 0, 'La velocidad debe ser positiva');
  assert.ok(step1.bearing >= 70 && step1.bearing <= 110, `El rumbo hacia el este debe rondar 90°, actual: ${step1.bearing}`);
});

test('KalmanGpsFilter: reset reestablece el estado de coordenadas y velocidad', () => {
  const filter = new KalmanGpsFilter();
  filter.filter(-1.7925, -79.6790, 5.0, 1000);
  filter.reset(-1.7905, -79.2880); // Montalvo Centro

  const state = filter.getState();
  assert.equal(state.lat, -1.7905);
  assert.equal(state.lon, -79.2880);
  assert.equal(state.speedMps, 0);
});
