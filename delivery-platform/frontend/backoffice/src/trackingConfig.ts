declare const __TRACKING_CONFIG__: { trackingUrl: string; osrmUrl: string } | undefined;
export const trackingConfig = typeof __TRACKING_CONFIG__ === 'undefined'
  ? { trackingUrl: 'ws://localhost:8080/ws/', osrmUrl: 'http://localhost:5001' }
  : __TRACKING_CONFIG__;
export const trackingScenarios = [
  { id: 'baba', city: 'Baba', orderId: 'ORD-BABA-001', restaurant: { lat: -1.7925, lng: -79.6790, name: 'Picantería El Buen Sabor · Baba Centro' }, destination: { lat: -1.7940, lng: -79.6810, name: 'Barrio San Antonio · Bolívar y Sucre' } },
  { id: 'babahoyo', city: 'Babahoyo', orderId: 'ORD-BABAHOYO-001', restaurant: { lat: -1.8015, lng: -79.5350, name: 'Asadero La Esquina del Sabor · Malecón' }, destination: { lat: -1.8040, lng: -79.5320, name: 'Av. 6 de Octubre y General Barona' } },
];
