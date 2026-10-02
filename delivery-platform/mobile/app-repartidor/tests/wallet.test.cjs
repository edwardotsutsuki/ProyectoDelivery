const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseWallet, dailyWallet, toCents, money } = require('../src/walletModel.ts');
const { fetchWallet } = require('../src/services/walletApi.ts');
const now = new Date('2026-10-02T18:00:00Z');
const row = (id, type, amount, date = '2026-10-02T10:00:00Z') => ({ id, tipo_movimiento: type, monto: amount, fecha_creacion: date, descripcion: `Movimiento ${id}` });
const body = rows => ({ success: true, data: { usuarioId: 'usr-repartidor-01', moneda: 'USD', saldoActual: '-100.00', movimientos: rows } });
test('cash debt, commissions and other movements reconcile signed cents without double deduction', () => {
  const wallet = parseWallet(body([row('1', 'pago_efectivo', '-12.50'), row('2', 'comision', '2.75'), row('3', 'recarga', '5.00')]));
  const day = dailyWallet(wallet, now);
  assert.equal(wallet.balanceCents, -10000);
  assert.equal(day.netCents, -475);
  assert.equal(day.cashDebtCents, 1250);
  assert.equal(day.commissionCents, 275);
  assert.equal(day.otherCents, 500);
  assert.equal(money(day.netCents), '−$4.75');
});
test('Ecuador midnight excludes yesterday UTC and future entries', () => {
  const wallet = parseWallet(body([row('yesterday', 'comision', '4', '2026-10-02T04:59:59Z'), row('today', 'comision', '2', '2026-10-02T05:00:00Z'), row('future', 'comision', '9', '2026-10-03T05:00:00Z')]));
  assert.equal(dailyWallet(wallet, now).netCents, 200);
  assert.equal(dailyWallet(wallet, now).movements.length, 1);
});
test('cash reversals and negative commission adjustments keep their signs', () => {
  const day = dailyWallet(parseWallet(body([row('a', 'pago_efectivo', '-10'), row('b', 'pago_efectivo', '10'), row('c', 'comision', '-1.25')])), now);
  assert.equal(day.cashDebtCents, 0); assert.equal(day.commissionCents, -125); assert.equal(day.netCents, -125);
});
test('empty day is zero while a full 50-row response is explicitly partial', () => {
  assert.equal(dailyWallet(parseWallet(body([])), now).netCents, 0);
  const wallet = parseWallet(body(Array.from({ length: 50 }, (_, i) => row(String(i), 'comision', '0.10'))));
  assert.equal(dailyWallet(wallet, now).partial, true); assert.equal(dailyWallet(wallet, now).netCents, 500);
});
test('invalid money, duplicates, dates and foreign wallets never become plausible balances', () => {
  for (const amount of [null, '', true, 'NaN', Infinity, '1.001']) assert.throws(() => toCents(amount));
  assert.equal(toCents('0.29'), 29);
  assert.throws(() => parseWallet(body([row('x', 'comision', '1'), row('x', 'comision', '1')])));
  assert.throws(() => parseWallet(body([row('x', 'comision', '1', 'bad')])));
  const foreign = body([]); foreign.data.usuarioId = 'someone-else'; assert.throws(() => parseWallet(foreign));
  assert.throws(() => parseWallet({ success: false }));
});
test('wallet service consumes the exact Gateway path and rejects HTTP errors', async () => {
  const signal = new AbortController().signal;
  const wallet = await fetchWallet('http://localhost:8080/api/v1/', signal, async (url, options) => {
    assert.equal(url, 'http://localhost:8080/api/v1/ledger/billetera/usr-repartidor-01');
    assert.ok(options.signal); return new Response(JSON.stringify(body([])));
  });
  assert.equal(wallet.balanceCents, -10000);
  await assert.rejects(fetchWallet('http://localhost:8080/api/v1', signal, async () => new Response(null, { status: 503 })), /503/);
});
test('wallet request aborts on unmount and after the timeout', async t => {
  const pending = (_, { signal }) => new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'));
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  const controller = new AbortController();
  const request = fetchWallet('http://localhost:8080/api/v1', controller.signal, pending);
  controller.abort(); await assert.rejects(request, /aborted/);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const timeout = fetchWallet('http://localhost:8080/api/v1', new AbortController().signal, pending);
  t.mock.timers.tick(15000); await assert.rejects(timeout, /aborted/);
});
