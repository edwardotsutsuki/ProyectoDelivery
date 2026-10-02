import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  Power,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  Edit3,
  User,
  CreditCard,
  Building,
  FileText,
  UserCheck,
  UserX,
  Mail,
  ShieldCheck,
  Check,
  Ban
} from 'lucide-react';

export interface Comercio {
  id: string;
  usuario_id?: string;
  usuario_email?: string;
  usuario_nombre?: string;
  usuario_telefono?: string;
  nombre_comercial: string;
  descripcion: string;
  direccion: string;
  lat: number;
  lon: number;
  is_abierto: boolean;
  telefono: string;
  categoria: string;
  tipo_comercio_id?: string;
  tipo_comercio_nombre?: string;
  tipo_comercio_icono?: string;
  maneja_inventario_general?: boolean;
  tiempo_entrega_promedio: number;
  costo_base_envio: string | number;
  calificacion?: string | number;
  ruc?: string;
  razon_social?: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  titular_cuenta?: string;
  estado_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo?: string;
  fecha_solicitud?: string;
  fecha_aprobacion?: string;
}

interface ComerciosPageProps {
  apiBaseUrl?: string;
}

export default function ComerciosPage({
  apiBaseUrl = 'http://localhost:8080/api/v1',
}: ComerciosPageProps) {
  const [activeTab, setActiveTab] = useState<'todos' | 'solicitudes'>('todos');
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [solicitudes, setSolicitudes] = useState<Comercio[]>([]);
  const [merchantUsers, setMerchantUsers] = useState<{ id: string; nombre: string; email: string }[]>([]);
  const [verticales, setVerticales] = useState<{ id: string; nombre: string; icono: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState<'all' | 'baba' | 'babahoyo'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aprobado' | 'pendiente' | 'rechazado'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingComercioId, setEditingComercioId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingComercioId, setRejectingComercioId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Form State - Negocio & Vertical
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState('Restaurante');
  const [formTipoComercioId, setFormTipoComercioId] = useState('restaurante');
  const [formManejaInventario, setFormManejaInventario] = useState(false);
  const [formPhone, setFormPhone] = useState('+5939');
  const [formCity, setFormCity] = useState<'baba' | 'babahoyo'>('baba');
  const [formLat, setFormLat] = useState(-1.7917);
  const [formLon, setFormLon] = useState(-79.6783);
  const [formBaseFee, setFormBaseFee] = useState(1.50);
  const [formPrepTime, setFormPrepTime] = useState(30);

  // Form State - Fiscal & Bancario
  const [formRuc, setFormRuc] = useState('');
  const [formRazonSocial, setFormRazonSocial] = useState('');
  const [formBanco, setFormBanco] = useState('Banco Pichincha');
  const [formTipoCuenta, setFormTipoCuenta] = useState('ahorros');
  const [formNumeroCuenta, setFormNumeroCuenta] = useState('');
  const [formTitularCuenta, setFormTitularCuenta] = useState('');

  // Form State - Usuario / Credenciales
  const [formCrearUsuario, setFormCrearUsuario] = useState(true);
  const [formUsuarioNombre, setFormUsuarioNombre] = useState('');
  const [formUsuarioEmail, setFormUsuarioEmail] = useState('');
  const [formUsuarioPassword, setFormUsuarioPassword] = useState('');
  const [formUsuarioTelefono, setFormUsuarioTelefono] = useState('+5939');
  const [formUsuarioId, setFormUsuarioId] = useState('');

  const fetchComercios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercios/admin`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setComercios(data.data);
      }
      // Cargar tipos de comercio / verticales
      fetch(`${apiBaseUrl}/catalog/tipos-comercio`).then(r => r.json()).then(d => {
        if (d.success && Array.isArray(d.data)) setVerticales(d.data);
      }).catch(() => {});
    } catch (err) {
      console.error('Error cargando comercios:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolicitudes = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercios/solicitudes`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSolicitudes(data.data);
      }
    } catch (err) {
      console.error('Error cargando solicitudes de comercios:', err);
    }
  };

  const fetchMerchantUsers = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/users?rol=comercio`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMerchantUsers(data.data);
      }
    } catch (err) {
      console.error('Error cargando usuarios con rol comercio:', err);
    }
  };

  useEffect(() => {
    fetchComercios();
    fetchSolicitudes();
    fetchMerchantUsers();
  }, []);

  const handleToggleEstado = async (comercioId: string, currentAbierto: boolean) => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercio/${comercioId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAbierto: !currentAbierto }),
      });
      const data = await res.json();
      if (data.success) {
        setComercios(prev =>
          prev.map(c => (c.id === comercioId ? { ...c, is_abierto: !currentAbierto } : c))
        );
      }
    } catch (err) {
      console.error('Error cambiando estado de comercio:', err);
    }
  };

  const handleAprobarSolicitud = async (comercioId: string) => {
    if (!window.confirm('¿Confirmas la aprobación y activación inmediata de este restaurante?')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercio/${comercioId}/aprobar`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`¡Local "${data.data.nombre_comercial}" aprobado y activado con éxito!`);
        fetchComercios();
        fetchSolicitudes();
      } else {
        setErrorMsg(data.message || 'Error al aprobar solicitud');
      }
    } catch (err) {
      setErrorMsg('Error de comunicación al aprobar solicitud');
    }
  };

  const handleOpenReject = (comercioId: string) => {
    setRejectingComercioId(comercioId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingComercioId) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercio/${rejectingComercioId}/rechazar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRechazo: rejectReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Solicitud rechazada correctamente.');
        setShowRejectModal(false);
        setRejectingComercioId(null);
        setRejectReason('');
        fetchComercios();
        fetchSolicitudes();
      } else {
        setErrorMsg(data.message || 'Error al rechazar solicitud');
      }
    } catch (err) {
      setErrorMsg('Error de red al procesar rechazo');
    } finally {
      setRejectLoading(false);
    }
  };

  const setCoordinatesBaba = () => {
    setFormCity('baba');
    setFormLat(-1.7917);
    setFormLon(-79.6783);
    if (!formAddress) setFormAddress('Centro de Baba, Calle Guayaquil y Sucre');
  };

  const setCoordinatesBabahoyo = () => {
    setFormCity('babahoyo');
    setFormLat(-1.8022);
    setFormLon(-79.5344);
    if (!formAddress) setFormAddress('Av. 9 de Octubre y Malecón, Babahoyo');
  };

  const handleOpenCreate = () => {
    setEditingComercioId(null);
    resetForm();
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleEditClick = (c: Comercio) => {
    setEditingComercioId(c.id);
    setFormName(c.nombre_comercial);
    setFormDesc(c.descripcion || '');
    setFormAddress(c.direccion);
    setFormCategory(c.categoria || 'Restaurante');
    setFormTipoComercioId(c.tipo_comercio_id || 'restaurante');
    setFormManejaInventario(Boolean(c.maneja_inventario_general));
    setFormPhone(c.telefono || '+5939');
    setFormLat(c.lat);
    setFormLon(c.lon);
    setFormCity(c.direccion.toLowerCase().includes('babahoyo') ? 'babahoyo' : 'baba');
    setFormBaseFee(Number(c.costo_base_envio || 1.50));
    setFormPrepTime(Number(c.tiempo_entrega_promedio || 30));

    setFormRuc(c.ruc || '');
    setFormRazonSocial(c.razon_social || '');
    setFormBanco(c.banco || 'Banco Pichincha');
    setFormTipoCuenta(c.tipo_cuenta || 'ahorros');
    setFormNumeroCuenta(c.numero_cuenta || '');
    setFormTitularCuenta(c.titular_cuenta || '');

    setFormUsuarioId(c.usuario_id || '');
    setFormCrearUsuario(false);
    setFormUsuarioNombre(c.usuario_nombre || '');
    setFormUsuarioEmail(c.usuario_email || '');
    setFormUsuarioPassword('');
    setFormUsuarioTelefono(c.usuario_telefono || '+5939');

    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleSaveComercio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAddress.trim()) {
      setErrorMsg('Nombre comercial y dirección son requeridos.');
      return;
    }

    if (!editingComercioId && formCrearUsuario) {
      if (!formUsuarioEmail.trim() || !formUsuarioPassword.trim()) {
        setErrorMsg('El correo de acceso y la contraseña son obligatorios para generar el usuario.');
        return;
      }
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEditing = Boolean(editingComercioId);
      const url = isEditing
        ? `${apiBaseUrl}/catalog/comercio/${editingComercioId}`
        : `${apiBaseUrl}/catalog/comercios`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload: any = {
        nombreComercial: formName.trim(),
        descripcion: formDesc.trim(),
        direccion: formAddress.trim(),
        lat: Number(formLat),
        lon: Number(formLon),
        categoria: formCategory,
        tipoComercioId: formTipoComercioId,
        manejaInventarioGeneral: formManejaInventario,
        telefono: formPhone.trim(),
        costoBaseEnvio: Number(formBaseFee),
        tiempoEntregaPromedio: Number(formPrepTime),
        ruc: formRuc.trim() || null,
        razonSocial: formRazonSocial.trim() || null,
        banco: formBanco.trim() || null,
        tipoCuenta: formTipoCuenta || 'ahorros',
        numeroCuenta: formNumeroCuenta.trim() || null,
        titularCuenta: formTitularCuenta.trim() || null,
      };

      if (isEditing) {
        if (formUsuarioId) payload.usuarioId = formUsuarioId;
      } else {
        payload.isAbierto = true;
        payload.crearUsuario = formCrearUsuario;
        if (formCrearUsuario) {
          payload.usuarioNombre = formUsuarioNombre.trim() || formName.trim();
          payload.usuarioEmail = formUsuarioEmail.trim().toLowerCase();
          payload.usuarioPassword = formUsuarioPassword.trim();
          payload.usuarioTelefono = formUsuarioTelefono.trim() || formPhone.trim();
        } else if (formUsuarioId) {
          payload.usuarioId = formUsuarioId;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar comercio en base de datos.');
      }

      setSuccessMsg(
        isEditing
          ? `¡Local "${data.data.nombre_comercial}" actualizado con éxito!`
          : `¡Local "${data.data.nombre_comercial}" registrado con éxito${formCrearUsuario ? ' junto a sus credenciales de acceso' : ''}!`
      );
      setShowModal(false);
      resetForm();
      fetchComercios();
      fetchSolicitudes();
      fetchMerchantUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de comunicación.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormAddress('');
    setFormCategory('Restaurante');
    setFormTipoComercioId('restaurante');
    setFormManejaInventario(false);
    setFormPhone('+5939');
    setCoordinatesBaba();
    setFormBaseFee(1.50);
    setFormPrepTime(30);

    setFormRuc('');
    setFormRazonSocial('');
    setFormBanco('Banco Pichincha');
    setFormTipoCuenta('ahorros');
    setFormNumeroCuenta('');
    setFormTitularCuenta('');

    setFormCrearUsuario(true);
    setFormUsuarioNombre('');
    setFormUsuarioEmail('');
    setFormUsuarioPassword('');
    setFormUsuarioTelefono('+5939');
    setFormUsuarioId('');
  };

  const filteredComercios = comercios.filter(c => {
    const matchesSearch =
      c.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ruc || '').includes(searchTerm);

    if (!matchesSearch) return false;

    if (cityFilter === 'baba') {
      if (!c.direccion.toLowerCase().includes('baba') && Math.abs(c.lat - -1.7917) >= 0.05) return false;
    } else if (cityFilter === 'babahoyo') {
      if (!c.direccion.toLowerCase().includes('babahoyo') && Math.abs(c.lat - -1.8022) >= 0.05) return false;
    }

    if (statusFilter !== 'all') {
      const actualStatus = c.estado_aprobacion || 'aprobado';
      if (actualStatus !== statusFilter) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Gestión de Locales y Afiliaciones
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Administra restaurantes, credenciales de comerciantes y aprueba nuevas solicitudes de afiliación en Los Ríos.
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
          <Plus size={18} /> Registrar Nuevo Local
        </button>
      </div>

      {/* Pestañas de Navegación: Locales Activos vs Solicitudes de Afiliación */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
        <button
          onClick={() => setActiveTab('todos')}
          style={{
            background: activeTab === 'todos' ? '#e11d48' : '#0f172a',
            color: '#fff',
            border: `1px solid ${activeTab === 'todos' ? '#e11d48' : '#1e293b'}`,
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Store size={18} /> Todos los Locales ({comercios.length})
        </button>

        <button
          onClick={() => setActiveTab('solicitudes')}
          style={{
            background: activeTab === 'solicitudes' ? '#e11d48' : '#0f172a',
            color: '#fff',
            border: `1px solid ${activeTab === 'solicitudes' ? '#e11d48' : '#1e293b'}`,
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <ShieldCheck size={18} /> Solicitudes de Afiliación
          {solicitudes.length > 0 && (
            <span style={{
              background: activeTab === 'solicitudes' ? '#fff' : '#ef4444',
              color: activeTab === 'solicitudes' ? '#e11d48' : '#fff',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: '800',
            }}>
              {solicitudes.length} PENDIENTES
            </span>
          )}
        </button>
      </div>

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

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          color: '#fca5a5',
          padding: '12px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PESTAÑA 1: SOLICITUDES DE AFILIACIÓN PENDIENTES */}
      {activeTab === 'solicitudes' && (
        <div>
          {solicitudes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#0f172a',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              color: '#94a3b8',
            }}>
              <ShieldCheck size={48} color="#10b981" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
              <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 6px 0' }}>No hay solicitudes de afiliación pendientes</h3>
              <p style={{ fontSize: '14px', margin: 0 }}>
                Todos los restaurantes que se han registrado están revisados y aprobados.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {solicitudes.map(sol => (
                <div
                  key={sol.id}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 }}>
                          {sol.nombre_comercial}
                        </h3>
                        <span style={{
                          background: '#fef3c7',
                          color: '#b45309',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '6px'
                        }}>
                          PENDIENTE DE REVISIÓN
                        </span>
                        <span style={{
                          background: '#1e293b',
                          color: '#94a3b8',
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}>
                          {sol.categoria}
                        </span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                        📍 {sol.direccion}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleAprobarSolicitud(sol.id)}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 18px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <Check size={16} /> Aprobar y Activar
                      </button>

                      <button
                        onClick={() => handleOpenReject(sol.id)}
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 18px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Ban size={16} /> Rechazar
                      </button>
                    </div>
                  </div>

                  {/* Detalle en 3 Columnas: Fiscal, Contacto y Banco */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                    background: '#1e293b',
                    padding: '16px',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}>
                    <div>
                      <strong style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Building size={14} color="#38bdf8" /> Datos Fiscales
                      </strong>
                      <div style={{ color: '#cbd5e1' }}>RUC/Cédula: <strong>{sol.ruc || 'No proporcionado'}</strong></div>
                      <div style={{ color: '#94a3b8' }}>Razón: {sol.razon_social || sol.nombre_comercial}</div>
                    </div>

                    <div>
                      <strong style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <User size={14} color="#a855f7" /> Encargado / Acceso
                      </strong>
                      <div style={{ color: '#cbd5e1' }}>{sol.usuario_nombre || 'Representante'}</div>
                      <div style={{ color: '#94a3b8' }}>📧 {sol.usuario_email || 'Sin email'}</div>
                      <div style={{ color: '#94a3b8' }}>📱 {sol.usuario_telefono || sol.telefono}</div>
                    </div>

                    <div>
                      <strong style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <CreditCard size={14} color="#10b981" /> Liquidaciones (Banco)
                      </strong>
                      <div style={{ color: '#cbd5e1' }}>{sol.banco || 'Banco por definir'}</div>
                      <div style={{ color: '#94a3b8' }}>Cta: {sol.numero_cuenta || 'S/N'} ({sol.tipo_cuenta || 'ahorros'})</div>
                      <div style={{ color: '#94a3b8' }}>Titular: {sol.titular_cuenta || sol.usuario_nombre}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: TODOS LOS LOCALES */}
      {activeTab === 'todos' && (
        <>
          {/* Controles de Búsqueda y Filtros */}
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
                placeholder="Buscar por nombre, categoría, dirección o RUC..."
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

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCityFilter('all')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${cityFilter === 'all' ? '#e11d48' : '#334155'}`,
                  background: cityFilter === 'all' ? '#e11d48' : '#1e293b',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Todos los Cantones
              </button>
              <button
                onClick={() => setCityFilter('baba')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${cityFilter === 'baba' ? '#e11d48' : '#334155'}`,
                  background: cityFilter === 'baba' ? '#e11d48' : '#1e293b',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📍 Baba Centro
              </button>
              <button
                onClick={() => setCityFilter('babahoyo')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${cityFilter === 'babahoyo' ? '#e11d48' : '#334155'}`,
                  background: cityFilter === 'babahoyo' ? '#e11d48' : '#1e293b',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📍 Babahoyo
              </button>
            </div>
          </div>

          {/* Grid de Locales Comerciales */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Cargando lista de comercios...</p>
            </div>
          ) : filteredComercios.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#0f172a',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              color: '#94a3b8',
            }}>
              <Store size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
              <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 6px 0' }}>No se encontraron locales</h3>
              <p style={{ fontSize: '14px', margin: 0 }}>Intenta ajustar los filtros de búsqueda o registra un nuevo local.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {filteredComercios.map((comercio) => {
                const status = comercio.estado_aprobacion || 'aprobado';
                return (
                  <div
                    key={comercio.id}
                    style={{
                      background: '#0f172a',
                      borderRadius: '18px',
                      border: `1px solid ${comercio.is_abierto ? '#1e293b' : '#334155'}`,
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{
                          background: '#ffe4e6',
                          color: '#e11d48',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          {comercio.tipo_comercio_icono || '🍔'} {comercio.tipo_comercio_nombre || comercio.categoria || 'Restaurante'}
                        </span>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: status === 'aprobado' ? '#064e3b' : status === 'pendiente' ? '#78350f' : '#450a0a',
                            color: status === 'aprobado' ? '#34d399' : status === 'pendiente' ? '#fcd34d' : '#f87171',
                          }}>
                            {status === 'aprobado' ? 'APROBADO' : status === 'pendiente' ? 'PENDIENTE' : 'RECHAZADO'}
                          </span>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: comercio.is_abierto ? '#064e3b' : '#334155',
                            color: comercio.is_abierto ? '#34d399' : '#94a3b8',
                          }}>
                            {comercio.is_abierto ? '● ABIERTO' : '○ CERRADO'}
                          </span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
                        {comercio.nombre_comercial}
                      </h3>

                      {comercio.descripcion && (
                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                          {comercio.descripcion}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color="#e11d48" />
                          <span style={{ color: '#cbd5e1' }}>{comercio.direccion}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#10b981" />
                          <span>{comercio.telefono}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#38bdf8" />
                          <span>Tiempo estimado: ~{comercio.tiempo_entrega_promedio} min</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <DollarSign size={14} color="#f59e0b" />
                          <span>Flete base: ${Number(comercio.costo_base_envio).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Usuario Encargado Vinculado */}
                      <div style={{
                        marginTop: '12px',
                        background: '#1e293b',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <User size={14} color="#a855f7" />
                        <div>
                          <span style={{ color: '#cbd5e1', fontWeight: '600' }}>Usuario de acceso: </span>
                          <span style={{ color: '#38bdf8' }}>{comercio.usuario_email || 'Sin usuario asignado'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      marginTop: '18px',
                      paddingTop: '14px',
                      borderTop: '1px solid #1e293b',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Coords: {Number(comercio.lat).toFixed(4)}, {Number(comercio.lon).toFixed(4)}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditClick(comercio)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#e2e8f0',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={13} /> Editar
                        </button>

                        <button
                          onClick={() => handleToggleEstado(comercio.id, comercio.is_abierto)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            background: comercio.is_abierto ? '#1e293b' : '#064e3b',
                            color: comercio.is_abierto ? '#f87171' : '#6ee7b7',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <Power size={13} /> {comercio.is_abierto ? 'Cerrar' : 'Abrir'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Registrar / Editar Local Comercial */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
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
            maxWidth: '620px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '28px',
            color: '#fff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                {editingComercioId ? 'Editar Local Comercial' : 'Registrar Nuevo Local Comercial'}
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

            <form onSubmit={handleSaveComercio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Sección 1: Datos del Establecimiento */}
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Información del Local Comercial
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Nombre Comercial del Local *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Asadero El Fogón Criollo"
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Descripción / Especialidad
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ej: Secos, asados al carbón y jugos naturales"
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Tipo de Comercio / Vertical *
                  </label>
                  <select
                    value={formTipoComercioId}
                    onChange={(e) => setFormTipoComercioId(e.target.value)}
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
                    {verticales.length > 0 ? (
                      verticales.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.icono} {v.nombre}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="restaurante">🍔 Restaurantes & Cafeterías</option>
                        <option value="supermercado">🛒 Supermercados & Abarrotes</option>
                        <option value="farmacia">💊 Farmacias & Salud</option>
                        <option value="licorera">🍾 Licores & Bebidas</option>
                        <option value="express">⚡ Tiendas Express & Antojos</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Especialidad / Subcategoría
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ej: Abarrotes, Mariscos, Bebidas..."
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

              {/* Checkbox de Inventario por Defecto */}
              <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formManejaInventario}
                    onChange={(e) => setFormManejaInventario(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  📦 Manejar inventario numérico por defecto en productos nuevos
                </label>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', marginLeft: '28px' }}>
                  {formManejaInventario
                    ? 'Recomendado para Supermercados, Farmacias y Licoreras con stock medido.'
                    : 'Recomendado para Restaurantes, comidas preparadas y negocios sin inventario digital (stock ilimitado).'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Teléfono del Local
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+5939..."
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

              {/* Botones de Selección Rápida de Ciudad */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Cantón / Zona Operativa *
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={setCoordinatesBaba}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${formCity === 'baba' ? '#e11d48' : '#334155'}`,
                      background: formCity === 'baba' ? '#881337' : '#1e293b',
                      color: '#fff',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    📍 Baba Centro (-1.7917, -79.6783)
                  </button>
                  <button
                    type="button"
                    onClick={setCoordinatesBabahoyo}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${formCity === 'babahoyo' ? '#e11d48' : '#334155'}`,
                      background: formCity === 'babahoyo' ? '#881337' : '#1e293b',
                      color: '#fff',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    📍 Babahoyo (-1.8022, -79.5344)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Dirección Detallada *
                </label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Calle principal e intersección..."
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Flete Base de Envío ($)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={formBaseFee}
                    onChange={(e) => setFormBaseFee(parseFloat(e.target.value) || 0)}
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Tiempo Promedio (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(parseInt(e.target.value, 10) || 30)}
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

              {/* Sección 2: Cuenta de Acceso y Credenciales */}
              <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  2. Credenciales de Acceso para el Dueño/Encargado
                </div>

                {!editingComercioId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', background: '#1e1b4b', padding: '10px 14px', borderRadius: '10px', border: '1px solid #4338ca' }}>
                    <input
                      type="checkbox"
                      id="toggleCrearUsuario"
                      checked={formCrearUsuario}
                      onChange={(e) => setFormCrearUsuario(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="toggleCrearUsuario" style={{ fontSize: '13px', fontWeight: '700', color: '#c7d2fe', cursor: 'pointer' }}>
                      Generar automáticamente usuario y contraseña para este restaurante
                    </label>
                  </div>
                )}

                {!editingComercioId && formCrearUsuario ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#111827', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                          Nombre del Encargado
                        </label>
                        <input
                          type="text"
                          value={formUsuarioNombre}
                          onChange={(e) => setFormUsuarioNombre(e.target.value)}
                          placeholder="Ej: Darwin Vargas"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff',
                            boxSizing: 'border-box',
                            fontSize: '13px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                          Teléfono de Contacto
                        </label>
                        <input
                          type="text"
                          value={formUsuarioTelefono}
                          onChange={(e) => setFormUsuarioTelefono(e.target.value)}
                          placeholder="+5939..."
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff',
                            boxSizing: 'border-box',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                          Correo de Acceso (Usuario) *
                        </label>
                        <input
                          type="email"
                          required={formCrearUsuario}
                          value={formUsuarioEmail}
                          onChange={(e) => setFormUsuarioEmail(e.target.value)}
                          placeholder="ejemplo@restaurante.com"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff',
                            boxSizing: 'border-box',
                            fontSize: '13px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                          Contraseña de Acceso *
                        </label>
                        <input
                          type="password"
                          required={formCrearUsuario}
                          value={formUsuarioPassword}
                          onChange={(e) => setFormUsuarioPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff',
                            boxSizing: 'border-box',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#94a3b8' }}>
                      Asignar a un Usuario Existente (Rol Comercio)
                    </label>
                    <select
                      value={formUsuarioId}
                      onChange={(e) => setFormUsuarioId(e.target.value)}
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
                      <option value="">-- Seleccionar usuario existente --</option>
                      {merchantUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sección 3: Datos Fiscales y Liquidación Bancaria */}
              <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  3. Datos Fiscales y Liquidaciones (Rappi/PedidosYa Model)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                      RUC o Cédula (SRI Ecuador)
                    </label>
                    <input
                      type="text"
                      value={formRuc}
                      onChange={(e) => setFormRuc(e.target.value)}
                      placeholder="1203456789001"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                      Razón Social Registrada
                    </label>
                    <input
                      type="text"
                      value={formRazonSocial}
                      onChange={(e) => setFormRazonSocial(e.target.value)}
                      placeholder="Ej: RESTAURANTE S.A."
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                      Banco de Liquidación
                    </label>
                    <select
                      value={formBanco}
                      onChange={(e) => setFormBanco(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                      }}
                    >
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Banco Guayaquil">Banco Guayaquil</option>
                      <option value="Banco Bolivariano">Banco Bolivariano</option>
                      <option value="Banco del Pacífico">Banco del Pacífico</option>
                      <option value="Produbanco">Produbanco</option>
                      <option value="Cooperativa JEP">Cooperativa JEP</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                      Tipo de Cuenta
                    </label>
                    <select
                      value={formTipoCuenta}
                      onChange={(e) => setFormTipoCuenta(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                      }}
                    >
                      <option value="ahorros">Cuenta de Ahorros</option>
                      <option value="corriente">Cuenta Corriente</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                      Número de Cuenta
                    </label>
                    <input
                      type="text"
                      value={formNumeroCuenta}
                      onChange={(e) => setFormNumeroCuenta(e.target.value)}
                      placeholder="Ej: 2100456789"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                      Titular de la Cuenta
                    </label>
                    <input
                      type="text"
                      value={formTitularCuenta}
                      onChange={(e) => setFormTitularCuenta(e.target.value)}
                      placeholder="Nombre del beneficiario"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
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
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Guardando...' : editingComercioId ? 'Actualizar Local' : 'Registrar Local Comercial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rechazar Solicitud */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #ef4444',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            color: '#fff',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f87171', margin: '0 0 8px 0' }}>
              Rechazar Solicitud de Afiliación
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
              Por favor indica el motivo por el cual no se aprueba esta solicitud (ej: RUC inactivo, local fuera de rango).
            </p>

            <form onSubmit={handleConfirmReject}>
              <textarea
                required
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Escribe el motivo del rechazo..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  marginBottom: '16px',
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
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
                  disabled={rejectLoading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: rejectLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {rejectLoading ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
