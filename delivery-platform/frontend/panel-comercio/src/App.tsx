import React, { useState } from 'react';
import { Bell, ChefHat, CheckCircle2, Truck, DollarSign, UtensilsCrossed, Power, Volume2 } from 'lucide-react';

interface Pedido {
  id: string;
  cliente: string;
  items: { nombre: string; cantidad: number }[];
  total: number;
  metodoPago: 'efectivo' | 'transferencia' | 'saldo_virtual';
  estado: 'nuevo' | 'en_preparacion' | 'listo' | 'despachado';
  hora: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  disponible: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'menu' | 'finanzas'>('kanban');

  const [pedidos, setPedidos] = useState<Pedido[]>([
    {
      id: 'PED-101',
      cliente: 'Carlos Andrade',
      items: [{ nombre: 'Pizza Margherita Mediana', cantidad: 2 }, { nombre: 'Gaseosa 500ml', cantidad: 2 }],
      total: 22.00,
      metodoPago: 'efectivo',
      estado: 'nuevo',
      hora: '17:45',
    },
    {
      id: 'PED-102',
      cliente: 'Lucía Viteri',
      items: [{ nombre: 'Pizza Cuatro Quesos', cantidad: 1 }],
      total: 12.00,
      metodoPago: 'transferencia',
      estado: 'en_preparacion',
      hora: '17:32',
    },
    {
      id: 'PED-103',
      cliente: 'Fernando Ruiz',
      items: [{ nombre: 'Pizza Margherita Mediana', cantidad: 1 }],
      total: 9.50,
      metodoPago: 'saldo_virtual',
      estado: 'listo',
      hora: '17:20',
    },
  ]);

  const [productos, setProductos] = useState<Producto[]>([
    { id: 'prod-1', nombre: 'Pizza Margherita Mediana', precio: 9.50, disponible: true },
    { id: 'prod-2', nombre: 'Pizza Cuatro Quesos', precio: 12.00, disponible: true },
    { id: 'prod-3', nombre: 'Gaseosa 500ml', precio: 1.50, disponible: true },
    { id: 'prod-4', nombre: 'Calzone Relleno Especial', precio: 8.00, disponible: false },
  ]);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio no interactuado aún');
    }
  };

  const moverEstado = (id: string, nuevoEstado: Pedido['estado']) => {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p)));
    playAlertSound();
  };

  const toggleProducto = (id: string) => {
    setProductos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nuevo = !p.disponible;
          console.log(`[REDIS EVENT] Producto ${id} disponibilidad: ${nuevo}`);
          return { ...p, disponible: nuevo };
        }
        return p;
      })
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#e11d48', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '15px' }}>
            LOCAL 01
          </div>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>Pizzería Napolitana Gourmet</span>
          <span style={{ background: '#064e3b', color: '#34d399', fontSize: '12px', padding: '4px 10px', borderRadius: '999px', fontWeight: '700' }}>
            ● COMERCIO ABIERTO
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: '#0f172a', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('kanban')}
            style={{ background: activeTab === 'kanban' ? '#e11d48' : 'transparent', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ChefHat size={16} /> Comandas Kanban
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            style={{ background: activeTab === 'menu' ? '#e11d48' : 'transparent', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UtensilsCrossed size={16} /> Menú & Stock (Redis)
          </button>
          <button
            onClick={() => setActiveTab('finanzas')}
            style={{ background: activeTab === 'finanzas' ? '#e11d48' : 'transparent', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <DollarSign size={16} /> Cuadre de Caja
          </button>
        </div>

        <button onClick={playAlertSound} style={{ background: '#334155', border: 'none', color: '#f8fafc', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <Volume2 size={16} /> Probar Alarma
        </button>
      </header>

      <main style={{ flex: 1, padding: '24px', overflowX: 'auto' }}>
        {activeTab === 'kanban' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
            <div style={{ background: '#1e293b', borderRadius: '16px', padding: '16px', borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: '800', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={18} /> NUEVOS
                </span>
                <span style={{ background: '#f59e0b22', color: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                  {pedidos.filter((p) => p.estado === 'nuevo').length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidos.filter((p) => p.estado === 'nuevo').map((p) => (
                  <div key={p.id} style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '800', color: '#fff' }}>{p.id}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{p.hora}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>{p.cliente}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                      {p.items.map((it, idx) => (
                        <div key={idx}>• {it.cantidad}x {it.nombre}</div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: '800', color: '#10b981' }}>${p.total.toFixed(2)}</span>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', background: '#334155', padding: '2px 6px', borderRadius: '4px' }}>{p.metodoPago}</span>
                    </div>
                    <button
                      onClick={() => moverEstado(p.id, 'en_preparacion')}
                      style={{ width: '100%', background: '#f59e0b', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Aceptar y Cocinar 🍳
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '16px', padding: '16px', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChefHat size={18} /> EN COCINA
                </span>
                <span style={{ background: '#3b82f622', color: '#60a5fa', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                  {pedidos.filter((p) => p.estado === 'en_preparacion').length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidos.filter((p) => p.estado === 'en_preparacion').map((p) => (
                  <div key={p.id} style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '800', color: '#fff' }}>{p.id}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{p.hora}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>{p.cliente}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                      {p.items.map((it, idx) => (
                        <div key={idx}>• {it.cantidad}x {it.nombre}</div>
                      ))}
                    </div>
                    <button
                      onClick={() => moverEstado(p.id, 'listo')}
                      style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Listo para Entrega ✅
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '16px', padding: '16px', borderTop: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: '800', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={18} /> LISTOS EN MOSTRADOR
                </span>
                <span style={{ background: '#10b98122', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                  {pedidos.filter((p) => p.estado === 'listo').length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidos.filter((p) => p.estado === 'listo').map((p) => (
                  <div key={p.id} style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '800', color: '#fff' }}>{p.id}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{p.hora}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>{p.cliente}</div>
                    <button
                      onClick={() => moverEstado(p.id, 'despachado')}
                      style={{ width: '100%', background: '#10b981', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Entregar al Repartidor 🛵
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '16px', padding: '16px', borderTop: '4px solid #64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: '800', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={18} /> EN RUTA / ENTREGADOS
                </span>
                <span style={{ background: '#64748b22', color: '#94a3b8', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                  {pedidos.filter((p) => p.estado === 'despachado').length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidos.filter((p) => p.estado === 'despachado').map((p) => (
                  <div key={p.id} style={{ background: '#0f172a', opacity: 0.7, padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '800', color: '#fff' }}>{p.id}</span>
                      <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '700' }}>Despachado</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>{p.cliente} - ${p.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Control de Stock y Disponibilidad Rápida</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {productos.map((prod) => (
                <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px' }}>{prod.nombre}</div>
                    <div style={{ color: '#38bdf8', fontWeight: '700', marginTop: '4px' }}>${prod.precio.toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: prod.disponible ? '#34d399' : '#f87171' }}>
                      {prod.disponible ? 'DISPONIBLE' : 'AGOTADO'}
                    </span>
                    <button
                      onClick={() => toggleProducto(prod.id)}
                      style={{
                        background: prod.disponible ? '#10b981' : '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Power size={16} /> {prod.disponible ? 'Marcar Agotado' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'finanzas' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Cuadre de Caja Diario (Ledger Inmutable)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>TOTAL VENTAS DÍA</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>$43.50</div>
              </div>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>EN EFECTIVO (REPARTIDOR)</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#fbbf24', marginTop: '4px' }}>$22.00</div>
              </div>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>DIGITAL / TRANSFERENCIA</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>$21.50</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
