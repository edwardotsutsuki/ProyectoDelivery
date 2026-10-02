import React, { useState, useEffect } from 'react';
import {
  Bike,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  Receipt,
  FileText,
  UserCheck,
  RefreshCw,
  Phone,
  MapPin,
  AlertTriangle,
  Wallet
} from 'lucide-react';

interface RepartidorFlota {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  ubicacion: {
    lat: number;
    lon: number;
  };
  saldoLedger: number;
  deudaEfectivo: number;
}

export default function FlotaCajaPage() {
  const [repartidores, setRepartidores] = useState<RepartidorFlota[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepartidor, setSelectedRepartidor] = useState<RepartidorFlota | null>(null);

  // Formulario modal de liquidación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [montoLiquidar, setMontoLiquidar] = useState('');
  const [comprobante, setComprobante] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertaMensaje, setAlertaMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const fetchFlota = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/ledger/repartidores-flota');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRepartidores(data.data);
        }
      }
    } catch (err) {
      console.error('Error al cargar flota de repartidores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlota();
  }, []);

  const abrirModalLiquidacion = (rep: RepartidorFlota) => {
    setSelectedRepartidor(rep);
    setMontoLiquidar(rep.deudaEfectivo > 0 ? rep.deudaEfectivo.toFixed(2) : '10.00');
    setComprobante(`DEP-${Date.now().toString().slice(-6)}`);
    setNotas('Liquidación de efectivo en oficina central Baba');
    setAlertaMensaje(null);
    setModalAbierto(true);
  };

  const handleLiquidarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepartidor) return;

    try {
      setSubmitting(true);
      setAlertaMensaje(null);

      const res = await fetch('/api/v1/ledger/liquidar-caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repartidorId: selectedRepartidor.id,
          monto: parseFloat(montoLiquidar),
          comprobante: comprobante.trim() || 'S/N',
          notas: notas.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAlertaMensaje({ tipo: 'ok', texto: 'Liquidación asentada en el ledger contable con éxito.' });
        await fetchFlota();
        setTimeout(() => {
          setModalAbierto(false);
        }, 1200);
      } else {
        setAlertaMensaje({ tipo: 'error', texto: data.message || 'Error al procesar la liquidación' });
      }
    } catch (err: any) {
      setAlertaMensaje({ tipo: 'error', texto: err.message || 'Error de conexión' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalDeudaFlota = repartidores.reduce((acc, r) => acc + r.deudaEfectivo, 0);

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Torre de Control de Flota y Cuadre de Caja
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Monitoreo en tiempo real de repartidores, cobranza en efectivo y liquidaciones inmutables de ledger en Baba y Babahoyo.
          </p>
        </div>
        <button
          onClick={fetchFlota}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar Flota
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Repartidores Registrados</span>
            <Bike size={20} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>{repartidores.length}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Motos activas en Los Ríos</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Efectivo en Calle (Flota)</span>
            <DollarSign size={20} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b' }}>${totalDeudaFlota.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Por liquidar a plataforma</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Límite de Caja Autorizado</span>
            <ShieldAlert size={20} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>$35.00</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Bloqueo preventivo al superar</div>
        </div>
      </div>

      {/* Tabla de Repartidores */}
      <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: '#cbd5e1', fontWeight: '700' }}>
              <th style={{ padding: '14px 20px' }}>Repartidor</th>
              <th style={{ padding: '14px 20px' }}>Contacto</th>
              <th style={{ padding: '14px 20px' }}>Zona Base</th>
              <th style={{ padding: '14px 20px' }}>Estado</th>
              <th style={{ padding: '14px 20px' }}>Saldo Deudor (Caja)</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {repartidores.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No hay repartidores registrados en el sistema.
                </td>
              </tr>
            ) : (
              repartidores.map((r) => {
                const tieneDeudaAlta = r.deudaEfectivo >= 25.0;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1e293b', color: '#f8fafc' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#38bdf822',
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Bike size={18} />
                        </div>
                        <div>
                          <strong style={{ display: 'block', color: '#fff' }}>{r.nombre}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{r.email}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                        <Phone size={13} color="#94a3b8" />
                        {r.telefono}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                        <MapPin size={13} color="#e11d48" />
                        Baba Centro (Lat: {r.ubicacion.lat.toFixed(4)})
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: r.activo ? '#10b98122' : '#f43f5e22',
                        color: r.activo ? '#10b981' : '#f43f5e',
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.activo ? '#10b981' : '#f43f5e' }}></span>
                        {r.activo ? 'Habilitado' : 'Suspendido'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div>
                        <strong style={{
                          fontSize: '15px',
                          color: tieneDeudaAlta ? '#f43f5e' : r.deudaEfectivo > 0 ? '#f59e0b' : '#10b981'
                        }}>
                          ${r.deudaEfectivo.toFixed(2)} USD
                        </strong>
                        {tieneDeudaAlta && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f43f5e', fontSize: '11px', marginTop: '2px' }}>
                            <AlertTriangle size={12} />
                            Alerta límite de caja
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => abrirModalLiquidacion(r)}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        <Receipt size={14} />
                        Liquidar Caja
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Liquidación de Caja */}
      {modalAbierto && selectedRepartidor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#0f172a',
            borderRadius: '20px',
            border: '1px solid #334155',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wallet size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                  Asentar Liquidación de Efectivo
                </h3>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLiquidarCaja} style={{ padding: '24px' }}>
              {alertaMensaje && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  background: alertaMensaje.tipo === 'ok' ? '#10b98122' : '#f43f5e22',
                  color: alertaMensaje.tipo === 'ok' ? '#10b981' : '#f43f5e',
                  border: `1px solid ${alertaMensaje.tipo === 'ok' ? '#10b98155' : '#f43f5e55'}`,
                }}>
                  {alertaMensaje.texto}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Repartidor
                </label>
                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                  {selectedRepartidor.nombre} ({selectedRepartidor.email})
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Monto Recibido en Físico ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoLiquidar}
                  onChange={(e) => setMontoLiquidar(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '700',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Número de Comprobante / Recibo Físico
                </label>
                <input
                  type="text"
                  value={comprobante}
                  onChange={(e) => setComprobante(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Notas de Auditoría
                </label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Asentando en Ledger...' : 'Confirmar Liquidación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
