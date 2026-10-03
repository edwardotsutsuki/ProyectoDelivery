import React, { useState, useEffect } from 'react';
import {
  Map,
  Compass,
  DollarSign,
  Layers,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Power,
  RefreshCw,
  AlertCircle,
  Edit3,
  Plus,
  X,
  Percent,
  Check,
  Building,
  UserCheck
} from 'lucide-react';

export interface ZonaTarifa {
  id: string;
  canton: string;
  zona_nombre: string;
  descripcion: string;
  radio_max_km: number | string;
  tarifa_envio: number | string;
  comision_repartidor_pct: number | string;
  comision_plataforma_pct: number | string;
  tarifa_servicio_cliente: number | string;
  tiempo_estimado_min: number;
  is_activa: boolean;
  orden?: number;
}

const ZONAS_FALLBACK: ZonaTarifa[] = [
  {
    id: 'c70d2909-51da-425f-b7a4-3ebc0105e7cd',
    canton: 'Baba',
    zona_nombre: 'Baba Urbano (Centro y Barrios)',
    descripcion: 'Casco urbano central, parque central, Barrio San Antonio, El Mamey, La Pista',
    radio_max_km: 2.50,
    tarifa_envio: 1.00,
    comision_repartidor_pct: 80.00,
    comision_plataforma_pct: 20.00,
    tarifa_servicio_cliente: 0.00,
    tiempo_estimado_min: 20,
    is_activa: true,
    orden: 1,
  },
  {
    id: '0e29cf68-5107-4a6e-b670-96ab2d55daf0',
    canton: 'Baba',
    zona_nombre: 'Baba Periferia y Sectores Cercanos',
    descripcion: 'Sectores periféricos a las afueras del cantón (Hasta 5.5 km)',
    radio_max_km: 5.50,
    tarifa_envio: 1.50,
    comision_repartidor_pct: 80.00,
    comision_plataforma_pct: 20.00,
    tarifa_servicio_cliente: 0.00,
    tiempo_estimado_min: 30,
    is_activa: true,
    orden: 2,
  },
  {
    id: '289d593c-7df1-4288-8e55-216252779646',
    canton: 'Baba',
    zona_nombre: 'Recintos y Zonas Rurales Baba',
    descripcion: 'Recintos más alejados (Arenillas, Guare, La Nobleza)',
    radio_max_km: 12.00,
    tarifa_envio: 2.50,
    comision_repartidor_pct: 84.00,
    comision_plataforma_pct: 16.00,
    tarifa_servicio_cliente: 0.25,
    tiempo_estimado_min: 45,
    is_activa: true,
    orden: 3,
  },
  {
    id: 'bb27bf12-7a2d-4080-800e-20b56ecff94a',
    canton: 'Babahoyo',
    zona_nombre: 'Babahoyo Urbano Central',
    descripcion: 'Centro de Babahoyo, Malecón 9 de Octubre, Terminal Terrestre',
    radio_max_km: 4.00,
    tarifa_envio: 1.50,
    comision_repartidor_pct: 80.00,
    comision_plataforma_pct: 20.00,
    tarifa_servicio_cliente: 0.00,
    tiempo_estimado_min: 25,
    is_activa: true,
    orden: 4,
  },
  {
    id: '01d77fca-f1ca-4258-97b9-31bdf8768d5b',
    canton: 'Babahoyo',
    zona_nombre: 'Babahoyo Periferia y El Salto',
    descripcion: 'Sectores periurbanos, El Salto, Puerta Negra, La Chorrera',
    radio_max_km: 7.00,
    tarifa_envio: 2.00,
    comision_repartidor_pct: 80.00,
    comision_plataforma_pct: 20.00,
    tarifa_servicio_cliente: 0.00,
    tiempo_estimado_min: 35,
    is_activa: true,
    orden: 5,
  }
];

export default function ZonasTarifasPage() {
  const [zonas, setZonas] = useState<ZonaTarifa[]>(ZONAS_FALLBACK);
  const [selectedZona, setSelectedZona] = useState<ZonaTarifa>(ZONAS_FALLBACK[0]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modal para Crear / Editar Zona
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCanton, setFormCanton] = useState('Baba');
  const [formZonaNombre, setFormZonaNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formTarifaEnvio, setFormTarifaEnvio] = useState<number>(1.00);
  const [formComisionRepartidorPct, setFormComisionRepartidorPct] = useState<number>(80.00);
  const [formComisionPlataformaPct, setFormComisionPlataformaPct] = useState<number>(20.00);
  const [formTarifaServicioCliente, setFormTarifaServicioCliente] = useState<number>(0.00);
  const [formRadioMaxKm, setFormRadioMaxKm] = useState<number>(3.00);
  const [formTiempoEstimadoMin, setFormTiempoEstimadoMin] = useState<number>(25);
  const [formIsActiva, setFormIsActiva] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Simulador Contable de Ganancia
  const [simMontoPedido, setSimMontoPedido] = useState<number>(12.00);
  const [simTipoComisionComercio, setSimTipoComisionComercio] = useState<'porcentaje' | 'fijo_por_orden' | 'suscripcion'>('porcentaje');
  const [simComisionComercioPct, setSimComisionComercioPct] = useState<number>(10.00);
  const [simComisionComercioFija, setSimComisionComercioFija] = useState<number>(0.40);

  // Cargar zonas desde backend real
  const fetchZonas = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/config/tarifas?all=true');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setZonas(data.data);
          const currentSelected = data.data.find((z: ZonaTarifa) => z.id === selectedZona.id) || data.data[0];
          setSelectedZona(currentSelected);
        }
      }
    } catch (err) {
      console.warn('Usando zonas de fallback para tarifas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZonas();
  }, []);

  const handleToggleZona = async (e: React.MouseEvent, zonaId: string) => {
    e.stopPropagation();
    try {
      setTogglingId(zonaId);
      const res = await fetch(`/api/v1/config/tarifas/${zonaId}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setZonas(prev =>
            prev.map(z => z.id === zonaId ? { ...z, is_activa: data.data.is_activa } : z)
          );
          if (selectedZona.id === zonaId) {
            setSelectedZona(prev => ({ ...prev, is_activa: data.data.is_activa }));
          }
        }
      }
    } catch (err) {
      console.error('Error toggling zone', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormCanton('Baba');
    setFormZonaNombre('');
    setFormDescripcion('');
    setFormTarifaEnvio(1.00);
    setFormComisionRepartidorPct(80.00);
    setFormComisionPlataformaPct(20.00);
    setFormTarifaServicioCliente(0.00);
    setFormRadioMaxKm(3.00);
    setFormTiempoEstimadoMin(25);
    setFormIsActiva(true);
    setStatusMsg(null);
    setShowModal(true);
  };

  const handleOpenEdit = (z: ZonaTarifa) => {
    setEditingId(z.id);
    setFormCanton(z.canton);
    setFormZonaNombre(z.zona_nombre);
    setFormDescripcion(z.descripcion || '');
    setFormTarifaEnvio(Number(z.tarifa_envio));
    setFormComisionRepartidorPct(Number(z.comision_repartidor_pct));
    setFormComisionPlataformaPct(Number(z.comision_plataforma_pct));
    setFormTarifaServicioCliente(Number(z.tarifa_servicio_cliente || 0));
    setFormRadioMaxKm(Number(z.radio_max_km));
    setFormTiempoEstimadoMin(z.tiempo_estimado_min);
    setFormIsActiva(z.is_activa);
    setStatusMsg(null);
    setShowModal(true);
  };

  const handleSaveZona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formZonaNombre.trim()) {
      setStatusMsg({ text: 'El nombre de la zona es obligatorio', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);
      const isEditing = Boolean(editingId);
      const url = isEditing
        ? `/api/v1/config/tarifas/${editingId}`
        : '/api/v1/config/tarifas';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canton: formCanton,
          zonaNombre: formZonaNombre.trim(),
          descripcion: formDescripcion.trim(),
          tarifaEnvio: Number(formTarifaEnvio),
          comisionRepartidorPct: Number(formComisionRepartidorPct),
          comisionPlataformaPct: Number(formComisionPlataformaPct),
          tarifaServicioCliente: Number(formTarifaServicioCliente),
          radioMaxKm: Number(formRadioMaxKm),
          tiempoEstimadoMin: Number(formTiempoEstimadoMin),
          isActiva: formIsActiva,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar la zona tarifaria');
      }

      setShowModal(false);
      fetchZonas();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error de conexión', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Cálculos de simulación contable
  const tarifaEnvioActual = Number(selectedZona.tarifa_envio);
  const tarifaServicioActual = Number(selectedZona.tarifa_servicio_cliente || 0);
  const totalCliente = Number((simMontoPedido + tarifaEnvioActual + tarifaServicioActual).toFixed(2));

  // Comisión comercio
  let comisionComercioTotal = 0;
  if (simTipoComisionComercio === 'porcentaje') {
    comisionComercioTotal = Number(((simMontoPedido * simComisionComercioPct) / 100).toFixed(2));
  } else if (simTipoComisionComercio === 'fijo_por_orden') {
    comisionComercioTotal = simComisionComercioFija;
  } else {
    comisionComercioTotal = 0; // Suscripción mensual ya pagada
  }

  const pagoNetoComercio = Number((simMontoPedido - comisionComercioTotal).toFixed(2));
  const gananciaRepartidor = Number(((tarifaEnvioActual * Number(selectedZona.comision_repartidor_pct)) / 100).toFixed(2));
  const comisionFletePlataforma = Number(((tarifaEnvioActual * Number(selectedZona.comision_plataforma_pct)) / 100).toFixed(2));
  const gananciaTotalPlataforma = Number((comisionComercioTotal + comisionFletePlataforma + tarifaServicioActual).toFixed(2));

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Tarifas Fijas y Reparto de Comisiones
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Configura tarifas de envío fijas por zona ($1.00 Baba / $1.50 Babahoyo) y splits de ganancia 100% editables.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchZonas}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#059669',
              color: '#fff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            }}
          >
            <Plus size={16} />
            Nueva Zona Tarifaria
          </button>
        </div>
      </div>

      {/* Grid de Zonas Tarifarias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {zonas.map((z) => {
          const isSelected = selectedZona.id === z.id;
          const isToggling = togglingId === z.id;
          const flete = Number(z.tarifa_envio).toFixed(2);
          const riderSplit = ((Number(z.tarifa_envio) * Number(z.comision_repartidor_pct)) / 100).toFixed(2);
          const platformSplit = ((Number(z.tarifa_envio) * Number(z.comision_plataforma_pct)) / 100).toFixed(2);
          const badgeColor = z.canton === 'Baba' ? '#10b981' : '#38bdf8';

          return (
            <div
              key={z.id}
              onClick={() => setSelectedZona(z)}
              style={{
                background: '#0f172a',
                borderRadius: '18px',
                border: '2px solid',
                borderColor: isSelected ? badgeColor : '#1e293b',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: z.is_activa ? 1 : 0.6,
                boxShadow: isSelected ? `0 0 20px ${badgeColor}33` : 'none',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: badgeColor,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: `${badgeColor}22`,
                }}>
                  CANTÓN {z.canton.toUpperCase()}
                </span>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(z);
                    }}
                    title="Editar tarifa"
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}
                  >
                    <Edit3 size={13} /> Editar
                  </button>

                  <button
                    onClick={(e) => handleToggleZona(e, z.id)}
                    disabled={isToggling}
                    style={{
                      background: z.is_activa ? '#064e3b' : '#334155',
                      color: z.is_activa ? '#34d399' : '#94a3b8',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {z.is_activa ? 'ACTIVA' : 'PAUSADA'}
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
                {z.zona_nombre}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 14px 0', lineHeight: 1.4, minHeight: '36px' }}>
                {z.descripcion || 'Cobertura estándar autorizada.'}
              </p>

              {/* Tarifa Fija y Desglose */}
              <div style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>TARIFA FIJA ENVÍO</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>${flete}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>TIEMPO ESTIMADO</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>~{z.tiempo_estimado_min} min</div>
                </div>
              </div>

              {/* Reparto Ledger / Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div style={{ background: '#092518', padding: '8px 10px', borderRadius: '8px', border: '1px solid #064e3b' }}>
                  <div style={{ color: '#34d399', fontWeight: '700' }}>Repartidor ({Number(z.comision_repartidor_pct)}%)</div>
                  <div style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>${riderSplit}</div>
                </div>
                <div style={{ background: '#172554', padding: '8px 10px', borderRadius: '8px', border: '1px solid #1e3a8a' }}>
                  <div style={{ color: '#60a5fa', fontWeight: '700' }}>Plataforma ({Number(z.comision_plataforma_pct)}%)</div>
                  <div style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>${platformSplit}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulador y Desglose Financiero */}
      <div style={{
        background: '#0f172a',
        borderRadius: '20px',
        border: '1px solid #1e293b',
        padding: '28px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <TrendingUp size={22} color="#10b981" />
          <h3 style={{ fontSize: '19px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Simulador de Liquidación Económica en Vivo ({selectedZona.canton} - {selectedZona.zona_nombre})
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
          {/* Controles de Simulación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#94a3b8' }}>
                Valor de la Orden en Productos ($)
              </label>
              <input
                type="number"
                step="0.50"
                value={simMontoPedido}
                onChange={(e) => setSimMontoPedido(Math.max(1, parseFloat(e.target.value) || 0))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '700',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#94a3b8' }}>
                Modelo de Comisión del Comercio
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSimTipoComisionComercio('porcentaje')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: simTipoComisionComercio === 'porcentaje' ? '2px solid #10b981' : '1px solid #334155',
                    background: simTipoComisionComercio === 'porcentaje' ? '#064e3b' : '#1e293b',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  % Porcentaje (10%)
                </button>
                <button
                  type="button"
                  onClick={() => setSimTipoComisionComercio('fijo_por_orden')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: simTipoComisionComercio === 'fijo_por_orden' ? '2px solid #10b981' : '1px solid #334155',
                    background: simTipoComisionComercio === 'fijo_por_orden' ? '#064e3b' : '#1e293b',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  $ Fijo ($0.40/orden)
                </button>
                <button
                  type="button"
                  onClick={() => setSimTipoComisionComercio('suscripcion')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: simTipoComisionComercio === 'suscripcion' ? '2px solid #10b981' : '1px solid #334155',
                    background: simTipoComisionComercio === 'suscripcion' ? '#064e3b' : '#1e293b',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  💎 Membresía ($15/mes)
                </button>
              </div>
            </div>

            <div style={{ background: '#1e293b', padding: '14px', borderRadius: '12px', fontSize: '13px', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Subtotal Comida:</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>${simMontoPedido.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Tarifa Fija de Envío ({selectedZona.zona_nombre}):</span>
                <span style={{ color: '#10b981', fontWeight: '700' }}>+${tarifaEnvioActual.toFixed(2)}</span>
              </div>
              {tarifaServicioActual > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Tarifa de Servicio App:</span>
                  <span style={{ color: '#38bdf8', fontWeight: '700' }}>+${tarifaServicioActual.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #334155', fontSize: '15px' }}>
                <span style={{ color: '#fff', fontWeight: '800' }}>Total a Pagar por Cliente:</span>
                <span style={{ color: '#34d399', fontWeight: '800' }}>${totalCliente.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Resultado de la Distribución Financiera */}
          <div style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            borderRadius: '16px',
            border: '1px solid #334155',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
              Desglose de Liquidación Instantánea
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Local */}
              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Comercio Local (Neto)</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Venta (${simMontoPedido.toFixed(2)}) - Comisión (${comisionComercioTotal.toFixed(2)})</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b' }}>
                    ${pagoNetoComercio.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Repartidor */}
              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Repartidor / Motorizado</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{Number(selectedZona.comision_repartidor_pct)}% del flete (${tarifaEnvioActual.toFixed(2)})</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
                    ${gananciaRepartidor.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Plataforma */}
              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Nuestra Plataforma (Ganancia Bruta)</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Comisión local (${comisionComercioTotal.toFixed(2)}) + Split flete (${comisionFletePlataforma.toFixed(2)})
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }}>
                    ${gananciaTotalPlataforma.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              ✓ Asiento contable registrado automáticamente en <code>transacciones_ledger</code> al entregar el pedido.
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Crear / Editar Zona */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                {editingId ? 'Editar Zona Tarifaria' : 'Nueva Zona Tarifaria'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {statusMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: '600',
                background: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: statusMsg.type === 'error' ? '#f87171' : '#34d399',
                border: `1px solid ${statusMsg.type === 'error' ? '#ef4444' : '#10b981'}`,
              }}>
                {statusMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveZona} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    Cantón
                  </label>
                  <select
                    value={formCanton}
                    onChange={(e) => setFormCanton(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Baba">Baba</option>
                    <option value="Babahoyo">Babahoyo</option>
                    <option value="Montalvo">Montalvo</option>
                    <option value="Vinces">Vinces</option>
                    <option value="Puebloviejo">Puebloviejo</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    Nombre de la Zona
                  </label>
                  <input
                    type="text"
                    value={formZonaNombre}
                    onChange={(e) => setFormZonaNombre(e.target.value)}
                    placeholder="Ej: Baba Urbano (Centro)"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                  Barrios o Sectores de Cobertura
                </label>
                <input
                  type="text"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Parque central, San Antonio, La Pista, etc."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Flete y Splits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    Tarifa Fija ($)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={formTarifaEnvio}
                    onChange={(e) => setFormTarifaEnvio(parseFloat(e.target.value) || 0)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#10b981',
                      fontWeight: '800',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    Repartidor (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formComisionRepartidorPct}
                    onChange={(e) => {
                      const rep = parseFloat(e.target.value) || 0;
                      setFormComisionRepartidorPct(rep);
                      setFormComisionPlataformaPct(Math.max(0, 100 - rep));
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#34d399',
                      fontWeight: '700',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    Plataforma (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formComisionPlataformaPct}
                    onChange={(e) => setFormComisionPlataformaPct(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontWeight: '700',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    Tiempo Estimado (min)
                  </label>
                  <input
                    type="number"
                    value={formTiempoEstimadoMin}
                    onChange={(e) => setFormTiempoEstimadoMin(parseInt(e.target.value) || 20)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    Radio Máximo (km)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formRadioMaxKm}
                    onChange={(e) => setFormRadioMaxKm(parseFloat(e.target.value) || 3)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="isActivaCheck"
                  checked={formIsActiva}
                  onChange={(e) => setFormIsActiva(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isActivaCheck" style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '600', cursor: 'pointer' }}>
                  Zona activa y visible para clientes al hacer checkout
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#059669',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar Zona Tarifaria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
