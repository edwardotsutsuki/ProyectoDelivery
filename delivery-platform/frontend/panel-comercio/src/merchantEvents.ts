import { config } from './config';

export type RealtimeStatus = 'connecting' | 'connected' | 'offline';
// Events invalidate the REST snapshot; incomplete event payloads are never rendered as cards.
export function isMerchantOrderEvent(raw: unknown, merchantId: string): boolean {
  try {
    if (typeof raw !== 'string') return false;
    const message = JSON.parse(raw);
    const data = message.type === 'ORDER_EVENT' ? message.payload : message.data ?? message.payload ?? message;
    if (!data || !['order:created', 'order:status_updated', 'ORDER_CREATED', 'ORDER_STATUS_CHANGED'].includes(data.event ?? data.type ?? message.event)) return false;
    return (data.comercioId ?? data.merchant_id ?? data.pedido?.comercioId) === merchantId;
  } catch { return false; }
}

export function subscribeMerchant(merchantId: string, invalidate: () => void, status: (value: RealtimeStatus) => void,
  url = config.trackingUrl): () => void {
  let closed = false;
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let handshake: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  function reconnect() {
    if (closed) return;
    status('offline');
    retry = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 30000));
  }
  function connect() {
    if (closed) return;
    status('connecting');
    try {
      const current = new WebSocket(url); socket = current;
      const active = () => !closed && socket === current;
      handshake = setTimeout(() => { if (active()) current.close(); }, 10000);
      current.onopen = () => {
        if (active()) current.send(JSON.stringify({ type: 'SUBSCRIBE_MERCHANT', comercioId: merchantId }));
      };
      current.onmessage = event => {
        if (!active()) return;
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === 'SUBSCRIBED_MERCHANT' && message.comercioId === merchantId) {
            clearTimeout(handshake); attempts = 0; status('connected'); invalidate();
          } else if (isMerchantOrderEvent(event.data, merchantId)) invalidate();
        } catch { /* Polling remains available after malformed messages. */ }
      };
      current.onerror = () => { if (active()) current.close(); };
      current.onclose = () => { if (active()) { clearTimeout(handshake); reconnect(); } };
    } catch { reconnect(); }
  }
  if (merchantId) connect();
  else status('offline');
  return () => { closed = true; clearTimeout(retry); clearTimeout(handshake); socket?.close(); };
}
