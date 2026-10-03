import { authClient } from './auth';
import { type Order, type OrderStatus } from './orders';

export const ORDERS_PATH = '/orders'; // Relative to config.apiBaseUrl: localhost:8080/api/v1
type Request = (path: string, options?: RequestInit) => Promise<Response>;
type Row = Record<string, unknown>;
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Formato de pedidos inválido.');
  return value as Row;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Faltan datos del pedido.');
  return value.trim();
}
function amount(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value))) throw new Error('Importe inválido.');
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) throw new Error('Importe inválido.');
  return result;
}
const statuses: Record<string, OrderStatus | 'CLOSED'> = {
  PENDING: 'PENDING', ACCEPTED: 'PENDING', PREPARING: 'PREPARING', READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  creado: 'PENDING', confirmado: 'PENDING', en_preparacion: 'PREPARING', listo: 'READY_FOR_PICKUP',
  ON_THE_WAY: 'CLOSED', DELIVERED: 'CLOSED', CANCELLED: 'CLOSED', en_camino: 'CLOSED', entregado: 'CLOSED', cancelado: 'CLOSED',
};
export function parseOrders(value: unknown, merchantId: string): Order[] {
  const envelope = Array.isArray(value) ? { data: value } : object(value);
  if (envelope.success === false || !Array.isArray(envelope.data)) throw new Error('El servidor no devolvió una lista de pedidos válida.');
  const ids = new Set<string>();
  const orders: Order[] = [];
  for (const entry of envelope.data) {
    const row = object(entry);
    const id = text(row.order_id ?? row.id);
    if (ids.has(id)) throw new Error('La lista contiene pedidos duplicados.');
    ids.add(id);
    const merchant = row.merchant_id ?? row.comercio_id;
    if (merchant !== undefined && merchant !== merchantId) throw new Error('Se recibió un pedido de otro comercio.');
    const rawStatus = text(row.status ?? row.estado);
    const status = Object.prototype.hasOwnProperty.call(statuses, rawStatus) ? statuses[rawStatus] : undefined;
    if (!status) throw new Error('El servidor devolvió un estado de pedido desconocido.');
    if (status === 'CLOSED') continue;
    const rawDate = row.created_at ?? row.fecha_creacion;
    const createdAt = typeof rawDate === 'number' ? rawDate : typeof rawDate === 'string' ? Date.parse(rawDate) : NaN;
    if (!Number.isFinite(createdAt) || createdAt <= 0 || createdAt > Date.now() + 60000) throw new Error('Fecha del pedido inválida.');
    if (!Array.isArray(row.items) || !row.items.length) throw new Error('El pedido no tiene ítems válidos.');
    const items = row.items.map(value => {
      const item = object(value);
      const quantity = amount(item.qty ?? item.cantidad);
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Cantidad inválida.');
      return { name: text(item.name ?? item.producto), quantity, unitPrice: amount(item.price ?? item.precio_unitario) };
    });
    orders.push({ id, status, createdAt, items,
      customer: text(row.customer_name ?? row.cliente_nombre ?? row.customer_id),
      restaurant: typeof row.restaurant_name === 'string' ? row.restaurant_name : 'Tu restaurante',
      address: text(row.delivery_address ?? row.direccion_entrega),
      note: typeof (row.note ?? row.notas) === 'string' ? String(row.note ?? row.notas) : undefined,
      total: row.total === undefined ? undefined : amount(row.total),
      subtotal: row.subtotal === undefined ? undefined : amount(row.subtotal),
      pagoNeto: row.pago_neto_comercio === undefined ? undefined : amount(row.pago_neto_comercio),
      comision: row.comision_comercio === undefined ? undefined : amount(row.comision_comercio),
      tipoLayout: row.tipo_layout === 'grid_ecommerce' ? 'grid_ecommerce' : 'restaurante',
      politicaSustitucion: typeof row.politica_sustitucion === 'string' ? row.politica_sustitucion : undefined,
      recetaAdjunta: typeof row.receta_adjunta === 'string' ? row.receta_adjunta : undefined,
    });
  }
  return orders;
}
export function createOrdersApi(request: Request = authClient.authorizedRequest) {
  return {
    async list(merchantId: string, signal: AbortSignal): Promise<Order[]> {
      if (!merchantId.trim()) throw new Error('No pudimos identificar tu comercio. Contacta al administrador.');
      const response = await request(`${ORDERS_PATH}/comercio/${encodeURIComponent(merchantId)}`, { signal });
      return parseOrders(await response.json(), merchantId);
    },
    async advance(order: Order, signal: AbortSignal): Promise<OrderStatus> {
      if (order.status === 'READY_FOR_PICKUP') throw new Error('El pedido ya está listo para entrega.');
      const next = order.status === 'PENDING' ? 'PREPARING' : 'READY_FOR_PICKUP';
      // The repository's existing controller accepts Spanish DB states.
      const response = await request(`${ORDERS_PATH}/${encodeURIComponent(order.id)}/estado`, {
        method: 'PATCH', signal, body: JSON.stringify({ nuevoEstado: next === 'PREPARING' ? 'en_preparacion' : 'listo' }),
      });
      if (response.status !== 204) {
        const body = object(await response.json());
        if (body.success !== true) throw new Error('El servidor no confirmó el cambio de estado.');
      }
      return next;
    },
    async reject(order: Order, motivo: string, signal?: AbortSignal): Promise<void> {
      const response = await request(`${ORDERS_PATH}/${encodeURIComponent(order.id)}/rechazar`, {
        method: 'PATCH', signal, body: JSON.stringify({ motivo: motivo || 'Rechazado por el comercio' }),
      });
      if (response.status !== 200 && response.status !== 204) {
        const body = object(await response.json());
        if (body.success !== true) throw new Error('El servidor no confirmó el rechazo del pedido.');
      }
    },
  };
}
export const ordersApi = createOrdersApi();
export type OrdersApi = ReturnType<typeof createOrdersApi>;
