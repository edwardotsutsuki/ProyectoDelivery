export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY_FOR_PICKUP';
export const BABA_RESTAURANT = 'Picantería El Buen Sabor - Baba Centro';
export interface Order {
  id: string; customer: string; restaurant: string; address: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  createdAt: number; status: OrderStatus; note?: string; total?: number;
}
export function selectOrders(orders: Order[], query: string, overdueOnly: boolean, now: number): Order[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const search = normalize(query.trim());
  return orders.filter(order => (!search || normalize(`${order.id} ${order.customer}`).includes(search))
    && (!overdueOnly || (order.status !== 'READY_FOR_PICKUP' && now - order.createdAt >= 20 * 60000)))
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
export function orderTotal(order: Order): number {
  if (order.total !== undefined) return order.total;
  return order.items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0) / 100;
}
export function elapsedTime(createdAt: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - createdAt) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
export function advanceOrder(orders: Order[], id: string, expected: OrderStatus): Order[] {
  return orders.map(order => {
    if (order.id !== id || order.status !== expected) return order;
    const next: Record<OrderStatus, OrderStatus> = { PENDING: 'PREPARING', PREPARING: 'READY_FOR_PICKUP', READY_FOR_PICKUP: 'READY_FOR_PICKUP' };
    return { ...order, status: next[order.status] };
  });
}
export function createMockOrders(now = Date.now()): Order[] {
  return [
    { id: 'ORD-BABA-004', customer: 'María Fernanda Vera', restaurant: BABA_RESTAURANT, address: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba', items: [{ name: 'Seco de gallina', quantity: 2, unitPrice: 4.5 }, { name: 'Jugo de maracuyá', quantity: 2, unitPrice: 1.5 }], createdAt: now - 3 * 60000, status: 'PENDING', note: 'La ensalada aparte, por favor.' },
    { id: 'ORD-BABA-003', customer: 'Andrés Zambrano', restaurant: BABA_RESTAURANT, address: 'Frente al Parque Central de Baba', items: [{ name: 'Bolón mixto', quantity: 2, unitPrice: 3.75 }, { name: 'Café pasado', quantity: 1, unitPrice: 1.5 }], createdAt: now - 7 * 60000, status: 'PENDING' },
    { id: 'ORD-BABA-002', customer: 'Daniela Cedeño', restaurant: BABA_RESTAURANT, address: 'Calle Sucre y Rocafuerte, Baba', items: [{ name: 'Seco de pollo', quantity: 2, unitPrice: 5.25 }, { name: 'Agua sin gas', quantity: 2, unitPrice: 1 }], createdAt: now - 14 * 60000, status: 'PREPARING', note: 'Sin cubiertos desechables.' },
    { id: 'ORD-BABA-001', customer: 'José Luis Moreira', restaurant: BABA_RESTAURANT, address: 'Calle Bolívar, sector Barrio San Antonio, Baba', items: [{ name: 'Arroz con menestra y carne', quantity: 1, unitPrice: 6.5 }, { name: 'Patacones', quantity: 1, unitPrice: 2 }], createdAt: now - 22 * 60000, status: 'READY_FOR_PICKUP' },
  ];
}
export function createIncomingOrder(sequence: number, now = Date.now()): Order {
  const customers = ['Valentina Torres', 'Diego Mera', 'Camila Andrade'];
  const addresses = ['Barrio San Antonio, Calle Bolívar y Sucre, Baba', 'Parque Central de Baba, acceso principal', 'Av. Guayaquil, Baba Centro'];
  return { id: `ORD-BABA-${String(5 + sequence).padStart(3, '0')}`, customer: customers[sequence % 3], restaurant: BABA_RESTAURANT, address: addresses[sequence % 3], items: [{ name: 'Seco de gallina', quantity: 1 + sequence % 2, unitPrice: 4.5 }, { name: 'Jugo de naranjilla', quantity: 1, unitPrice: 2 }], createdAt: now, status: 'PENDING' };
}
