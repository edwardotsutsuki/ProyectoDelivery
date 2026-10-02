import React, { useState, useEffect } from 'react';
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
  Clock,
  RefreshCw,
  Store,
  DollarSign,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LedgerSummaryItem {
  tipo_movimiento: string;
  total_operaciones: string | number;
  balance_neto: string | number;
}

interface ComercioItem {
  id: string;
  nombre_comercial: string;
  descripcion: string;
  direccion: string;
  lat: number;
  lon: number;
  is_abierto: boolean;
  telefono: string;
  categoria: string;
  tiempo_entrega_promedio: number;
  costo_base_envio: string;
}

interface MovementItem {
  id: string;
  tipo_movimiento: string;
  monto: string | number;
  saldo_resultante: string | number;
  descripcion: string;
  fecha_creacion: string;
}

const API_BASE = 'http://localhost:8080/api/v1';

export default function App() {
  const [seccion, setSeccion] = useState<'dashboard' | 'tracker' | 'entidades' | 'finanzas'>(
    window.location.hash === '#tracking' ? 'tracker' : 'dashboard'
  );

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Datos reales del backend
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummaryItem[]>([]);
  const [comercios, setComercios] = useState<ComercioItem[]>([]);
  const [pedidosDisponibles, setPedidosDisponibles] = useState<any[]>([]);
  const [courierWallet, setCourierWallet] = useState<{
    saldoActual: number;
    movimientos: MovementItem[];
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Resumen contable global
      const resLedger = await fetch(`${API_BASE}/ledger/resumen-global`).then((r) => r.json()).catch(() => null);
      if (resLedger?.success) setLedgerSummary(resLedger.data || []);

      // 2. Catálogo de comercios espaciales (Baba y Babahoyo)
      const resComercios = await fetch(`${API_BASE}/catalog/comercios`).then((r) => r.json()).catch(() => null);
      if (resComercios?.success) setComercios(resComercios.data || []);

      // 3. Pedidos disponibles para reparto
      const resPedidos = await fetch(`${API_BASE}/orders/disponibles/reparto`).then((r) => r.json()).catch(() => null);
      if (resPedidos?.success) setPedidosDisponibles(resPedidos.data || []);

      // 4. Billetera del repartidor piloto
      const resWallet = await fetch(`${API_BASE}/ledger/billetera/usr-repartidor-01`).then((r) => r.json()).catch(() => null);
      if (resWallet?.success) {
        setCourierWallet({
          saldoActual: Number(resWallet.data.saldoActual || 0),
          movimientos: resWallet.data.movimientos || [],
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando datos del backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalTransaccionado = ledgerSummary.reduce((acc, item) => acc + Math.abs(Number(item.balance_neto || 0)), 0);
  const totalOperaciones = ledgerSummary.reduce((acc, item) => acc + Number(item.total_operaciones || 0), 0);

  return (
    <div className="backoffice-layout" style={{ display: 'flex', minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            <span>API Gateway 8080 Conectado</span>
          </div>
          <div>PostgreSQL 15 + PostGIS (5433)</div>
          <div>Redis 7 (6380) + OSRM (5001)</div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Cabecera común con botón de actualización */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#e11d48', letterSpacing: '1px' }}>
              PROVINCIA DE LOS RÍOS · BABA & BABAHOYO
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '4px 0 0 0' }}>
              {seccion === 'dashboard' && 'Dashboard Ejecutivo en Tiempo Real'}
              {seccion === 'tracker' && 'Radar y Seguimiento Geoespacial'}
              {seccion === 'entidades' && 'Catálogo de Entidades y Red de Comercios'}
              {seccion === 'finanzas' && 'Libro Mayor Contable (Ledger Inmutable)'}
            </h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Actualizando...' : 'Refrescar Datos'}
          </button>
        </div>

        {seccion === 'dashboard' && (
          <div>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '14px' }}>
              Métricas consolidadas directamente desde la base de datos PostgreSQL y la red de microservicios.
              {lastUpdated && ` Última lectura: ${lastUpdated.toLocaleTimeString('es-EC')}.`}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>VOLUMEN EN LEDGER</span>
                  <TrendingUp size={16} color="#10b981" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '10px' }}>
                  ${totalTransaccionado.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  {totalOperaciones} movimiento(s) contables
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>PEDIDOS DISPONIBLES</span>
                  <ShoppingBag size={16} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#38bdf8', marginTop: '10px' }}>
                  {pedidosDisponibles.length}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Listos para toma de repartidor</div>
              </div>

              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>COMERCIOS ACTIVOS</span>
                  <Store size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24', marginTop: '10px' }}>
                  {comercios.length}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Baba (Piloto) y Babahoyo (Expansión)
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>FLOTA DE REPARTIDORES</span>
                  <Bike size={16} color="#ec4899" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#f472b6', marginTop: '10px' }}>
                  1 Asignado
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  usr-repartidor-01 (Moto Baba 01)
                </div>
              </div>
            </div>

            {/* Panel de estado del piloto */}
            <div style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Estado Operativo de las Sedes del Piloto</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontWeight: '800', fontSize: '15px' }}>Baba (Sede Principal Piloto)</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                    Centro neurálgico y primeras entregas. Geofence (-1.7917, -79.6783).
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
                    ● 1 Comercio verificado (Picantería El Buen Sabor) · 1 Repartidor
                  </div>
                </div>
                <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
                  <div style={{ fontWeight: '800', fontSize: '15px' }}>Babahoyo (Expansión Inmediata)</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                    Capital provincial y segundo nodo operativo. Geofence (-1.8022, -79.5344).
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#38bdf8', fontWeight: '700' }}>
                    ● 1 Comercio verificado (Restaurante El Gran Chef Babahoyo)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {seccion === 'tracker' && <TrackingPage />}

        {seccion === 'entidades' && (
          <div>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
              Establecimientos gastronómicos dados de alta en PostgreSQL y consultados con cálculo espacial PostGIS.
            </p>

            <div style={{ display: 'grid', gap: '16px' }}>
              {comercios.map((comercio) => (
                <div
                  key={comercio.id}
                  style={{
                    background: '#0f172a',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: '800', fontSize: '17px', color: '#fff' }}>
                        {comercio.nombre_comercial}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: comercio.is_abierto ? '#064e3b' : '#450a0a',
                          color: comercio.is_abierto ? '#6ee7b7' : '#f87171',
                        }}
                      >
                        {comercio.is_abierto ? 'ABIERTO' : 'CERRADO'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#1e293b',
                          color: '#94a3b8',
                        }}
                      >
                        {comercio.categoria || 'Restaurante'}
                      </span>
                    </div>

                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                      {comercio.descripcion}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#cbd5e1' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#e11d48" /> {comercio.direccion}
                      </span>
                      <span>📞 {comercio.telefono}</span>
                      <span>⏱️ ~{comercio.tiempo_entrega_promedio} min</span>
                      <span>💵 Envío base: ${Number(comercio.costo_base_envio || 1.5).toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Coordenadas PostGIS</div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8', marginTop: '2px' }}>
                      {comercio.lat?.toFixed(4)}, {comercio.lon?.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: '700' }}>
                      {Math.abs(comercio.lat - -1.7917) < 0.05 ? 'PILOTO BABA' : 'EXTENSIÓN BABAHOYO'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {seccion === 'finanzas' && (
          <div>
            <div
              style={{
                background: '#0f172a',
                borderRadius: '16px',
                border: '1px solid #1e293b',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: '700', marginBottom: '12px' }}>
                <ShieldCheck size={20} /> Libro Mayor Contable Blindado por Triggers SQL
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                Todas las operaciones de la tabla <code style={{ color: '#38bdf8', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>transacciones_ledger</code> se registran
                por partida doble. El trigger PL/pgSQL <code style={{ color: '#e11d48', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>rechazar_modificacion_ledger</code> prohíbe
                cualquier <strong style={{ color: '#fff' }}>UPDATE</strong> o <strong style={{ color: '#fff' }}>DELETE</strong>, garantizando inmutabilidad y auditoría fiscal estricta.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {ledgerSummary.map((item, idx) => (
                <div key={idx} style={{ background: '#1e293b', padding: '18px', borderRadius: '14px', border: '1px solid #334155' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Tipo: {item.tipo_movimiento.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: Number(item.balance_neto) < 0 ? '#f87171' : '#34d399', marginTop: '6px' }}>
                    ${Number(item.balance_neto).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {item.total_operaciones} transacción(es) registrada(s)
                  </div>
                </div>
              ))}
            </div>

            {courierWallet && (
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                    Auditoría de Billetera Repartidor Piloto (usr-repartidor-01)
                  </h3>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: courierWallet.saldoActual < 0 ? '#f87171' : '#34d399' }}>
                    Saldo Actual: ${courierWallet.saldoActual.toFixed(2)} USD
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {courierWallet.movimientos.map((mov) => (
                    <div
                      key={mov.id}
                      style={{
                        background: '#1e293b',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{mov.descripcion}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                          ID: {mov.id.slice(0, 8)}... · {new Date(mov.fecha_creacion).toLocaleString('es-EC')} · Tipo: {mov.tipo_movimiento}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', color: Number(mov.monto) < 0 ? '#f87171' : '#34d399' }}>
                          {Number(mov.monto) < 0 ? '-' : '+'}${Math.abs(Number(mov.monto)).toFixed(2)}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                          Saldo result: ${Number(mov.saldo_resultante).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
