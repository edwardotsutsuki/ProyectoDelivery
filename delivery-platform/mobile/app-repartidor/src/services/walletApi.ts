import { parseWallet } from '../walletModel.ts';
export async function fetchWallet(baseUrl: string, signal: AbortSignal, request: typeof fetch = fetch) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await request(`${baseUrl.replace(/\/$/, '')}/ledger/billetera/usr-repartidor-01`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`No pudimos cargar la billetera (HTTP ${response.status}).`);
    return parseWallet(await response.json());
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
}
