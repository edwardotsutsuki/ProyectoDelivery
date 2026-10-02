import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, CheckCircle2, ChefHat, Clock3, MapPin, Package, Plus, ShoppingBag, Volume2, VolumeX, CheckSquare, Square } from 'lucide-react';
import { BABA_RESTAURANT, elapsedTime, orderTotal, selectOrders, type Order, type OrderStatus } from '../orders';
import { useOrdersBoard } from '../useOrdersBoard';
import { useAuth } from '../AuthProvider';
import type { OrdersApi } from '../ordersApi';

const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });

const kitchenColumns = [
  { status: 'PENDING' as OrderStatus, title: 'Nuevos / Pendientes', subtitle: 'Cada gran plato empieza aquí', icon: Bell, color: 'text-amber-300', border: 'border-amber-400', badge: 'bg-amber-400/15 text-amber-200', action: 'Empezar preparación', button: 'bg-amber-300 hover:bg-amber-200 text-slate-950' },
  { status: 'PREPARING' as OrderStatus, title: 'En Cocina / Preparación', subtitle: 'El equipo está manos a la obra', icon: ChefHat, color: 'text-sky-300', border: 'border-sky-400', badge: 'bg-sky-400/15 text-sky-200', action: 'Marcar como listo', button: 'bg-sky-300 hover:bg-sky-200 text-slate-950' },
  { status: 'READY_FOR_PICKUP' as OrderStatus, title: 'Listos para Entrega', subtitle: 'Todo listo para salir', icon: CheckCircle2, color: 'text-emerald-300', border: 'border-emerald-400', badge: 'bg-emerald-400/15 text-emerald-200', action: '', button: '' },
];

const pickingColumns = [
  { status: 'PENDING' as OrderStatus, title: 'Nuevas Canastas', subtitle: 'Órdenes por recolectar en percha', icon: ShoppingBag, color: 'text-amber-300', border: 'border-amber-400', badge: 'bg-amber-400/15 text-amber-200', action: 'Iniciar Picking / Canasta', button: 'bg-amber-300 hover:bg-amber-200 text-slate-950' },
  { status: 'PREPARING' as OrderStatus, title: 'En Recolección / Picking', subtitle: 'Armado y verificación de ítems', icon: Package, color: 'text-sky-300', border: 'border-sky-400', badge: 'bg-sky-400/15 text-sky-200', action: 'Completar y Empacar', button: 'bg-sky-300 hover:bg-sky-200 text-slate-950' },
  { status: 'READY_FOR_PICKUP' as OrderStatus, title: 'Canastas Listas para Retiro', subtitle: 'Empacado y listo para motorizado', icon: CheckCircle2, color: 'text-emerald-300', border: 'border-emerald-400', badge: 'bg-emerald-400/15 text-emerald-200', action: '', button: '' },
];

export interface KanbanOrdersProps { source?: 'mock' | 'api'; merchantId?: string; api?: OrdersApi }
export default function KanbanOrders({ source = 'api', merchantId, api }: KanbanOrdersProps) {
  const { session } = useAuth();
  const board = useOrdersBoard(source, merchantId ?? session?.user?.comercioId ?? '', api);
  const { orders } = board;
  const [now, setNow] = useState(Date.now);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundError, setSoundError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [query, setQuery] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [modoOperacion, setModoOperacion] = useState<'cocina' | 'picking'>('cocina');
  const [pickedItems, setPickedItems] = useState<Record<string, boolean>>({});
  const [bultosMap, setBultosMap] = useState<Record<string, number>>({});
  const [soundPreference, setSoundPreference] = useState(() => {
    try { return localStorage.getItem('delivery.comercio.sound') === 'enabled'; } catch { return false; }
  });
  const focusOrder = useRef<string | null>(null);
  const visibleOrders = selectOrders(orders, query, overdueOnly, now);
  const audio = useRef<AudioContext | null>(null);
  const lastAlert = useRef(0);

  const toggleItemPicked = (orderId: string, itemIndex: number) => {
    const key = `${orderId}-${itemIndex}`;
    setPickedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const changeBultos = (orderId: string, delta: number) => {
    setBultosMap(prev => {
      const current = prev[orderId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [orderId]: next };
    });
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => { window.clearInterval(timer); const context = audio.current; audio.current = null; void context?.close().catch(() => undefined); };
  }, []);
  useEffect(() => {
    if (!focusOrder.current) return;
    const card = document.getElementById(`order-${focusOrder.current}`);
    if (card) card.focus();
    else document.getElementById('orders-search')?.focus();
    focusOrder.current = null;
  }, [orders]);
  // Each arrival batch is consumed once, even while muted or after filtering.
  useEffect(() => {
    if (board.arrival.sequence <= lastAlert.current) return;
    lastAlert.current = board.arrival.sequence;
    const arrivals = board.arrival.ids;
    setAnnouncement(`Nuevas comandas: ${arrivals.join(', ')}.`);
    if (!soundEnabled) return;
    const context = audio.current;
    if (!context || context.state !== 'running') {
      setSoundEnabled(false);
      setSoundError('El navegador pausó el audio. Activa el sonido para las próximas comandas.');
      return;
    }
    try { arrivals.forEach((_, index) => playChime(context, index * 0.4)); }
    catch { setSoundEnabled(false); setSoundError('No se pudo reproducir la alerta. Vuelve a activar el sonido.'); }
  }, [board.arrival, soundEnabled]);

  async function toggleSound() {
    if (soundEnabled) {
      setSoundEnabled(false); setSoundPreference(false);
      try { localStorage.setItem('delivery.comercio.sound', 'muted'); } catch { /* Preference is optional. */ }
      return;
    }
    setSoundError('');
    try {
      const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) throw new Error('unsupported');
      const context = audio.current ?? new Audio();
      audio.current = context;
      await context.resume();
      if (audio.current !== context) return;
      if (context.state !== 'running') throw new Error('suspended');
      playChime(context);
      setSoundEnabled(true);
      setSoundPreference(true);
      try { localStorage.setItem('delivery.comercio.sound', 'enabled'); } catch { /* Preference is optional. */ }
    } catch { setSoundError('No pudimos activar el audio. Las comandas seguirán apareciendo en el tablero.'); }
  }
  function receiveOrder() {
    board.addMock();
    setNow(Date.now());
  }
  async function advance(order: Order) {
    focusOrder.current = order.id;
    if (await board.advance(order)) setAnnouncement(`Pedido ${order.id}: ${order.status === 'PENDING' ? (modoOperacion === 'picking' ? 'en recolección' : 'en preparación') : 'listo para entrega'}.`);
    else focusOrder.current = null;
  }

  const columns = modoOperacion === 'picking' ? pickingColumns : kitchenColumns;

  return (
    <div className="kanban-screen min-h-screen bg-slate-950 text-slate-100">
      <header className="border-0 border-b border-solid border-slate-800 bg-slate-900 px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex rounded-2xl bg-rose-600 p-3">
              {modoOperacion === 'picking' ? <Package size={28} aria-hidden="true" /> : <ChefHat size={28} aria-hidden="true" />}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-300">DeliveryYa · Comercio</p>
              <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{source === 'mock' ? BABA_RESTAURANT : session?.user?.name || 'Comandas de tu negocio'}</h1>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin size={12} aria-hidden="true" />Baba, Los Ríos · Babahoyo: red activa</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Modo de Operación: Cocina vs Picking Retail */}
            <div className="flex rounded-xl bg-slate-800 p-1 border border-solid border-slate-700">
              <button
                type="button"
                onClick={() => setModoOperacion('cocina')}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${modoOperacion === 'cocina' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <ChefHat size={15} /> Modo Cocina
              </button>
              <button
                type="button"
                onClick={() => setModoOperacion('picking')}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${modoOperacion === 'picking' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <ShoppingBag size={15} /> Modo Picking Despensa
              </button>
            </div>

            <button type="button" onClick={() => void toggleSound()} aria-pressed={soundEnabled} className="flex items-center gap-2 rounded-xl border border-solid border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700">
              {soundEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
              {soundEnabled ? 'Sonido activado' : soundPreference ? 'Reactivar sonido' : 'Activar sonido'}
            </button>
            {source === 'mock' && (
              <button type="button" onClick={receiveOrder} className="flex items-center gap-2 rounded-xl border-0 bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-500">
                <Plus size={18} aria-hidden="true" />Simular nuevo pedido
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-5 py-8 sm:px-8">
        {source === 'api' && <p className="mb-3 text-sm text-slate-400" role="status">{board.realtime === 'connected' ? 'Eventos en vivo conectados · respaldo cada 5 s' : 'Actualización cada 5 s · reconectando eventos en vivo'}</p>}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-2xl font-bold">{modoOperacion === 'picking' ? 'Tablero de Recolección y Picking' : 'Tablero de Comandas de Cocina'}</h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">{source === 'mock' ? 'DEMO BABA' : 'API EN VIVO'}</span>
            </div>
            <p className="max-w-2xl text-sm text-slate-400">
              {modoOperacion === 'picking'
                ? 'Flujo especializado para Supermercados, Farmacias y Licoreras. Marca los productos conforme los recoges en percha y registra la cantidad de fundas o bultos.'
                : 'Flujo de preparación rápida para restaurantes y cafeterías de Los Ríos con cálculo de tiempos y comanda de cocina.'}
            </p>
          </div>
          <div className="text-sm text-slate-400"><strong className="text-xl text-white">{orders.length}</strong> órdenes en el tablero</div>
        </div>

        {source === 'api' && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400"><span role="status">{board.loading ? 'Cargando pedidos…' : board.lastSynced ? (board.error ? 'Sin conexión. Se conserva la última lista recibida.' : 'Pedidos sincronizados') : 'Sin datos del servidor'}</span><button type="button" onClick={board.refresh} disabled={board.loading} className="rounded-lg border border-solid border-slate-600 bg-slate-900 px-4 py-2 text-slate-200 disabled:opacity-50">Actualizar pedidos</button></div>}
        {board.error && <p role="alert" className="mb-5 rounded-xl border border-solid border-red-900 bg-red-950 p-4 text-sm text-red-200">{board.error}</p>}
        {!soundEnabled && !soundError && <p className="mb-5 rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-300">Activa el sonido para escuchar una alerta cuando llegue una nueva comanda.</p>}
        {soundError && <p role="alert" className="mb-5 rounded-xl bg-amber-950 px-4 py-3 text-sm text-amber-200">{soundError}</p>}
        <p role="status" aria-live="polite" aria-atomic="true" className="mb-4 min-h-5 text-sm text-rose-300">{announcement}</p>
        
        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-xl bg-slate-900 p-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="orders-search" className="mb-2 block text-xs font-semibold text-slate-300">Buscar pedido o cliente</label>
            <input id="orders-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ej. número de pedido o nombre de cliente" className="min-h-11 w-full rounded-lg border border-solid border-slate-600 bg-slate-950 px-3 py-2 text-base text-white focus:outline focus:outline-2 focus:outline-rose-400" />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={overdueOnly} onChange={event => setOverdueOnly(event.target.checked)} className="h-4 w-4 accent-rose-500" />
            {modoOperacion === 'picking' ? 'Canastas demoradas (+20 min)' : 'Comandas en espera (+20 min)'}
          </label>
          {(query || overdueOnly) && <button type="button" onClick={() => { setQuery(''); setOverdueOnly(false); }} className="min-h-11 rounded-lg border border-solid border-slate-600 bg-transparent px-3 text-sm text-slate-200">Limpiar filtros</button>}
          <p className="w-full text-xs text-slate-400">{visibleOrders.length} de {orders.length} órdenes visibles · Orden cronológico prioritario.</p>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
          {columns.map(column => {
            const items = visibleOrders.filter(order => order.status === column.status);
            const total = orders.filter(order => order.status === column.status).length;
            const Icon = column.icon;
            return (
              <section key={column.status} aria-labelledby={`heading-${column.status}`} className={`min-w-0 rounded-2xl border-0 border-t-4 border-solid ${column.border} bg-slate-900/70 p-4`}>
                <div className="mb-5 flex items-center justify-between gap-2">
                  <div>
                    <h3 id={`heading-${column.status}`} className={`flex items-center gap-2 text-base font-bold ${column.color}`}>
                      <Icon size={18} aria-hidden="true" />{column.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">{column.subtitle}</p>
                  </div>
                  <span aria-label={`${items.length} de ${total} pedidos visibles`} className={`rounded-lg px-2.5 py-1 text-sm font-bold ${column.badge}`}>
                    {items.length === total ? total : `${items.length}/${total}`}
                  </span>
                </div>

                <div className="space-y-4">
                  {!items.length && (
                    <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center">
                      <ShoppingBag size={28} className="mb-3 text-slate-500" aria-hidden="true" />
                      <p className="text-sm font-semibold text-slate-300">
                        {board.loading ? 'Cargando órdenes…' : board.error && !board.lastSynced ? 'Datos no disponibles' : query || overdueOnly ? 'Sin coincidencias' : 'Sin órdenes en esta columna'}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {query || overdueOnly ? 'Prueba otra búsqueda o limpia los filtros.' : 'Los pedidos aparecerán aquí al cambiar de estado.'}
                      </p>
                    </div>
                  )}

                  {items.map(order => {
                    const pickedCount = order.items.filter((_, idx) => pickedItems[`${order.id}-${idx}`]).length;
                    const allPicked = order.items.length > 0 && pickedCount === order.items.length;
                    const bultos = bultosMap[order.id] || 1;

                    return (
                      <article key={order.id} aria-labelledby={`order-${order.id}`} className="rounded-xl border border-solid border-slate-700 bg-slate-900 p-5 shadow-lg shadow-black/10">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 id={`order-${order.id}`} tabIndex={-1} className="rounded text-base font-extrabold focus:outline focus:outline-2 focus:outline-rose-400">
                            #{order.id}
                          </h4>
                          <span title="Tiempo desde que ingresó el pedido" className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${now - order.createdAt >= 20 * 60000 ? 'bg-amber-400/10 text-amber-200' : 'bg-slate-800 text-slate-300'}`}>
                            <Clock3 size={13} aria-hidden="true" />
                            <time dateTime={new Date(order.createdAt).toISOString()}>{elapsedTime(order.createdAt, now)}</time>
                          </span>
                        </div>

                        <p className="mt-3 font-semibold text-slate-200">{order.customer}</p>
                        <p className="mt-1 text-xs text-slate-400">{order.restaurant}</p>
                        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-400">
                          <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                          {order.address}
                        </p>

                        {/* Badges de Retail: Política de Sustitución y Receta Médica */}
                        {order.politicaSustitucion && (
                          <div className="mt-3 rounded-lg bg-slate-800/80 p-2 text-xs border border-solid border-slate-700">
                            <span className="font-bold text-slate-300">🔄 Sustitución: </span>
                            {order.politicaSustitucion === 'similar' ? (
                              <span className="text-emerald-300">Reemplazar por producto similar</span>
                            ) : order.politicaSustitucion === 'llamar' ? (
                              <span className="text-sky-300">Llamar al cliente antes de cambiar</span>
                            ) : (
                              <span className="text-rose-300">No sustituir (omitir ítem)</span>
                            )}
                          </div>
                        )}

                        {order.recetaAdjunta && (
                          <div className="mt-2 rounded-lg bg-rose-950/40 p-2 text-xs border border-solid border-rose-800/60 text-rose-300 flex items-center gap-1.5">
                            <span>💊</span>
                            <span><strong>Receta Adjunta:</strong> {order.recetaAdjunta}</span>
                          </div>
                        )}

                        {/* Barra de Progreso de Picking si está en modo picking */}
                        {modoOperacion === 'picking' && (
                          <div className="mt-4 mb-2">
                            <div className="flex justify-between items-center text-xs font-semibold mb-1">
                              <span className="text-slate-400">Progreso de recolección:</span>
                              <span className={allPicked ? 'text-emerald-400' : 'text-slate-300'}>
                                {pickedCount} / {order.items.length} ({Math.round((pickedCount / order.items.length) * 100)}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 transition-all duration-300 ${allPicked ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                style={{ width: `${(pickedCount / order.items.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Lista de Ítems / Checklist */}
                        <ul className="my-4 space-y-2 border-0 border-y border-solid border-slate-800 py-3">
                          {order.items.map((item, index) => {
                            const isPicked = pickedItems[`${order.id}-${index}`] ?? false;
                            return (
                              <li
                                key={`${item.name}-${index}`}
                                onClick={() => modoOperacion === 'picking' && toggleItemPicked(order.id, index)}
                                className={`flex items-start gap-2.5 p-1.5 rounded-lg text-sm transition-colors ${modoOperacion === 'picking' ? 'cursor-pointer hover:bg-slate-800/50' : ''}`}
                              >
                                {modoOperacion === 'picking' && (
                                  <button
                                    type="button"
                                    className="mt-0.5 text-slate-400 hover:text-white"
                                    aria-label={isPicked ? 'Desmarcar ítem' : 'Marcar como recolectado'}
                                  >
                                    {isPicked ? (
                                      <CheckSquare size={17} className="text-emerald-400" />
                                    ) : (
                                      <Square size={17} className="text-slate-500" />
                                    )}
                                  </button>
                                )}
                                <span className="rounded bg-slate-800 px-2 py-0.5 font-bold text-white text-xs shrink-0">
                                  {item.quantity}×
                                </span>
                                <span className={`min-w-0 flex-1 ${isPicked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                  {item.name}
                                </span>
                                <span className="whitespace-nowrap text-slate-400 text-xs">
                                  {currency.format(item.quantity * item.unitPrice)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        {/* Contador de Bultos / Fundas en Modo Picking */}
                        {modoOperacion === 'picking' && (
                          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-800/60 p-2.5 text-xs border border-solid border-slate-700">
                            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                              <Package size={14} className="text-sky-400" /> Fundas / Bultos:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => changeBultos(order.id, -1)}
                                className="w-6 h-6 rounded bg-slate-700 text-white font-bold flex items-center justify-center hover:bg-slate-600"
                              >
                                -
                              </button>
                              <span className="font-bold text-sm text-white min-w-5 text-center">
                                {bultos}
                              </span>
                              <button
                                type="button"
                                onClick={() => changeBultos(order.id, 1)}
                                className="w-6 h-6 rounded bg-slate-700 text-white font-bold flex items-center justify-center hover:bg-slate-600"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        {order.note && (
                          <p className="mb-4 rounded-lg bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
                            <strong>Nota: </strong>{order.note}
                          </p>
                        )}

                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-sm text-slate-400">Total</span>
                          <strong className="text-xl">{currency.format(orderTotal(order))}</strong>
                        </div>

                        {column.action ? (
                          <button
                            type="button"
                            disabled={board.pending.has(order.id)}
                            onClick={() => void advance(order)}
                            aria-label={`${column.action}, pedido ${order.id}`}
                            className={`flex w-full items-center justify-center gap-2 rounded-lg border-0 px-3 py-3 text-sm font-bold ${column.button} disabled:cursor-wait disabled:opacity-50`}
                          >
                            {board.pending.has(order.id) ? 'Guardando…' : column.action}
                            <ArrowRight size={16} aria-hidden="true" />
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-3 text-sm font-semibold text-emerald-200">
                            <CheckCircle2 size={16} aria-hidden="true" />Esperando al repartidor
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
function playChime(context: AudioContext, delay = 0) {
  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay + index * 0.13;
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.07, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + 0.28);
  });
}
