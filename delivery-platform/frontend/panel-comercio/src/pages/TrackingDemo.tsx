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
      <p style={{ fontSize: 13, color: '#475569', marginBottom: 18 }}>Baba, Los Ríos · Piloto principal · Pedido ORD-BABA-001. Babahoyo es la segunda ciudad de expansión. La ubicación del repartidor se recibe del Tracking Service; no se simula.</p>
      <CourierTrackingMap orderId="ORD-BABA-001" restaurant={{ lat: -1.7925, lng: -79.6790, name: 'Picantería El Buen Sabor - Baba Centro' }} destination={{ lat: -1.7940, lng: -79.6810, name: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba' }} trackingUrl={direct ? config.trackingDirectUrl : config.trackingUrl} />
    </div>
  </main>;
}
