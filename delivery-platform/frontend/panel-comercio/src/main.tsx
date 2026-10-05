import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { 
  ChefHat, UtensilsCrossed, LogOut, Store, Users, DollarSign, 
  Settings, Package, KeyRound, ChevronDown, Check, Shield, AlertCircle, X, RefreshCw, TrendingUp
} from 'lucide-react';
import KanbanOrders from './pages/KanbanOrders';
import MenuManagement from './pages/MenuManagement';
import StaffManagement from './pages/StaffManagement';
import CajaTurnos from './pages/CajaTurnos';
import ReportsManagement from './pages/ReportsManagement';
import LocalSettings from './pages/LocalSettings';
import Login from './pages/Login';
import TrackingDemo from './pages/TrackingDemo';
import { AuthProvider, useAuth } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { config } from './config';
import SessionStatus from './components/SessionStatus';
import './index.css';

interface Operator {
  id: string;
  nombre: string;
  rol: 'admin' | 'cajero' | 'cocina' | 'picker' | string;
  telefono?: string;
  is_activo: boolean;
}

function ProtectedPortal() {
  const { status, client, session } = useAuth();
  const comercioId = session?.user?.comercioId ?? '55555555-5555-5555-5555-555555555555';
  
  const [activeTab, setActiveTab] = useState<'kanban' | 'menu' | 'staff' | 'caja' | 'reports' | 'settings'>('kanban');
  const [isRetail, setIsRetail] = useState(false);
  const [comercioNombre, setComercioNombre] = useState<string>(session?.user?.name || 'Local Aliado');
  const [comercioTipo, setComercioTipo] = useState<string>('');

  // Operador activo actual con Cambio Rápido de PIN (Toast POS / Square style)
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(() => {
    try {
      const saved = localStorage.getItem(`delivery.operator_${comercioId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modal de PIN Switcher
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Cargar metadatos del comercio y setear operador por defecto si no existe
  useEffect(() => {
    async function loadComercio() {
      try {
        const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (json.data.nombre_comercial) setComercioNombre(json.data.nombre_comercial);
            if (json.data.tipo_comercio_nombre) setComercioTipo(json.data.tipo_comercio_nombre);
            const retail = json.data.tipo_layout === 'grid_ecommerce' ||
                           ['supermercado', 'farmacia', 'licorera', 'express'].includes(json.data.tipo_comercio_id);
            setIsRetail(retail);
          }
        }
      } catch (err) {
        console.warn('Error loading store metadata:', err);
      }
    }

    async function loadInitialOperator() {
      if (!currentOperator) {
        try {
          const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
              const first = json.data[0];
              const op: Operator = {
                id: first.id,
                nombre: first.nombre,
                rol: first.rol,
                telefono: first.telefono,
                is_activo: first.is_activo
              };
              setCurrentOperator(op);
              localStorage.setItem(`delivery.operator_${comercioId}`, JSON.stringify(op));
            }
          }
        } catch (err) {
          console.warn('Error loading initial staff operator:', err);
        }
      }
    }

    if (comercioId) {
      loadComercio();
      loadInitialOperator();
    }
  }, [comercioId]);

  // Si el operador actual es cocina o picker, restringir solo a la pantalla operativa (KDS / Picking)
  useEffect(() => {
    if (currentOperator) {
      if (currentOperator.rol === 'cocina' || currentOperator.rol === 'picker') {
        setActiveTab('kanban');
      }
    }
  }, [currentOperator]);

  // Manejo de cambio de PIN en Modal
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.length < 4) {
      setPinError('Ingresa un PIN de al menos 4 dígitos');
      return;
    }

    setVerifyingPin(true);
    setPinError(null);

    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'PIN incorrecto o usuario inactivo');
      }

      const verifiedUser: Operator = {
        id: json.data.id,
        nombre: json.data.nombre,
        rol: json.data.rol,
        telefono: json.data.telefono,
        is_activo: json.data.is_activo
      };

      setCurrentOperator(verifiedUser);
      localStorage.setItem(`delivery.operator_${comercioId}`, JSON.stringify(verifiedUser));
      setShowPinModal(false);
      setPinInput('');
    } catch (err: any) {
      setPinError(err.message || 'PIN no válido');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      setPinInput(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPinInput('');
    } else if (pinInput.length < 6) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        // Auto-enviar si se completan 4 dígitos
        setTimeout(() => {
          verifyPinDirect(nextPin);
        }, 150);
      }
    }
  };

  const verifyPinDirect = async (pinToTest: string) => {
    setVerifyingPin(true);
    setPinError(null);
    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToTest.trim() })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'PIN no encontrado');
      }
      const verifiedUser: Operator = {
        id: json.data.id,
        nombre: json.data.nombre,
        rol: json.data.rol,
        telefono: json.data.telefono,
        is_activo: json.data.is_activo
      };
      setCurrentOperator(verifiedUser);
      localStorage.setItem(`delivery.operator_${comercioId}`, JSON.stringify(verifiedUser));
      setShowPinModal(false);
      setPinInput('');
    } catch (err: any) {
      setPinError(err.message || 'PIN incorrecto');
    } finally {
      setVerifyingPin(false);
    }
  };

  if (status === 'checking' || status === 'unavailable') return <SessionStatus />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;

  const isOperativeOnly = currentOperator?.rol === 'cocina' || currentOperator?.rol === 'picker';
  const isAdmin = currentOperator?.rol === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegación Superior Rappi Partners & Multi-Turno POS */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/95 px-5 py-3 backdrop-blur-md">
        {/* Identidad del Local */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 font-extrabold text-white shadow-md shadow-rose-950">
            <Store size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                {comercioNombre}
              </span>
              <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                ● EN LÍNEA
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Baba, Los Ríos · {comercioTipo || (isRetail ? 'Tienda / Percha' : 'Gastronomía')}
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación Dinámica según Rol y Tipo de Negocio */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 overflow-x-auto max-w-full">
          {/* Tab 1: Comandas / Picking */}
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
              activeTab === 'kanban'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {isRetail ? <Package size={14} /> : <ChefHat size={14} />}
            <span>{isRetail ? 'Estación de Picking' : 'Comandas / Cocina'}</span>
          </button>

          {/* Tab 2: Mi Menú / Percha (Oculto para personal exclusivo de cocina/picking) */}
          {!isOperativeOnly && (
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                activeTab === 'menu'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {isRetail ? <Store size={14} /> : <UtensilsCrossed size={14} />}
              <span>{isRetail ? 'Catálogo & Percha' : 'Mi Carta & Menú'}</span>
            </button>
          )}

          {/* Tab 3: Equipo & Cajeros (Solo visible si es Admin o Cajero) */}
          {!isOperativeOnly && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users size={14} />
              <span>Equipo & Cajeros</span>
            </button>
          )}

          {/* Tab 4: Caja & Turnos (Oculto para cocina/picking) */}
          {!isOperativeOnly && (
            <button
              onClick={() => setActiveTab('caja')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                activeTab === 'caja'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <DollarSign size={14} />
              <span>Caja & Turnos</span>
            </button>
          )}

          {/* Tab 5: Reportes & Liquidaciones */}
          {!isOperativeOnly && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <TrendingUp size={14} />
              <span>Reportes & Liquidación</span>
            </button>
          )}

          {/* Tab 6: Mi Local (Configuración) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Settings size={14} />
              <span>Mi Local</span>
            </button>
          )}
        </nav>

        {/* Sección Derecha: Switch Rápido de PIN de Operador y Salir */}
        <div className="flex items-center gap-3">
          {/* Botón Selector de Operador con PIN (Toast POS) */}
          <button
            onClick={() => {
              setPinInput('');
              setPinError(null);
              setShowPinModal(true);
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 rounded-xl transition-all shadow-sm group"
            title="Cambiar de cajero o trabajador con PIN"
          >
            <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">
              {currentOperator?.rol === 'admin' ? '👑' : currentOperator?.rol === 'cocina' ? '👨‍🍳' : currentOperator?.rol === 'picker' ? '📦' : '💵'}
            </div>
            <div className="text-left text-xs leading-tight">
              <div className="font-extrabold text-white group-hover:text-rose-400 transition-colors">
                {currentOperator ? currentOperator.nombre : 'Operador'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {currentOperator?.rol || 'Sin PIN'} · Cambiar PIN ▾
              </div>
            </div>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            onClick={() => client.signOut()}
            title="Cerrar Sesión Principal"
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* Banner de Aviso si está en Modo Cocina / Picking Restringido */}
      {isOperativeOnly && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 px-6 py-2 text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-2">
          <span>🔒 Estás en Modo {currentOperator?.rol === 'cocina' ? 'Cocina / KDS' : 'Picking en Percha'} (Sin acceso a dinero ni menú). Para administrar, cambia de turno con el PIN de Cajero o Administrador arriba.</span>
        </div>
      )}

      {/* Contenido Principal según Tab Activo */}
      <main className="flex-1">
        {activeTab === 'kanban' && <KanbanOrders source="api" isRetail={isRetail} />}
        {activeTab === 'menu' && <MenuManagement isRetail={isRetail} comercioTipo={comercioTipo} />}
        {activeTab === 'staff' && (
          <StaffManagement 
            comercioId={comercioId} 
            isRetail={isRetail} 
            canEdit={isAdmin} 
          />
        )}
        {activeTab === 'caja' && (
          <CajaTurnos 
            comercioId={comercioId} 
            comercioNombre={comercioNombre} 
            currentOperator={currentOperator} 
          />
        )}
        {activeTab === 'reports' && (
          <ReportsManagement 
            comercioId={comercioId} 
            comercioNombre={comercioNombre} 
          />
        )}
        {activeTab === 'settings' && (
          <LocalSettings 
            comercioId={comercioId} 
            isRetail={isRetail} 
          />
        )}
      </main>

      {/* Modal Cambio Rápido de Cajero / PIN (Toast / Square Style) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                <KeyRound size={16} className="text-amber-400" />
                <span>Cambio de Turno (PIN)</span>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Digita tu PIN de 4 dígitos para ingresar a tu turno de cajero, cocina o despacho:
            </p>

            {/* Display del PIN (Burbujas) */}
            <div className="flex justify-center items-center gap-3 py-3">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    pinInput.length > idx
                      ? 'bg-rose-500 border-rose-500 scale-110 shadow-md shadow-rose-950'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                />
              ))}
            </div>

            {/* Error si el PIN falló */}
            {pinError && (
              <div className="text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 bg-rose-950/50 p-2 rounded-xl border border-rose-500/30">
                <AlertCircle size={14} />
                <span>{pinError}</span>
              </div>
            )}

            {/* Teclado Numérico Táctil */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  disabled={verifyingPin}
                  className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg border border-slate-700/80 shadow-sm transition-all"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress('clear')}
                className="h-12 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 font-bold text-xs border border-slate-800"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg border border-slate-700/80"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('backspace')}
                className="h-12 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 font-bold text-sm border border-slate-800 flex items-center justify-center"
              >
                ⌫
              </button>
            </div>

            {verifyingPin && (
              <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5 pt-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Verificando PIN de colaborador...</span>
              </div>
            )}

            <div className="pt-2 text-[11px] text-slate-500">
              PINs demo: Admin (1111), Cajero (1234), Cocina (5678)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/pedidos" element={<ProtectedPortal />} />
            <Route path="/menu" element={<ProtectedPortal />} />
            <Route path="/equipo" element={<ProtectedPortal />} />
            <Route path="/caja" element={<ProtectedPortal />} />
            <Route path="/ajustes" element={<ProtectedPortal />} />
            <Route path="*" element={<Navigate to="/pedidos" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
