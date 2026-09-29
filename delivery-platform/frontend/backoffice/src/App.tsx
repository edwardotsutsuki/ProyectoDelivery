import React, { useState } from 'react';
import {
  LayoutDashboard,
  Navigation,
  Building2,
  Bike,
  Landmark,
  ShieldCheck,
  TrendingUp,
  ShoppingBag,
  Clock
} from 'lucide-react';

export default function App() {
  const [seccion, setSeccion] = useState<'dashboard' | 'tracker' | 'entidades' | 'finanzas'>('dashboard');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16' }}>
      <aside style={{ width: '260px', background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: '#e11d48', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
            D
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#fff' }}>Backoffice</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Centro de Mando Central</div>
          </div>
        </div>

        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setSeccion('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
              background: seccion === 'dashboard' ? '#e11d48' : 'transparent',
              color: seccion === 'dashboard' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <LayoutDashboard size={18} /> Dashboard Directivo
          </button>

          <button
            onClick={() => setSeccion('tracker')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
              background: seccion === 'tracker' ? '#e11d48' : 'transparent',
              color: seccion === 'tracker' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <Navigation size={18} /> Live Tracker (OSM Radar)
          </button>

          <button
            onClick={() => setSeccion('entidades')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
              background: seccion === 'entidades' ? '#e11d48' : 'transparent',
              color: seccion === 'entidades' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <Building2 size={18} /> Gestión de Entidades
          </button>

          <button
            onClick={() => setSeccion('finanzas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
              background: seccion === 'finanzas' ? '#e11d48' : 'transparent',
              color: seccion === 'finanzas' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <Landmark size={18} /> Ledger & Finanzas
          </button>
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', fontSize: '12px', color: '#64748b' }}>
          <div>PostgreSQL 15 + PostGIS</div>
          <div>Redis 7 + OSRM Engine</div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {seccion === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Métricas en Vivo del Negocio</h1>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '14px' }}>
              Rendimiento operacional, volumen bruto de mercancías (GMV) y estado de flota en Guayaquil.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>VOLUMEN TRANSACCIONADO</span>
                  <TrendingUp size={16} color="#10b981" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '10px' }}>$4,892.50</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>+18.4% vs ayer</div>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>PEDIDOS ACTIVOS</span>
                  <ShoppingBag size={16} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#38bdf8', marginTop: '10px' }}>142</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>38 en preparación, 104 en ruta</div>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>TIEMPO PROMEDIO ENTREGA</span>
                  <Clock size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24', marginTop: '10px' }}>24.2 min</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Calculado con OSRM Engine</div>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>REPARTIDORES EN LÍNEA</span>
                  <Bike size={16} color="#ec4899" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#f472b6', marginTop: '10px' }}>48</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Transmitiendo coordenadas GPS</div>
              </div>
            </div>
          </div>
        )}

        {seccion === 'tracker' && (
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Live Tracker - Flota de Repartidores</h1>
            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
              Transmisión bidireccional conectada a <code>ws://localhost:8080/ws/</code> con latencia sub-100ms.
            </p>

            <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '16px', height: '520px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: '#0a0f1d', borderRadius: '12px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                <div style={{ position: 'absolute', top: '20px', left: '20px', background: '#0f172aee', padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155', fontSize: '13px' }}>
                  <div style={{ fontWeight: '700', color: '#34d399' }}>● 12 Repartidores en Guayaquil Centro</div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>OSRM Routing Activo: Lat -2.1894, Lon -79.8891</div>
                </div>

                <div style={{ color: '#475569', textAlign: 'center' }}>
                  <Navigation size={48} style={{ opacity: 0.2, marginBottom: '8px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Radar Georreferenciado PostGIS / OSRM</div>
                  <div style={{ fontSize: '12px' }}>Conectado a /ws/tracking-service</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {seccion === 'entidades' && (
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Módulo de Entidades</h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
              Gestión centralizada de Comercios, Repartidores y Clientes almacenados en PostgreSQL.
            </p>
            <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '20px' }}>
              <div style={{ color: '#cbd5e1' }}>Comercios y repartidores sincronizados desde la base de datos PostgreSQL.</div>
            </div>
          </div>
        )}

        {seccion === 'finanzas' && (
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Módulo Financiero - Ledger Inmutable</h1>
            <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: '700', marginBottom: '16px' }}>
                <ShieldCheck size={20} /> Libro Mayor Contable Protegido por Triggers SQL
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
