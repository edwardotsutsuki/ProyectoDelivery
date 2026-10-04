import { parseWallet } from '../walletModel.ts';

export async function fetchWallet(
  baseUrl: string,
  signal: AbortSignal,
  courierIdOrRequest?: string | typeof fetch,
  customRequest?: typeof fetch
) {
  let courierId = 'usr-repartidor-01';
  let request: typeof fetch = fetch;

  if (typeof courierIdOrRequest === 'function') {
    request = courierIdOrRequest;
  } else if (typeof courierIdOrRequest === 'string') {
    courierId = courierIdOrRequest;
    if (customRequest) request = customRequest;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await request(`${baseUrl.replace(/\/$/, '')}/ledger/billetera/${courierId}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
    });
    if (!response.ok) throw new Error(`No pudimos cargar la billetera (HTTP ${response.status}).`);
    return parseWallet(await response.json());
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export async function settleDebt(
  baseUrl: string,
  repartidorId: string,
  monto: number,
  comprobante: string,
  notas?: string,
  request: typeof fetch = fetch
) {
  const response = await request(`${baseUrl.replace(/\/$/, '')}/finance/liquidar-caja`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    },
    body: JSON.stringify({
      repartidorId,
      monto,
      comprobante,
      notas: notas || 'Liquidación desde App Móvil Repartidor',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Error al procesar liquidación (HTTP ${response.status})`);
  }

  return response.json();
}
