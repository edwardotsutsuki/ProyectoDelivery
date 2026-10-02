import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import ComerciosPage from './pages/ComerciosPage';
import ProductosPage from './pages/ProductosPage';
import ZonasTarifasPage from './pages/ZonasTarifasPage';
import FlotaCajaPage from './pages/FlotaCajaPage';
import TrackingPage from './pages/TrackingPage';
import UsuariosPage from './pages/UsuariosPage';
import {
  LayoutDashboard,
  Navigation,
  Building2,
  UtensilsCrossed,
  Layers,
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
  AlertCircle,
  LogOut,
  UserCheck,
  Users
} from 'lucide-react';

interface LedgerSummaryItem {
  tipo_movimiento: string;
  total_operaciones: string | number;
  balance_neto: string | number;
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

type NavSection = 'dashboard' | 'comercios' | 'productos' | 'usuarios' | 'zonas' | 'flota' | 'tracker' | 'finanzas';

export default function App() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [adminToken, setAdminToken] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);

  const [seccion, setSeccion] = useState<NavSection>('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Datos reales del backend para dashboard y finanzas
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummaryItem[]>([]);
  const [pedidosDisponibles, setPedidosDisponibles] = useState<any[]>([]);
  const [totalComerciosCount, setTotalComerciosCount] = useState<number>(0);
  const [courierWallet, setCourierWallet] = useState<{
    saldoActual: number;
    movimientos: MovementItem[];
  } | null>(null);

  // 1. Restauración de sesión de Administrador
  useEffect(() => {
    const savedToken = localStorage.getItem('delivery_admin_token');
    const savedUser = localStorage.getItem('delivery_admin_user');
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'admin') {
          setAdminToken(savedToken);
          setAdminUser(parsed);
        }
      } catch {
        localStorage.removeItem('delivery_admin_token');
        localStorage.removeItem('delivery_admin_user');
      }
    }
    setAuthChecked(true);
  }, []);

  const handleLoginSuccess = (user: any, token: string) => {
    setAdminUser(user);
    setAdminToken(token);
    setSeccion('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('delivery_admin_token');
    localStorage.removeItem('delivery_admin_user');
    setAdminUser(null);
    setAdminToken('');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Resumen contable
      const resLedger = await fetch(`${API_BASE}/ledger/resumen-global`).then((r) => r.json()).catch(() => null);
      if (resLedger?.success) setLedgerSummary(resLedger.data || []);

      // Conteo de comercios
      const resComercios = await fetch(`${API_BASE}/catalog/comercios`).then((r) => r.json()).catch(() => null);
      if (resComercios?.success) setTotalComerciosCount(resComercios.count || resComercios.data?.length || 0);

      // Pedidos en cola de despacho
      const resPedidos = await fetch(`${API_BASE}/orders/disponibles/reparto`).then((r) => r.json()).catch(() => null);
      if (resPedidos?.success) setPedidosDisponibles(resPedidos.data || []);

      // Billetera repartidor piloto
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
    if (adminUser) {
      fetchData();
    }
  }, [adminUser]);

  if (!authChecked) {
    return null;
  }

  // Guard de Autenticación: Si no es admin, mostrar Login
  if (!adminUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} apiBaseUrl={API_BASE} />;
  }

  const totalTransaccionado = ledgerSummary.reduce((acc, item) => acc + Math.abs(Number(item.balance_neto || 0)), 0);
  const totalOperaciones = ledgerSummary.reduce((acc, item) => acc + Number(item.total_operaciones || 0), 0);

  return (
    <div className="backoffice-layout" style={{ display: 'flex', minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      {/* Sidebar de Navegación Lateral */}
      <aside style={{ width: '270px', background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', background: '#e11d48', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
            D
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: '#fff' }}>Backoffice Admin</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Torre de Mando · Los Ríos</div>
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
            <LayoutDashboard size={18} /> Dashboard Ejecutivo
          </button>

          <button
            onClick={() => setSeccion('comercios')}
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
              background: seccion === 'comercios' ? '#e11d48' : 'transparent',
              color: seccion === 'comercios' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <Building2 size={18} /> Gestión de Locales
          </button>

          <button
            onClick={() => setSeccion('productos')}
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
              background: seccion === 'productos' ? '#e11d48' : 'transparent',
              color: seccion === 'productos' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <UtensilsCrossed size={18} /> Catálogo y Menús
          </button>

          <button
            onClick={() => setSeccion('usuarios')}
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
              background: seccion === 'usuarios' ? '#e11d48' : 'transparent',
              color: seccion === 'usuarios' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <Users size={18} /> Directorio de Usuarios
          </button>

          <button
            onClick={() => setSeccion('zonas')}
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
              background: seccion === 'zonas' ? '#e11d48' : 'transparent',
              color: seccion === 'zonas' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <Layers size={18} /> Zonas y Tarifas PostGIS
          </button>

          <button
            onClick={() => setSeccion('flota')}
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
              background: seccion === 'flota' ? '#e11d48' : 'transparent',
              color: seccion === 'flota' ? '#fff' : '#94a3b8',
              textAlign: 'left',
            }}
          >
            <Bike size={18} /> Torre de Flota & Caja
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
            <Navigation size={18} /> Radar y Seguimiento
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

        {/* Perfil del Operador y Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', background: '#0b1120' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <UserCheck size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {adminUser.name || 'Admin Central'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {adminUser.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: '#1e293b',
              color: '#f87171',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Cabecera común con botón de actualización */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#e11d48', letterSpacing: '1px' }}>
              PROVINCIA DE LOS RÍOS · OPERACIÓN BABA & BABAHOYO
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '4px 0 0 0' }}>
              {seccion === 'dashboard' && 'Dashboard Ejecutivo de Operaciones'}
              {seccion === 'comercios' && 'Gestión Comercial de Locales'}
              {seccion === 'productos' && 'Administración de Menús y Catálogo'}
              {seccion === 'usuarios' && 'Directorio Central de Usuarios y Permisos'}
              {seccion === 'zonas' && 'Geofencing de Zonas y Tarifación'}
              {seccion === 'tracker' && 'Radar y Seguimiento Geoespacial'}
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
            {loading ? 'Actualizando...' : 'Refrescar Métricas'}
          </button>
        </div>

        {/* Renderizado de Secciones */}
        {seccion === 'dashboard' && (
          <div>
            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '14px' }}>
              Métricas consolidadas directamente desde PostgreSQL PostGIS y la red de microservicios.
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
                  <span>LOCALES ACTIVOS</span>
                  <Store size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24', marginTop: '10px' }}>
                  {totalComerciosCount}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Baba (Piloto) y Babahoyo (Expansión)
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  <span>FLOTA ASIGNADA</span>
                  <Bike size={16} color="#ec4899" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#f472b6', marginTop: '10px' }}>
                  1 Conductor
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  usr-repartidor-01 (Moto Baba 01)
                </div>
              </div>
            </div>

            {/* Panel de estado de los cantones */}
            <div style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Centros Operativos del Piloto en Los Ríos</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontWeight: '800', fontSize: '15px' }}>Cantón Baba (Sede Principal)</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                    Centro neurálgico del piloto. Coordenadas base: (-1.7917, -79.6783).
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
                    ● Locales en servicio · Cobertura urbana y recintos aledaños
                  </div>
                </div>
                <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
                  <div style={{ fontWeight: '800', fontSize: '15px' }}>Cantón Babahoyo (Sede Expansión)</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                    Capital provincial y segundo nodo de despacho. Coordenadas base: (-1.8022, -79.5344).
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#38bdf8', fontWeight: '700' }}>
                    ● Locales en servicio · Corredor intercantonal E484 conectado
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {seccion === 'comercios' && <ComerciosPage apiBaseUrl={API_BASE} />}

        {seccion === 'productos' && <ProductosPage apiBaseUrl={API_BASE} />}

        {seccion === 'usuarios' && <UsuariosPage apiBaseUrl={API_BASE} />}

        {seccion === 'zonas' && <ZonasTarifasPage />}
        {seccion === 'flota' && <FlotaCajaPage />}
        {seccion === 'tracker' && <TrackingPage />}

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
