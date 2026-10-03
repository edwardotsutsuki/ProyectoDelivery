import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  Percent,
  Truck,
  Trash2,
  Edit2,
  RefreshCw,
  Power,
  X,
  Check,
  Tag,
  ShieldCheck,
  Store
} from 'lucide-react';

export interface CuponItem {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipo: 'porcentaje' | 'monto_fijo' | 'envio_gratis';
  valor: number;
  tope_descuento_maximo?: number | null;
  compra_minima: number;
  limite_usos_total?: number | null;
  usos_actuales: number;
  comercio_id?: string | null;
  comercio_nombre?: string;
  financiado_por: 'plataforma' | 'comercio' | 'compartido';
  fecha_inicio: string;
  fecha_fin: string;
  is_activo: boolean;
  created_at: string;
}

interface CuponesPageProps {
  apiBaseUrl?: string;
}

export default function CuponesPage({
  apiBaseUrl = 'http://localhost:8080/api/v1',
}: CuponesPageProps) {
  const [cupones, setCupones] = useState<CuponItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'porcentaje' | 'monto_fijo' | 'envio_gratis'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCupon, setEditingCupon] = useState<CuponItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formCodigo, setFormCodigo] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formTipo, setFormTipo] = useState<'porcentaje' | 'monto_fijo' | 'envio_gratis'>('porcentaje');
  const [formValor, setFormValor] = useState<number>(10);
  const [formTope, setFormTope] = useState<string>('2.50');
  const [formCompraMinima, setFormCompraMinima] = useState<number>(5.00);
  const [formLimiteUsos, setFormLimiteUsos] = useState<string>('500');
  const [formFinanciadoPor, setFormFinanciadoPor] = useState<'plataforma' | 'comercio' | 'compartido'>('plataforma');
  const [formFechaFin, setFormFechaFin] = useState<string>('2026-12-31');
  const [formActivo, setFormActivo] = useState(true);

  const fetchCupones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/promotions`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCupones(data.data);
      }
    } catch (err) {
      console.error('Error cargando cupones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCupones();
  }, []);

  const handleOpenCreate = () => {
    setEditingCupon(null);
    setFormCodigo('');
    setFormTitulo('');
    setFormDescripcion('');
    setFormTipo('porcentaje');
    setFormValor(10);
    setFormTope('2.50');
    setFormCompraMinima(6.00);
    setFormLimiteUsos('500');
    setFormFinanciadoPor('plataforma');
    setFormFechaFin('2026-12-31');
    setFormActivo(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (cup: CuponItem) => {
    setEditingCupon(cup);
    setFormCodigo(cup.codigo);
    setFormTitulo(cup.titulo);
    setFormDescripcion(cup.descripcion || '');
    setFormTipo(cup.tipo);
    setFormValor(Number(cup.valor));
    setFormTope(cup.tope_descuento_maximo ? String(cup.tope_descuento_maximo) : '');
    setFormCompraMinima(Number(cup.compra_minima));
    setFormLimiteUsos(cup.limite_usos_total ? String(cup.limite_usos_total) : '');
    setFormFinanciadoPor(cup.financiado_por);
    setFormFechaFin(cup.fecha_fin ? cup.fecha_fin.slice(0, 10) : '2026-12-31');
    setFormActivo(cup.is_activo);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleToggleEstado = async (cupId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/promotions/${cupId}/toggle`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        setCupones(prev =>
          prev.map(c => (c.id === cupId ? { ...c, is_activo: data.is_activo } : c))
        );
        setSuccessMsg(data.message || 'Estado actualizado');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert('Error cambiando estado del cupón');
    }
  };

  const handleDelete = async (cup: CuponItem) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el cupón "${cup.codigo}"?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/promotions/${cup.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCupones(prev => prev.filter(c => c.id !== cup.id));
        setSuccessMsg(`Cupón "${cup.codigo}" eliminado con éxito.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert('Error eliminando cupón');
    }
  };

  const handleSaveCupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo.trim() || !formTitulo.trim()) {
      setErrorMsg('El código y título del cupón son obligatorios.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const payload: any = {
      codigo: formCodigo.trim().toUpperCase(),
      titulo: formTitulo.trim(),
      descripcion: formDescripcion.trim(),
      tipo: formTipo,
      valor: formValor,
      tope_descuento_maximo: formTope.trim() ? parseFloat(formTope) : null,
      compra_minima: formCompraMinima,
      limite_usos_total: formLimiteUsos.trim() ? parseInt(formLimiteUsos, 10) : null,
      financiado_por: formFinanciadoPor,
      fecha_fin: new Date(formFechaFin).toISOString(),
      is_activo: formActivo,
    };

    try {
      const url = editingCupon
        ? `${apiBaseUrl}/promotions/${editingCupon.id}`
        : `${apiBaseUrl}/promotions`;
      const method = editingCupon ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error guardando cupón.');
      }

      setSuccessMsg(editingCupon ? `Cupón "${formCodigo}" actualizado con éxito.` : `Cupón "${formCodigo}" creado con éxito.`);
      setShowModal(false);
      fetchCupones();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando cupón.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCupones = cupones.filter(c => {
    const matchesSearch =
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.titulo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (typeFilter !== 'all' && c.tipo !== typeFilter) return false;
    if (statusFilter === 'active' && !c.is_activo) return false;
    if (statusFilter === 'inactive' && c.is_activo) return false;

    return true;
  });

  const totalUsos = cupones.reduce((acc, c) => acc + (c.usos_actuales || 0), 0);
  const cuponesActivosCount = cupones.filter(c => c.is_activo).length;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Campañas, Cupones & Promociones
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Control de códigos de descuento, fletes gratis y promociones patrocinadas para Baba y Babahoyo.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)',
          }}
        >
          <Plus size={18} /> Crear Nuevo Cupón
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          color: '#6ee7b7',
          padding: '12px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Métricas Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#0f172a', padding: '18px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f43f5e', fontSize: '13px', fontWeight: '700' }}>
            <span>CUPONES ACTIVOS</span>
            <Ticket size={16} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginTop: '8px' }}>
            {cuponesActivosCount}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Disponibles para canjear en la app
          </div>
        </div>

        <div style={{ background: '#0f172a', padding: '18px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '13px', fontWeight: '700' }}>
            <span>CANJES TOTALES</span>
            <Check size={16} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginTop: '8px' }}>
            {totalUsos} órdenes
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Pedidos con descuento aplicado
          </div>
        </div>

        <div style={{ background: '#0f172a', padding: '18px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontSize: '13px', fontWeight: '700' }}>
            <span>REPARTIDOR MOTORIZADO</span>
            <ShieldCheck size={16} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginTop: '8px' }}>
            100% Protegido
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            El descuento no le resta al flete del rider
          </div>
        </div>
      </div>

      {/* Controles y Búsqueda */}
      <div style={{
        background: '#0f172a',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código de cupón o título..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filtro Tipo */}
        <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setTypeFilter('all')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: typeFilter === 'all' ? '#e11d48' : 'transparent',
              color: typeFilter === 'all' ? '#fff' : '#94a3b8',
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('porcentaje')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: typeFilter === 'porcentaje' ? '#e11d48' : 'transparent',
              color: typeFilter === 'porcentaje' ? '#fff' : '#94a3b8',
            }}
          >
            % Porcentaje
          </button>
          <button
            onClick={() => setTypeFilter('monto_fijo')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: typeFilter === 'monto_fijo' ? '#e11d48' : 'transparent',
              color: typeFilter === 'monto_fijo' ? '#fff' : '#94a3b8',
            }}
          >
            $ Fijo
          </button>
          <button
            onClick={() => setTypeFilter('envio_gratis')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: typeFilter === 'envio_gratis' ? '#e11d48' : 'transparent',
              color: typeFilter === 'envio_gratis' ? '#fff' : '#94a3b8',
            }}
          >
            🛵 Envío Gratis
          </button>
        </div>

        <button
          onClick={fetchCupones}
          title="Refrescar"
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#cbd5e1',
            padding: '10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Grid de Tarjetas de Cupones */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#e11d48' }} />
          <p>Cargando promociones...</p>
        </div>
      ) : filteredCupones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', color: '#94a3b8' }}>
          <Ticket size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 6px 0' }}>No se encontraron cupones</h3>
          <p style={{ fontSize: '14px', margin: 0 }}>Crea tu primera promoción para empezar a atraer compradores.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '18px' }}>
          {filteredCupones.map(cup => (
            <div
              key={cup.id}
              style={{
                background: '#0f172a',
                border: `1px solid ${cup.is_activo ? '#1e293b' : '#7f1d1d'}`,
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                opacity: cup.is_activo ? 1 : 0.75,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #e11d48, #9f1239)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontWeight: '900',
                      fontSize: '13px',
                      letterSpacing: '1px',
                      fontFamily: 'monospace'
                    }}>
                      🎟️ {cup.codigo}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: cup.financiado_por === 'plataforma' ? '#064e3b' : cup.financiado_por === 'comercio' ? '#1e1b4b' : '#312e81',
                      color: cup.financiado_por === 'plataforma' ? '#6ee7b7' : '#c7d2fe',
                    }}>
                      {cup.financiado_por === 'plataforma' ? 'App Subsidia' : cup.financiado_por === 'comercio' ? 'Local Subsidia' : '50/50'}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: cup.is_activo ? '#064e3b' : '#450a0a',
                    color: cup.is_activo ? '#6ee7b7' : '#f87171',
                  }}>
                    {cup.is_activo ? '● ACTIVO' : '○ INACTIVO'}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
                  {cup.titulo}
                </h3>
                {cup.descripcion && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' }}>
                    {cup.descripcion}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#1e293b', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#cbd5e1' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 'bold' }}>DESCUENTO</span>
                    <strong style={{ color: '#38bdf8', fontSize: '14px' }}>
                      {cup.tipo === 'porcentaje' ? `${cup.valor}% OFF` : cup.tipo === 'envio_gratis' ? 'Flete $0.00' : `$${Number(cup.valor).toFixed(2)}`}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 'bold' }}>COMPRA MÍNIMA</span>
                    <strong style={{ color: '#fff', fontSize: '14px' }}>${Number(cup.compra_minima).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 'bold' }}>USOS REALIZADOS</span>
                    <strong style={{ color: '#10b981' }}>{cup.usos_actuales} {cup.limite_usos_total ? `/ ${cup.limite_usos_total}` : ''}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 'bold' }}>EXPIRA</span>
                    <span style={{ color: '#f59e0b' }}>{cup.fecha_fin ? new Date(cup.fecha_fin).toLocaleDateString('es-EC') : 'Sin límite'}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => handleToggleEstado(cup.id)}
                  style={{
                    background: cup.is_activo ? '#1e293b' : '#064e3b',
                    color: cup.is_activo ? '#f87171' : '#6ee7b7',
                    border: '1px solid #334155',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Power size={12} /> {cup.is_activo ? 'Desactivar' : 'Activar'}
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenEdit(cup)}
                    style={{
                      background: '#0c2340',
                      border: '1px solid #38bdf844',
                      color: '#38bdf8',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cup)}
                    style={{
                      background: '#450a0a',
                      border: '1px solid #ef4444',
                      color: '#f87171',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Cupón */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            color: '#fff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                {editingCupon ? `Editar Cupón "${formCodigo}"` : 'Crear Nuevo Cupón de Descuento'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '13px',
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Código del Cupón *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCupon}
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: BABA20"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#fff',
                      boxSizing: 'border-box',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Tipo de Promoción *
                  </label>
                  <select
                    value={formTipo}
                    onChange={(e: any) => setFormTipo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="porcentaje">Porcentaje (% OFF)</option>
                    <option value="monto_fijo">Monto Fijo ($ OFF)</option>
                    <option value="envio_gratis">Envío / Flete Gratis</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Título de la Oferta *
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ej: 10% de Descuento en Locales de Baba"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Valor ({formTipo === 'porcentaje' ? '%' : '$'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formValor}
                    onChange={(e) => setFormValor(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Tope Máx. Descuento ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formTope}
                    onChange={(e) => setFormTope(e.target.value)}
                    placeholder="Opcional (ej: 2.50)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Compra Mínima ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCompraMinima}
                    onChange={(e) => setFormCompraMinima(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    ¿Quién Financia el Descuento?
                  </label>
                  <select
                    value={formFinanciadoPor}
                    onChange={(e: any) => setFormFinanciadoPor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="plataforma">100% DeliveryYa (Campaña App)</option>
                    <option value="comercio">100% Comercio Aliado</option>
                    <option value="compartido">50% Plataforma / 50% Comercio</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Fecha de Expiración
                </label>
                <input
                  type="date"
                  value={formFechaFin}
                  onChange={(e) => setFormFechaFin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '10px',
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
                    flex: 2,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '800',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Guardando...' : editingCupon ? 'Guardar Cambios' : 'Crear Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
