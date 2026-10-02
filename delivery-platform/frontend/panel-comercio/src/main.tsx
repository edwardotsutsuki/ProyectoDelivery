import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { ChefHat, UtensilsCrossed, LogOut, Store } from 'lucide-react';
import KanbanOrders from './pages/KanbanOrders';
import MenuManagement from './pages/MenuManagement';
import Login from './pages/Login';
import TrackingDemo from './pages/TrackingDemo';
import { AuthProvider, useAuth } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { config } from './config';
import SessionStatus from './components/SessionStatus';
import './index.css';

function ProtectedPortal() {
  const { status, client, session } = useAuth();
  const [activeTab, setActiveTab] = useState<'kanban' | 'menu'>('kanban');

  if (status === 'checking' || status === 'unavailable') return <SessionStatus />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegación Superior Rappi Partners */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/95 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 font-extrabold text-white shadow-md shadow-rose-950">
            <Store size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                {session?.user?.name || 'Local Aliado DeliveryYa'}
              </span>
              <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                ● ABIERTO AL PÚBLICO
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Baba, Los Ríos · ID: {session?.user?.comercioId?.substring(0, 8) || '55555555'}...
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'kanban'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ChefHat size={15} />
            <span>Comandas en Cocina</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'menu'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UtensilsCrossed size={15} />
            <span>Mi Carta & Productos</span>
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          {config.demosEnabled && (
            <Link to="/demo/pedidos" className="text-xs text-rose-300 underline underline-offset-4">
              Demo
            </Link>
          )}
          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            onClick={() => client.signOut()}
          >
            <LogOut size={13} /> Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1">
        {activeTab === 'kanban' ? <KanbanOrders source="api" /> : <MenuManagement />}
      </main>
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
            {config.demosEnabled && <Route path="/demo/pedidos" element={<KanbanOrders source="mock" />} />}
            {config.demosEnabled && <Route path="/demo/tracking" element={<TrackingDemo />} />}
            <Route path="/pedidos" element={<ProtectedPortal />} />
            <Route path="/menu" element={<ProtectedPortal />} />
            <Route path="*" element={<Navigate to="/pedidos" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

