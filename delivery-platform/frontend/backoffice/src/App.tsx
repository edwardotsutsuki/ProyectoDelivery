import React, { useState } from 'react';
import TrackingPage from './pages/TrackingPage';
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
  const [seccion, setSeccion] = useState<'dashboard' | 'tracker' | 'entidades' | 'finanzas'>(window.location.hash === '#tracking' ? 'tracker' : 'dashboard');

  return (
    <div className="backoffice-layout" style={{ display: 'flex', minHeight: '100vh', background: '#090d16' }}>
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
            <Navigation size={18} /> Seguimiento de pedidos
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
            <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Resumen del negocio · Demo</h1>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '14px' }}>
              Valores de ejemplo para revisar el diseño. Estas métricas todavía no están conectadas a los servicios.
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
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Ejemplo; no calculado con OSRM</div>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>REPARTIDORES EN LÍNEA</span>
                  <Bike size={16} color="#ec4899" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#f472b6', marginTop: '10px' }}>48</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Cantidad ficticia de demostración</div>
              </div>
            </div>
          </div>
        )}

        {seccion === 'tracker' && <TrackingPage />}

        {seccion === 'entidades' && (
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Módulo de Entidades</h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
              Gestión centralizada de Comercios, Repartidores y Clientes almacenados en PostgreSQL.
            </p>
            <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '20px' }}>
              <div style={{ color: '#cbd5e1' }}>La consulta de comercios y repartidores está pendiente de integración.</div>
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
