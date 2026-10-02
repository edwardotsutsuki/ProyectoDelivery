export const RESTAURANT = { id: '55555555-5555-5555-5555-555555555555', name: 'Picantería El Buen Sabor - Baba Centro', city: 'Baba', lat: -1.7925, lng: -79.6790 };
export const DEFAULT_ADDRESS = 'Barrio San Antonio, Calle Bolívar y Sucre, Baba';
export const DELIVERY_CENTS = 150;
export const MAX_QUANTITY = 99;
export const CATALOG = [
  { id: 'seco-gallina', name: 'Seco de gallina', description: 'Gallina criolla, arroz y ensalada fresca.', priceCents: 450, emoji: '🍲' },
  { id: 'bolon-mixto', name: 'Bolón mixto', description: 'Verde, queso y chicharrón, hecho al momento.', priceCents: 375, emoji: '🍽️' },
  { id: 'menestra', name: 'Arroz con menestra y carne', description: 'Sabor de casa con carne asada.', priceCents: 650, emoji: '🥘' },
  { id: 'maracuya', name: 'Jugo de maracuyá', description: 'Jugo natural para acompañar tu plato.', priceCents: 150, emoji: '🥤' },
  { id: 'cafe', name: 'Café pasado', description: 'Una taza de café tradicional.', priceCents: 150, emoji: '☕' },
] as const;
export type ProductId = typeof CATALOG[number]['id'];
export type Cart = Partial<Record<ProductId, number>>;
export type Payment = 'efectivo' | 'transferencia';
export function changeQuantity(cart: Cart, id: ProductId, delta: number): Cart {
  if (!CATALOG.some(product => product.id === id) || !Number.isInteger(delta)) return cart;
  const next = { ...cart };
  const quantity = Math.min(MAX_QUANTITY, Math.max(0, (cart[id] ?? 0) + delta));
  if (quantity) next[id] = quantity;
  else delete next[id];
  return next;
}
export function cartLines(cart: Cart) {
  return CATALOG.flatMap(product => {
    const quantity = cart[product.id] ?? 0;
    return Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY
      ? [{ ...product, quantity, subtotalCents: product.priceCents * quantity }] : [];
  });
}
export function cartTotals(cart: Cart) {
  const lines = cartLines(cart);
  const count = lines.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = lines.reduce((sum, item) => sum + item.subtotalCents, 0);
  const deliveryCents = count ? DELIVERY_CENTS : 0;
  return { count, subtotalCents, deliveryCents, totalCents: subtotalCents + deliveryCents };
}
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export function checkoutError(cart: Cart, address: string, payment: string): string {
  if (!cartTotals(cart).count) return 'Agrega al menos un plato para continuar.';
  if (Object.entries(cart).some(([id, qty]) => !CATALOG.some(p => p.id === id) || !Number.isInteger(qty) || !qty || qty < 1 || qty > MAX_QUANTITY)) return 'Revisa las cantidades de tu carrito.';
  if (address.trim().length < 10) return 'Escribe una dirección completa de entrega en Baba.';
  if (address.trim().length > 200) return 'La dirección debe tener hasta 200 caracteres.';
  if (!['efectivo', 'transferencia'].includes(payment)) return 'Selecciona Efectivo o Transferencia.';
  return '';
}
// Local preview only: IDs/prices are fixtures, never sent as production catalog data.
export function prepareCheckout(cart: Cart, address: string, payment: Payment) {
  const error = checkoutError(cart, address, payment);
  if (error) throw new Error(error);
  return { restaurant: RESTAURANT.name, city: RESTAURANT.city, address: address.trim(), payment,
    items: cartLines(cart), ...cartTotals(cart) };
}
