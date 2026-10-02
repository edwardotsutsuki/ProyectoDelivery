import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import KanbanOrders from './pages/KanbanOrders';
import Login from './pages/Login';
import TrackingDemo from './pages/TrackingDemo';
import { AuthProvider, useAuth } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { config } from './config';
import SessionStatus from './components/SessionStatus';
import './index.css';

function ProtectedOrders() {
  const { status, client } = useAuth();
  if (status === 'checking' || status === 'unavailable') return <SessionStatus />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return <><div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-6 py-3 text-sm text-slate-300"><span>Sesión de comercio · Pedidos del Gateway</span>{config.demosEnabled && <Link to="/demo/pedidos" className="rounded text-rose-300 underline underline-offset-4">Probar comandas de Baba · Demo</Link>}<button className="rounded-lg border-0 bg-slate-700 px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500" onClick={() => client.signOut()}>Cerrar sesión</button></div><KanbanOrders source="api" /></>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider><AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    {config.demosEnabled && <Route path="/demo/pedidos" element={<KanbanOrders />} />}
    {config.demosEnabled && <Route path="/demo/tracking" element={<TrackingDemo />} />}
    <Route path="/pedidos" element={<ProtectedOrders />} />
    <Route path="*" element={<Navigate to="/pedidos" replace />} />
  </Routes></BrowserRouter></AuthProvider></ThemeProvider></React.StrictMode>,
);
