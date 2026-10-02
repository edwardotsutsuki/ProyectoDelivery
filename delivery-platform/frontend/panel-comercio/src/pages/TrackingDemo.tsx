import { useState } from 'react';
import { Link } from 'react-router-dom';
import CourierTrackingMap from '../components/CourierTrackingMap';
import { config } from '../config';

export default function TrackingDemo() {
  const [direct, setDirect] = useState(false);
  return <main style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', color: '#0f172a' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <Link to="/demo/pedidos" style={{ color: '#be123c' }}>← Volver a comandas</Link>
        <label style={{ fontSize: 14 }}><input type="checkbox" checked={direct} onChange={event => setDirect(event.target.checked)} /> Conectar directamente al puerto 4001</label>
      </div>
      <p style={{ fontSize: 13, color: '#475569', marginBottom: 18 }}>Puntos de ejemplo en Guayaquil · Pedido GYE-1042. La ubicación del repartidor se recibe del Tracking Service; no se simula.</p>
      <CourierTrackingMap orderId="GYE-1042" restaurant={{ lat: -2.1933, lng: -79.8805, name: 'Restaurante · Malecón Simón Bolívar' }} destination={{ lat: -2.1890, lng: -79.8895, name: 'Entrega · Av. 9 de Octubre' }} trackingUrl={direct ? config.trackingDirectUrl : config.trackingUrl} />
    </div>
  </main>;
}
