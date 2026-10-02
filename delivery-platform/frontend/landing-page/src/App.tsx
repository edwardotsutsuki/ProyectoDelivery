import React, { useState } from 'react';
import { MapPin, Search, Store, Bike, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

export default function App() {
  const [ciudad, setCiudad] = useState('Baba');
  const [direccion, setDireccion] = useState('');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#1e293b' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', borderBottom: '1px solid #f1f5f9', background: '#fff', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '40px', height: '40px', background: '#e11d48', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '20px' }}>
            D
          </div>
          <span style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Delivery<span style={{ color: '#e11d48' }}>Ya</span></span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="#restaurantes" style={{ textDecoration: 'none', color: '#475569', fontWeight: '600', fontSize: '15px' }}>Comercios</a>
          <a href="#repartidores" style={{ textDecoration: 'none', color: '#475569', fontWeight: '600', fontSize: '15px' }}>Repartidores</a>
          <a href="http://localhost:3003" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#e11d48', fontWeight: '700', fontSize: '15px' }}>Portal Comercio</a>
          <a href="http://localhost:3004" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#0f172a', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>Backoffice</a>
        </nav>
      </header>

      <section style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #ffffff 100%)', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffe4e6', color: '#e11d48', padding: '6px 16px', borderRadius: '999px', fontWeight: '700', fontSize: '13px', marginBottom: '20px' }}>
            ⚡ Rutas inteligentes con OSRM y Tracking en Vivo
          </div>
          <h1 style={{ fontSize: '56px', fontWeight: '800', lineHeight: 1.15, color: '#0f172a', marginBottom: '24px', letterSpacing: '-1.5px' }}>
            Tus antojos y compras en tu puerta en <span style={{ color: '#e11d48' }}>tiempo récord</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#475569', marginBottom: '40px', lineHeight: 1.6 }}>
            Los mejores restaurantes locales, supermercados y farmacias con entregas guiadas punto a punto y métodos de pago flexibles: efectivo, transferencia directa o billetera virtual.
          </p>

          <div style={{ background: '#fff', padding: '12px', borderRadius: '18px', boxShadow: '0 20px 40px -15px rgba(225, 29, 72, 0.15)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', flex: '0 0 200px' }}>
              <MapPin size={20} color="#e11d48" />
              <select 
                value={ciudad} 
                onChange={(e) => setCiudad(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: '700', color: '#1e293b', width: '100%', cursor: 'pointer' }}
              >
                <option value="Baba">Baba · Piloto principal</option>
                <option value="Babahoyo">Babahoyo · Expansión</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', flex: '1 1 300px' }}>
              <Search size={20} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Ingresa tu dirección o referencia..."
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '15px' }}
              />
            </div>

            <button style={{ background: '#e11d48', color: '#fff', border: 'none', padding: '16px 28px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              Explorar menú <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section id="restaurantes" style={{ padding: '80px 24px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#e11d48', fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>
              <Store size={18} /> PARA RESTAURANTES Y NEGOCIOS
            </div>
            <h2 style={{ fontSize: '38px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2, marginBottom: '20px' }}>
              Haz crecer tus ventas con el Panel de Comercio en Tiempo Real
            </h2>
            <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.6, marginBottom: '24px' }}>
              Gestiona tus comandas en un Kanban ágil con alertas sonoras inmediatas, apaga o enciende productos agotados con 1 clic en Redis y cuadra tu caja sin errores con nuestro sistema Ledger.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontWeight: '600' }}>
                <Clock color="#10b981" size={20} /> Comandas en vivo y tiempos de cocción optimizados
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontWeight: '600' }}>
                <ShieldCheck color="#10b981" size={20} /> Liquidaciones transparentes e inmutables
              </li>
            </ul>
            <a href="http://localhost:3003" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: '#fff', padding: '14px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700' }}>
              Abrir Panel del Comercio
            </a>
          </div>
          <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '12px' }}>🍔 🍕 🍣</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>PWA Adaptable para Tablet y PC</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Instalable directamente en cualquier dispositivo del punto de venta.</p>
          </div>
        </div>
      </section>

      <section id="repartidores" style={{ padding: '80px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '12px' }}>🛵 📍 🧭</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>App Android Nativa con Modo Fondo</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Deep linking automático a Waze y Google Maps con 1 solo toque.</p>
          </div>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#e11d48', fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>
              <Bike size={18} /> ÚNETE A LA FLOTA
            </div>
            <h2 style={{ fontSize: '38px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2, marginBottom: '20px' }}>
              Sé tu propio jefe y gana entregando en tu ciudad
            </h2>
            <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.6, marginBottom: '24px' }}>
              Tecnología diseñada para la calle: navegación optimizada sin consumo excesivo de batería, cálculo de tarifas justas mediante rutas OSRM y billetera virtual en tiempo real.
            </p>
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 'auto', background: '#0f172a', color: '#94a3b8', padding: '48px 24px', fontSize: '14px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ color: '#fff', fontSize: '20px', fontWeight: '800', marginBottom: '6px' }}>Delivery<span style={{ color: '#e11d48' }}>Ya</span></div>
            <p style={{ margin: 0 }}>Infraestructura de Delivery de Alto Rendimiento © 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
