import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Bike,
  Store,
  UserCheck,
  UserX,
  Edit3,
  Phone,
  Mail,
  Calendar,
  Lock,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';

export interface UserItem {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: 'cliente' | 'repartidor' | 'comercio' | 'admin';
  estado_activo: boolean;
  comercio_id?: string;
  comercio_nombre?: string;
  fecha_creacion: string;
}

interface UsuariosPageProps {
  apiBaseUrl?: string;
}

export default function UsuariosPage({
  apiBaseUrl = 'http://localhost:8080/api/v1',
}: UsuariosPageProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [comerciosList, setComerciosList] = useState<{ id: string; nombre_comercial: string; direccion: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'cliente' | 'repartidor' | 'comercio' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formTelefono, setFormTelefono] = useState('+5939');
  const [formRol, setFormRol] = useState<'cliente' | 'repartidor' | 'comercio' | 'admin'>('cliente');
  const [formComercioId, setFormComercioId] = useState('');
  const [formActivo, setFormActivo] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/users`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComerciosList = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercios/admin`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setComerciosList(data.data);
      }
    } catch (err) {
      console.error('Error cargando comercios para asignación:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchComerciosList();
  }, []);

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFormNombre('');
    setFormEmail('');
    setFormPassword('');
    setFormTelefono('+5939');
    setFormRol('cliente');
    setFormComercioId('');
    setFormActivo(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleEditClick = (u: UserItem) => {
    setEditingUserId(u.id);
    setFormNombre(u.nombre);
    setFormEmail(u.email);
    setFormPassword(''); // blank means don't change
    setFormTelefono(u.telefono || '+5939');
    setFormRol(u.rol);
    setFormComercioId(u.comercio_id || '');
    setFormActivo(u.estado_activo);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleToggleEstado = async (userId: string, currentActivo: boolean) => {
    try {
      const res = await fetch(`${apiBaseUrl}/users/${userId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_activo: !currentActivo }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, estado_activo: !currentActivo } : u))
        );
        setSuccessMsg(`Estado del usuario actualizado a ${!currentActivo ? 'ACTIVO' : 'SUSPENDIDO'}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message || 'Error al cambiar estado.');
      }
    } catch (err) {
      setErrorMsg('Error de red al actualizar estado.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formEmail.trim()) {
      setErrorMsg('Nombre y correo electrónico son requeridos.');
      return;
    }

    if (!editingUserId && !formPassword.trim()) {
      setErrorMsg('La contraseña es requerida para nuevos usuarios.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEditing = Boolean(editingUserId);
      const url = isEditing
        ? `${apiBaseUrl}/users/${editingUserId}`
        : `${apiBaseUrl}/users`;
      const method = isEditing ? 'PUT' : 'POST';

      const bodyData: any = {
        nombre: formNombre.trim(),
        email: formEmail.trim().toLowerCase(),
        telefono: formTelefono.trim(),
        rol: formRol,
        estado_activo: formActivo,
        comercio_id: formRol === 'comercio' && formComercioId ? formComercioId : null,
      };

      if (formPassword.trim()) {
        bodyData.password = formPassword.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al procesar usuario.');
      }

      setSuccessMsg(
        isEditing
          ? `Usuario "${data.data.nombre}" actualizado con éxito.`
          : `Usuario "${data.data.nombre}" registrado con éxito.`
      );
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar usuario.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.telefono || '').includes(searchTerm);

    if (!matchesSearch) return false;

    if (roleFilter !== 'all' && u.rol !== roleFilter) return false;

    if (statusFilter === 'active' && !u.estado_activo) return false;
    if (statusFilter === 'suspended' && u.estado_activo) return false;

    return true;
  });

  const countByRole = {
    cliente: users.filter(u => u.rol === 'cliente').length,
    repartidor: users.filter(u => u.rol === 'repartidor').length,
    comercio: users.filter(u => u.rol === 'comercio').length,
    admin: users.filter(u => u.rol === 'admin').length,
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'admin':
        return {
          icon: <Shield size={14} />,
          label: 'ADMINISTRADOR',
          bg: '#7f1d1d',
          color: '#fca5a5',
          border: '#ef4444',
        };
      case 'comercio':
        return {
          icon: <Store size={14} />,
          label: 'COMERCIO / LOCAL',
          bg: '#1e1b4b',
          color: '#c7d2fe',
          border: '#6366f1',
        };
      case 'repartidor':
        return {
          icon: <Bike size={14} />,
          label: 'REPARTIDOR MOTORIZADO',
          bg: '#064e3b',
          color: '#6ee7b7',
          border: '#10b981',
        };
      case 'cliente':
      default:
        return {
          icon: <Users size={14} />,
          label: 'CLIENTE FINAL',
          bg: '#0c2340',
          color: '#38bdf8',
          border: '#0284c7',
        };
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Directorio Central de Usuarios y Permisos
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Control de identidades, roles de acceso y suspensión de cuentas para Los Ríos (Baba & Babahoyo).
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
          <UserPlus size={18} /> Registrar Nuevo Usuario
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

      {/* Métricas de Roles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div
          onClick={() => setRoleFilter(roleFilter === 'cliente' ? 'all' : 'cliente')}
          style={{
            background: roleFilter === 'cliente' ? '#0c2a4d' : '#0f172a',
            padding: '18px',
            borderRadius: '14px',
            border: `1px solid ${roleFilter === 'cliente' ? '#38bdf8' : '#1e293b'}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontSize: '13px', fontWeight: '700' }}>
            <span>CLIENTES</span>
            <Users size={16} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginTop: '8px' }}>
            {countByRole.cliente}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Cuentas para pedidos
          </div>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'repartidor' ? 'all' : 'repartidor')}
          style={{
            background: roleFilter === 'repartidor' ? '#063726' : '#0f172a',
            padding: '18px',
            borderRadius: '14px',
            border: `1px solid ${roleFilter === 'repartidor' ? '#10b981' : '#1e293b'}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontSize: '13px', fontWeight: '700' }}>
            <span>REPARTIDORES</span>
            <Bike size={16} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginTop: '8px' }}>
            {countByRole.repartidor}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Flota motorizada activa
          </div>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'comercio' ? 'all' : 'comercio')}
          style={{
            background: roleFilter === 'comercio' ? '#1e1b4b' : '#0f172a',
            padding: '18px',
            borderRadius: '14px',
            border: `1px solid ${roleFilter === 'comercio' ? '#818cf8' : '#1e293b'}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', fontSize: '13px', fontWeight: '700' }}>
            <span>COMERCIOS</span>
            <Store size={16} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginTop: '8px' }}>
            {countByRole.comercio}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Restaurantes y aliados
          </div>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
          style={{
            background: roleFilter === 'admin' ? '#450a0a' : '#0f172a',
            padding: '18px',
            borderRadius: '14px',
            border: `1px solid ${roleFilter === 'admin' ? '#f87171' : '#1e293b'}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171', fontSize: '13px', fontWeight: '700' }}>
            <span>ADMINISTRADORES</span>
            <Shield size={16} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginTop: '8px' }}>
            {countByRole.admin}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Control maestro de sistema
          </div>
        </div>
      </div>

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
            placeholder="Buscar por nombre, correo o teléfono..."
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

        {/* Filtro por Rol */}
        <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '10px' }}>
          {(['all', 'cliente', 'repartidor', 'comercio', 'admin'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                background: roleFilter === role ? '#e11d48' : 'transparent',
                color: roleFilter === role ? '#fff' : '#94a3b8',
                textTransform: 'capitalize',
              }}
            >
              {role === 'all' ? 'Todos los Roles' : role}
            </button>
          ))}
        </div>

        {/* Filtro por Estado */}
        <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '10px' }}>
          {(['all', 'active', 'suspended'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                background: statusFilter === st ? '#3b82f6' : 'transparent',
                color: statusFilter === st ? '#fff' : '#94a3b8',
              }}
            >
              {st === 'all' && 'Todos'}
              {st === 'active' && 'Activos'}
              {st === 'suspended' && 'Suspendidos'}
            </button>
          ))}
        </div>

        <button
          onClick={fetchUsers}
          title="Refrescar lista"
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#cbd5e1',
            padding: '10px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Lista / Tarjetas de Usuarios */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#e11d48' }} />
          <p>Cargando directorio de usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#0f172a',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          color: '#94a3b8',
        }}>
          <Users size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 6px 0' }}>No se encontraron usuarios</h3>
          <p style={{ fontSize: '14px', margin: 0 }}>Intenta ajustar los filtros de búsqueda o registra un nuevo usuario.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '18px' }}>
          {filteredUsers.map(user => {
            const badge = getRoleBadge(user.rol);
            return (
              <div
                key={user.id}
                style={{
                  background: '#0f172a',
                  border: `1px solid ${user.estado_activo ? '#1e293b' : '#7f1d1d'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  opacity: user.estado_activo ? 1 : 0.75,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}>
                      {badge.icon} {badge.label}
                    </span>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: user.estado_activo ? '#064e3b' : '#450a0a',
                      color: user.estado_activo ? '#6ee7b7' : '#f87171',
                    }}>
                      {user.estado_activo ? '● ACTIVO' : '○ SUSPENDIDO'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 8px 0' }}>
                    {user.nombre}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={15} color="#38bdf8" />
                      <span style={{ color: '#cbd5e1' }}>{user.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={15} color="#10b981" />
                      <span style={{ color: '#cbd5e1' }}>{user.telefono || 'Sin teléfono'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={15} color="#a855f7" />
                      <span>Registrado: {new Date(user.fecha_creacion).toLocaleDateString('es-EC')}</span>
                    </div>

                    {user.rol === 'comercio' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#1e1b4b',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #3730a3',
                        marginTop: '4px'
                      }}>
                        <Store size={15} color="#818cf8" />
                        <span style={{ color: '#c7d2fe', fontWeight: '700', fontSize: '12px' }}>
                          {user.comercio_nombre ? `Local: ${user.comercio_nombre}` : 'Sin local asignado'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    ID: {user.id.substring(0, 8)}...
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditClick(user)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #38bdf844',
                        background: '#0c2340',
                        color: '#38bdf8',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={13} /> Editar
                    </button>

                    <button
                      onClick={() => handleToggleEstado(user.id, user.estado_activo)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #334155',
                        background: user.estado_activo ? '#1e293b' : '#064e3b',
                        color: user.estado_activo ? '#f87171' : '#6ee7b7',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {user.estado_activo ? <UserX size={13} /> : <UserCheck size={13} />}
                      {user.estado_activo ? 'Suspender' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Usuario */}
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
                {editingUserId ? 'Editar Datos de Usuario' : 'Registrar Nuevo Usuario'}
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

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Nombre y Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Darwin Vera Mendoza"
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
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ej: darwin@delivery.com"
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
                  {editingUserId ? 'Nueva Contraseña (dejar en blanco para conservar)' : 'Contraseña Inicial *'}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUserId ? '••••••••' : 'Mínimo 6 caracteres'}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Rol de Usuario *
                  </label>
                  <select
                    value={formRol}
                    onChange={(e: any) => setFormRol(e.target.value)}
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
                    <option value="cliente">Cliente Final</option>
                    <option value="repartidor">Repartidor Motorizado</option>
                    <option value="comercio">Comercio / Restaurante</option>
                    <option value="admin">Administrador Backoffice</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
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
              </div>

              {formRol === 'comercio' && (
                <div style={{ background: '#1e1b4b', padding: '14px', borderRadius: '12px', border: '1px solid #4338ca' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#c7d2fe' }}>
                    🏪 Local Comercial Asignado
                  </label>
                  <select
                    value={formComercioId}
                    onChange={(e) => setFormComercioId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #6366f1',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">-- Sin local asignado por ahora --</option>
                    {comerciosList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_comercial} ({c.direccion})
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#a5b4fc' }}>
                    Al asignar este local, el usuario podrá acceder directamente al panel del comercio y gestionar la cocina.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="userActivo"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <label htmlFor="userActivo" style={{ fontSize: '14px', color: '#cbd5e1', cursor: 'pointer' }}>
                  Cuenta activa y autorizada para operar en la plataforma
                </label>
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editingUserId ? (
                    'Guardar Cambios'
                  ) : (
                    'Registrar Usuario'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
