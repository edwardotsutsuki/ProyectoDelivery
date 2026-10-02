export type Status = 'READY_FOR_PICKUP' | 'ACCEPTED' | 'ON_THE_WAY' | 'DELIVERED';
export type Action = 'ACCEPT' | 'START' | 'DELIVER';
export interface Point { lat: number; lng: number }
export interface Delivery { id: string; customer: string; address: string; status: Status; assignedTo?: string; payment: 'efectivo' | 'transferencia'; totalCents: number; destination: Point }
export interface Shift { online: boolean; orders: Delivery[] }
export const COURIER_ID = 'usr-repartidor-01';
export const RESTAURANT = { name: 'Picantería El Buen Sabor - Baba Centro', lat: -1.7925, lng: -79.6790 };
export function initialShift(): Shift {
  return { online: false, orders: [
    { id: 'ORD-BABA-001', customer: 'María Vera', address: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba', status: 'READY_FOR_PICKUP', payment: 'efectivo', totalCents: 1350, destination: { lat: -1.7940, lng: -79.6810 } },
    { id: 'ORD-BABA-002', customer: 'Andrés Zambrano', address: 'Parque Central de Baba', status: 'READY_FOR_PICKUP', payment: 'transferencia', totalCents: 1050, destination: { lat: -1.7917, lng: -79.6783 } },
  ] };
}
export function setAvailability(shift: Shift, online: boolean): Shift {
  if (!online && shift.orders.some(order => order.assignedTo === COURIER_ID && ['ACCEPTED', 'ON_THE_WAY'].includes(order.status))) throw new Error('Termina la entrega activa antes de cerrar el turno.');
  return { ...shift, online };
}
export function transition(shift: Shift, id: string, action: Action): Shift {
  if (!shift.online) throw new Error('Ponte Online para gestionar entregas.');
  const order = shift.orders.find(item => item.id === id);
  if (!order) throw new Error('Pedido no encontrado.');
  const expected: Record<Action, Status> = { ACCEPT: 'READY_FOR_PICKUP', START: 'ACCEPTED', DELIVER: 'ON_THE_WAY' };
  const next: Record<Action, Status> = { ACCEPT: 'ACCEPTED', START: 'ON_THE_WAY', DELIVER: 'DELIVERED' };
  if (!expected[action] || order.status !== expected[action]) throw new Error('La acción no corresponde al estado del pedido.');
  if (order.assignedTo && order.assignedTo !== COURIER_ID) throw new Error('El pedido pertenece a otro repartidor.');
  if (action !== 'ACCEPT' && order.assignedTo !== COURIER_ID) throw new Error('Acepta primero este pedido.');
  if (action === 'ACCEPT' && shift.orders.some(item => item.assignedTo === COURIER_ID && ['ACCEPTED', 'ON_THE_WAY'].includes(item.status))) throw new Error('Ya tienes una entrega activa.');
  return { ...shift, orders: shift.orders.map(item => item.id === id ? { ...item, status: next[action], assignedTo: COURIER_ID } : item) };
}
export function navigationUrls(point: Point, platform: string) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) throw new Error('Destino de navegación inválido.');
  const position = `${point.lat},${point.lng}`;
  return { waze: `waze://?ll=${position}&navigate=yes`, wazeWeb: `https://waze.com/ul?ll=${position}&navigate=yes`,
    maps: platform === 'ios' ? `comgooglemaps://?daddr=${position}&directionsmode=driving` : `google.navigation:q=${position}`,
    mapsWeb: `https://www.google.com/maps/dir/?api=1&destination=${position}` };
}
