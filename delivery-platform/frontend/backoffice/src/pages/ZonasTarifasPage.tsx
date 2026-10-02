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
  AlertCircle
} from 'lucide-react';

interface ZonaConfig {
  id: string;
  nombre: string;
  codigo: string;
  canton: string;
  tarifaBase: number;
  costoKmAdicional: number;
  tiempoEstimadoMin: number;
  activa: boolean;
  descripcion?: string;
  color?: string;
}

const ZONAS_FALLBACK: ZonaConfig[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111101',
    nombre: 'Baba Centro y Casco Urbano',
    codigo: 'baba_centro',
    canton: 'Baba',
    tarifaBase: 1.25,
    costoKmAdicional: 0.35,
    tiempoEstimadoMin: 15,
    activa: true,
    descripcion: 'Zona urbana central: Parque Central, San Antonio, Av. Guayaquil y casco comercial.',
    color: '#10b981',
  },
  {
    id: 'a1111111-1111-1111-1111-111111111102',
    nombre: 'Recintos Rurales Baba (La Nobleza, Guare, Isla de Bejucal)',
    codigo: 'baba_rural',
    canton: 'Baba',
    tarifaBase: 2.00,
    costoKmAdicional: 0.50,
    tiempoEstimadoMin: 35,
    activa: true,
    descripcion: 'Recinto La Carmela, El Noblecillo, Vía Salitre y sectores periurbanos de Baba.',
    color: '#f59e0b',
  },
  {
    id: 'a1111111-1111-1111-1111-111111111103',
    nombre: 'Babahoyo Zona Urbana y Comercial',
    codigo: 'babahoyo_centro',
    canton: 'Babahoyo',
    tarifaBase: 1.50,
    costoKmAdicional: 0.40,
    tiempoEstimadoMin: 25,
    activa: true,
    descripcion: 'Centro de Babahoyo, Malecón 9 de Octubre, By Pass y Universidad Técnica.',
    color: '#38bdf8',
  },
  {
    id: 'a1111111-1111-1111-1111-111111111104',
    nombre: 'Corredor Intercantonal Baba - Babahoyo (Vía E484)',
    codigo: 'corredor_e484',
    canton: 'Intercantonal',
    tarifaBase: 3.50,
    costoKmAdicional: 0.60,
    tiempoEstimadoMin: 45,
    activa: true,
    descripcion: 'Envío interurbano por carretera principal entre los dos cantones piloto.',
    color: '#ec4899',
  },
];

const ZONE_COLORS: Record<string, string> = {
  baba_centro: '#10b981',
  baba_rural: '#f59e0b',
  babahoyo_centro: '#38bdf8',
  corredor_e484: '#ec4899',
};

export default function ZonasTarifasPage() {
  const [zonas, setZonas] = useState<ZonaConfig[]>(ZONAS_FALLBACK);
  const [selectedZona, setSelectedZona] = useState<ZonaConfig>(ZONAS_FALLBACK[0]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Simulador de flete
  const [distanciaSimulada, setDistanciaSimulada] = useState<number>(2.5);
  const [esNocturno, setEsNocturno] = useState(false);
  const [esLluvia, setEsLluvia] = useState(false);

  // Cargar zonas desde backend
  const fetchZonas = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/tracking/zonas');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const mapped: ZonaConfig[] = data.data.map((z: any) => ({
            id: z.id,
            nombre: z.nombre,
            codigo: z.codigo,
            canton: z.canton,
            tarifaBase: z.tarifaBase,
            costoKmAdicional: z.costoKmAdicional,
            tiempoEstimadoMin: z.tiempoEstimadoMin,
            activa: z.activa,
            color: ZONE_COLORS[z.codigo] || '#6366f1',
            descripcion: ZONAS_FALLBACK.find(f => f.codigo === z.codigo)?.descripcion || `Zona de entrega autorizada en cantón ${z.canton}.`,
          }));
          setZonas(mapped);
          setSelectedZona(mapped[0]);
        }
      }
    } catch (err) {
      console.warn('Usando zonas locales por fallback');
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
      const res = await fetch(`/api/v1/tracking/zonas/${zonaId}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setZonas(prev =>
            prev.map(z => z.id === zonaId ? { ...z, activa: data.data.activa } : z)
          );
          if (selectedZona.id === zonaId) {
            setSelectedZona(prev => ({ ...prev, activa: data.data.activa }));
          }
        }
      }
    } catch (err) {
      console.error('Error toggling zone', err);
    } finally {
      setTogglingId(null);
    }
  };

  // Cálculo de tarifa dinámica
  const calcularFlete = () => {
    const tarifaBase = selectedZona.tarifaBase;
    const distancia = Math.max(0, distanciaSimulada);
    const distanciaBase = 2.0;

    let extraKm = 0;
    if (distancia > distanciaBase) {
      extraKm = distancia - distanciaBase;
    }

    const subtotalExtra = extraKm * selectedZona.costoKmAdicional;
    const recargoNoc = esNocturno ? 0.50 : 0.00;
    const recargoLlu = esLluvia ? 0.75 : 0.00;

    return +(tarifaBase + subtotalExtra + recargoNoc + recargoLlu).toFixed(2);
  };

  const fleteCalculado = calcularFlete();
  const comisionPlataforma = 0.50;
  const gananciaRepartidor = Math.max(0, +(fleteCalculado - comisionPlataforma).toFixed(2));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Zonas de Cobertura PostGIS y Tarifas Dinámicas
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Configuración geoespacial de polígonos de entrega, fletes base y recargos operativos en Los Ríos.
          </p>
        </div>
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
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Sincronizar Zonas PostGIS
        </button>
      </div>

      {/* Grid de Zonas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {zonas.map((z) => {
          const isSelected = selectedZona.id === z.id;
          const isToggling = togglingId === z.id;
          return (
            <div
              key={z.id}
              onClick={() => setSelectedZona(z)}
              style={{
                background: '#0f172a',
                borderRadius: '16px',
                border: '2px solid',
                borderColor: isSelected ? z.color : '#1e293b',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: z.activa ? 1 : 0.6,
                boxShadow: isSelected ? `0 0 20px ${z.color}33` : 'none',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: z.color,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: `${z.color}22`,
                }}>
                  {z.canton.toUpperCase()}
                </span>
                
                {/* Botón de activación rápida */}
                <button
                  onClick={(e) => handleToggleZona(e, z.id)}
                  disabled={isToggling}
                  title={z.activa ? 'Zona Activa - Clic para desactivar' : 'Zona Inactiva - Clic para activar'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: z.activa ? '#10b981' : '#94a3b8',
                    background: z.activa ? '#10b98122' : '#33415544',
                    border: `1px solid ${z.activa ? '#10b98155' : '#475569'}`,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                  }}
                >
                  <Power size={11} />
                  {z.activa ? 'Activa' : 'Inactiva'}
                </button>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
                {z.nombre}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                {z.descripcion}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Tarifa Base</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>
                    ${z.tarifaBase.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Km Extra</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1' }}>
                    +${z.costoKmAdicional.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulador Interactivo de Cotización de Flete */}
      <div style={{
        background: '#0f172a',
        borderRadius: '20px',
        border: '1px solid #1e293b',
        padding: '28px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: selectedZona.color, marginBottom: '8px' }}>
            <Compass size={20} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
              Simulador de Tarifa: {selectedZona.nombre}
            </h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>
            Ajusta la distancia en kilómetros y los factores climáticos/horarios para ver la cotización que recibirá el cliente en tiempo real.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
                <span>Distancia estimada de entrega:</span>
                <strong style={{ color: '#fff' }}>{distanciaSimulada.toFixed(1)} km</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max={selectedZona.codigo === 'corredor_e484' ? '30' : '10'}
                step="0.1"
                value={distanciaSimulada}
                onChange={(e) => setDistanciaSimulada(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#e11d48', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: esNocturno ? '#1e293b' : '#131e33',
                borderRadius: '10px',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={esNocturno}
                  onChange={(e) => setEsNocturno(e.target.checked)}
                />
                🌙 Recargo Nocturno (+$0.50)
              </label>

              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: esLluvia ? '#1e293b' : '#131e33',
                borderRadius: '10px',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={esLluvia}
                  onChange={(e) => setEsLluvia(e.target.checked)}
                />
                🌧️ Clima Lluvioso (+$0.75)
              </label>
            </div>
          </div>
        </div>

        {/* Resumen del Flete Desglosado */}
        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
              Cotización Final de Envío
            </div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#10b981', marginBottom: '16px' }}>
              ${fleteCalculado.toFixed(2)} USD
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tarifa Base Zona ({selectedZona.canton}):</span>
                <span>${selectedZona.tarifaBase.toFixed(2)}</span>
              </div>
              {distanciaSimulada > 2.0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                  <span>Km Excedentes ({(distanciaSimulada - 2.0).toFixed(1)} km):</span>
                  <span>+${((distanciaSimulada - 2.0) * selectedZona.costoKmAdicional).toFixed(2)}</span>
                </div>
              )}
              {esNocturno && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
                  <span>Suplemento Horario Nocturno:</span>
                  <span>+$0.50</span>
                </div>
              )}
              {esLluvia && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ec4899' }}>
                  <span>Suplemento Clima Adverso:</span>
                  <span>+$0.75</span>
                </div>
              )}
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Ingreso Repartidor:</span>{' '}
              <strong style={{ color: '#6ee7b7' }}>${gananciaRepartidor.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Comisión Plataforma:</span>{' '}
              <strong style={{ color: '#f87171' }}>${comisionPlataforma.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
