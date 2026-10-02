import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceOrder, createIncomingOrder, createMockOrders, type Order } from './orders';
import { ordersApi, type OrdersApi } from './ordersApi';
import { subscribeMerchant, type RealtimeStatus } from './merchantEvents';

export function useOrdersBoard(source: 'mock' | 'api', merchantId: string, api: OrdersApi = ordersApi) {
  const [orders, setOrders] = useState<Order[]>(() => source === 'mock' ? createMockOrders() : []);
  const [loading, setLoading] = useState(source === 'api');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [arrival, setArrival] = useState({ sequence: 0, ids: [] as string[] });
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [realtime, setRealtime] = useState<RealtimeStatus>('offline');
  const mutationIds = useRef(new Set<string>());
  const revision = useRef(0);
  const sequence = useRef(0);
  const lifetime = useRef<AbortController | null>(null);
  const reload = useRef<() => void>(() => {});
  const flush = useRef<() => void>(() => {});
  const refresh = useCallback(() => reload.current(), []);

  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    revision.current++; mutationIds.current.clear(); setPending(new Set()); setError(''); setLastSynced(null);
    setOrders(source === 'mock' ? createMockOrders() : []);
    setLoading(source === 'api');
    let fetching = false;
    let queued = false;
    let initialized = false;
    const seen = new Set<string>();
    async function sync() {
      if (source !== 'api' || controller.signal.aborted || fetching || mutationIds.current.size) return;
      fetching = true;
      queued = false;
      const version = revision.current;
      try {
        const next = await api.list(merchantId, controller.signal);
        if (controller.signal.aborted || version !== revision.current) return;
        const arrivals = initialized ? next.filter(order => order.status === 'PENDING' && !seen.has(order.id)).map(order => order.id) : [];
        next.forEach(order => seen.add(order.id)); initialized = true;
        setOrders(next); setError(''); setLastSynced(Date.now());
        if (arrivals.length) setArrival(previous => ({ sequence: previous.sequence + 1, ids: arrivals }));
      } catch (cause) {
        if (!controller.signal.aborted && version === revision.current) setError(cause instanceof Error ? cause.message : 'No pudimos actualizar los pedidos.');
      } finally {
        fetching = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          if (queued && !mutationIds.current.size) void sync();
        }
      }
    }
    reload.current = () => { queued = true; void sync(); };
    flush.current = () => { if (queued) void sync(); };
    void sync();
    const unsubscribe = source === 'api' ? subscribeMerchant(merchantId, () => reload.current(), setRealtime) : () => {};
    const timer = source === 'api' ? window.setInterval(() => void sync(), 5000) : undefined;
    return () => { controller.abort(); unsubscribe(); window.clearInterval(timer); reload.current = () => {}; flush.current = () => {}; };
  }, [source, merchantId, api]);

  function addMock() {
    if (source !== 'mock') return;
    const order = createIncomingOrder(sequence.current++);
    setOrders(previous => [order, ...previous]);
    setArrival(previous => ({ sequence: previous.sequence + 1, ids: [order.id] }));
  }
  async function advance(order: Order): Promise<boolean> {
    if (order.status === 'READY_FOR_PICKUP' || mutationIds.current.has(order.id)) return false;
    if (source === 'mock') { setOrders(previous => advanceOrder(previous, order.id, order.status)); return true; }
    const controller = lifetime.current;
    if (!controller || controller.signal.aborted) return false;
    mutationIds.current.add(order.id); revision.current++;
    setPending(new Set(mutationIds.current)); setError('');
    try {
      const next = await api.advance(order, controller.signal);
      if (controller.signal.aborted) return false;
      setOrders(previous => previous.map(item => item.id === order.id ? { ...item, status: next } : item));
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No pudimos cambiar el estado. Inténtalo de nuevo.');
      return false;
    } finally {
      if (!controller.signal.aborted) { mutationIds.current.delete(order.id); setPending(new Set(mutationIds.current)); flush.current(); }
    }
  }
  return { orders, loading, error, pending, arrival, lastSynced, realtime, refresh, addMock, advance };
}
