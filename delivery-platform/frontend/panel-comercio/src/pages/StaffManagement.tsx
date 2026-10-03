import { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, UserX, Shield, KeyRound, Eye, EyeOff, 
  Plus, Trash2, Edit2, CheckCircle2, AlertCircle, RefreshCw, 
  ChefHat, Package, DollarSign, Store, Phone, Search, X, Check
} from 'lucide-react';
import { config } from '../config';

export interface UsuarioComercio {
  id: string;
  comercio_id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  rol: 'admin' | 'cajero' | 'cocina' | 'picker' | string;
  pin_acceso: string;
  permisos: Record<string, boolean>;
  is_activo: boolean;
  ultimo_acceso?: string | null;
  created_at?: string;
}

interface StaffManagementProps {
  comercioId: string;
  isRetail?: boolean;
  canEdit?: boolean;
}

export default function StaffManagement({ comercioId, isRetail = false, canEdit = true }: StaffManagementProps) {
  const [usuarios, setUsuarios] = useState<UsuarioComercio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Filtros
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'cajero' | 'cocina' | 'picker'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  // Modal Crear/Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioComercio | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formRol, setFormRol] = useState<string>(isRetail ? 'cajero' : 'cajero');
  const [formPin, setFormPin] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Cargar usuarios desde la API
  const fetchUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsuarios(json.data);
      } else {
        throw new Error(json.message || 'Error al obtener usuarios');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (comercioId) {
      fetchUsuarios();
    }
  }, [comercioId]);

  // Mensaje temporal de éxito
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Toggle visibilidad de PIN
  const togglePinVisibility = (userId: string) => {
    setVisiblePins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Generador de PIN de 4 dígitos
  const generateRandomPin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(randomPin);
  };

  // Abrir Modal para Nuevo Usuario
  const handleOpenNew = () => {
    setEditingUser(null);
    setFormNombre('');
    setFormEmail('');
    setFormTelefono('');
    setFormRol(isRetail ? 'cajero' : 'cajero');
    setFormPin(Math.floor(1000 + Math.random() * 9000).toString());
    setFormActivo(true);
    setModalError(null);
    setModalOpen(true);
  };

  // Abrir Modal para Editar Usuario
  const handleOpenEdit = (user: UsuarioComercio) => {
    setEditingUser(user);
    setFormNombre(user.nombre);
    setFormEmail(user.email || '');
    setFormTelefono(user.telefono || '');
    setFormRol(user.rol);
    setFormPin(user.pin_acceso || '1234');
    setFormActivo(user.is_activo);
    setModalError(null);
    setModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setModalError('El nombre del colaborador es obligatorio.');
      return;
    }
    if (!formPin || formPin.trim().length < 4) {
      setModalError('El PIN debe tener al menos 4 números.');
      return;
    }

    setSaving(true);
    setModalError(null);

    const payload = {
      nombre: formNombre.trim(),
      email: formEmail.trim() || undefined,
      telefono: formTelefono.trim() || undefined,
      rol: formRol,
      pin_acceso: formPin.trim(),
      is_activo: formActivo,
      permisos: {
        administracion: formRol === 'admin',
        cobro_caja: formRol === 'admin' || formRol === 'cajero',
        pantalla_cocina: formRol === 'admin' || formRol === 'cocina',
        recoleccion_picking: formRol === 'admin' || formRol === 'picker',
      }
    };

    try {
      let res;
      if (editingUser) {
        // Actualizar
        res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Crear
        res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'No se pudo guardar el colaborador.');
      }

      showSuccess(editingUser ? 'Colaborador actualizado correctamente' : 'Nuevo colaborador registrado exitosamente');
      setModalOpen(false);
      fetchUsuarios();
    } catch (err: any) {
      setModalError(err.message || 'Error guardando usuario.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Activo/Inactivo
  const handleToggleActivo = async (user: UsuarioComercio) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios/${user.id}/toggle`, {
        method: 'PATCH'
      });
      const json = await res.json();
      if (json.success) {
        setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, is_activo: json.is_activo } : u));
        showSuccess(`Colaborador ${user.nombre} ahora está ${json.is_activo ? 'ACTIVO' : 'INACTIVO'}`);
      }
    } catch (err) {
      alert('Error cambiando estado del usuario');
    }
  };

  // Eliminar Colaborador
  const handleDeleteUser = async (user: UsuarioComercio) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${user.nombre}? Perderá el acceso de inmediato.`)) {
      return;
    }
    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/usuarios/${user.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setUsuarios(prev => prev.filter(u => u.id !== user.id));
        showSuccess(`Colaborador ${user.nombre} eliminado`);
      } else {
        alert(json.message || 'Error al eliminar');
      }
    } catch (err) {
      alert('Error eliminando colaborador');
    }
  };

  // Filtrado de usuarios
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u => {
      const matchesRole = filterRole === 'all' || u.rol === filterRole;
      const matchesSearch = !searchQuery.trim() || 
        u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.telefono && u.telefono.includes(searchQuery)) ||
        u.rol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [usuarios, filterRole, searchQuery]);

  // Formateador de rol badge
  const renderRoleBadge = (rol: string) => {
    switch (rol) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Shield size={12} /> Administrador
          </span>
        );
      case 'cajero':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <DollarSign size={12} /> Cajero / Cobros
          </span>
        );
      case 'cocina':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ChefHat size={12} /> Cocina / KDS
          </span>
        );
      case 'picker':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Package size={12} /> Picker / Percha
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300">
            {rol}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Users size={16} />
            <span>Gestión de Personal & Accesos del Local</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Equipo, Cajeros y {isRetail ? 'Pickers de Percha' : 'Personal de Cocina'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra los roles de tus trabajadores y sus PINs de 4 dígitos para cambio rápido en tableta o PC de mostrador.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenNew}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-rose-950 transition-all text-sm shrink-0"
          >
            <Plus size={18} />
            <span>Nuevo Colaborador</span>
          </button>
        )}
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm font-semibold animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-rose-950/80 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-sm font-semibold">
          <AlertCircle size={18} className="text-rose-400 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchUsuarios} className="ml-auto underline text-xs">Reintentar</button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
        {/* Pestañas de Roles */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterRole === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todos ({usuarios.length})
          </button>
          <button
            onClick={() => setFilterRole('cajero')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterRole === 'cajero'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign size={13} /> Cajeros ({usuarios.filter(u => u.rol === 'cajero').length})
          </button>
          {!isRetail ? (
            <button
              onClick={() => setFilterRole('cocina')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterRole === 'cocina'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ChefHat size={13} /> Cocina ({usuarios.filter(u => u.rol === 'cocina').length})
            </button>
          ) : (
            <button
              onClick={() => setFilterRole('picker')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterRole === 'picker'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package size={13} /> Pickers ({usuarios.filter(u => u.rol === 'picker').length})
            </button>
          )}
          <button
            onClick={() => setFilterRole('admin')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterRole === 'admin'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield size={13} /> Administradores ({usuarios.filter(u => u.rol === 'admin').length})
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o telf..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Listado de Colaboradores (Cards en Grid Responsivo) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <RefreshCw size={28} className="animate-spin text-rose-500" />
          <p className="text-sm">Cargando personal del comercio...</p>
        </div>
      ) : filteredUsuarios.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
          <Users size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-base font-bold text-slate-300">No se encontraron colaboradores</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Prueba con otro término de búsqueda o limpia los filtros.' : 'Comienza agregando cajeros o despachadores para que puedan operar en el local con su PIN.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsuarios.map(user => {
            const isPinVisible = !!visiblePins[user.id];
            return (
              <div 
                key={user.id} 
                className={`bg-slate-900/80 border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                  user.is_activo 
                    ? 'border-slate-800 hover:border-slate-700 shadow-md shadow-slate-950/50' 
                    : 'border-slate-800/40 opacity-70 bg-slate-900/30'
                }`}
              >
                <div>
                  {/* Top Bar del Card: Rol y Estado */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {renderRoleBadge(user.rol)}
                    <button
                      onClick={() => handleToggleActivo(user)}
                      title={user.is_activo ? 'Clic para desactivar' : 'Clic para activar'}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all border ${
                        user.is_activo
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/40'
                          : 'bg-rose-950/60 text-rose-400 border-rose-500/30 hover:bg-rose-900/40'
                      }`}
                    >
                      {user.is_activo ? <UserCheck size={11} /> : <UserX size={11} />}
                      <span>{user.is_activo ? 'ACTIVO' : 'INACTIVO'}</span>
                    </button>
                  </div>

                  {/* Nombre y Avatar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-black text-rose-400 text-lg shadow-inner">
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-white text-base truncate" title={user.nombre}>
                        {user.nombre}
                      </h3>
                      {user.telefono ? (
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                          <Phone size={11} className="text-slate-500" />
                          <span>{user.telefono}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Sin teléfono registrado</span>
                      )}
                    </div>
                  </div>

                  {/* PIN de Acceso Rápido */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <KeyRound size={11} className="text-amber-400" /> PIN de Pantalla
                      </div>
                      <div className="text-sm font-mono font-black text-white tracking-widest mt-0.5">
                        {isPinVisible ? user.pin_acceso : '••••'}
                      </div>
                    </div>
                    <button
                      onClick={() => togglePinVisibility(user.id)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title={isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}
                    >
                      {isPinVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Footer del Card: Último acceso y Botones */}
                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                  <div className="text-[11px] truncate max-w-[150px]">
                    {user.ultimo_acceso ? (
                      <span>Acceso: {new Date(user.ultimo_acceso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    ) : (
                      <span>Sin ingresos recientes</span>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar datos / PIN"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear / Editar Colaborador */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <h3 className="font-extrabold text-white text-base">
                  {editingUser ? 'Editar Colaborador' : 'Nuevo Colaborador'}
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="bg-rose-950/80 border border-rose-500/40 text-rose-300 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre Completo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Mendoza"
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Rol Adaptativo según el tipo de negocio */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Rol y Funciones en el Local <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formRol}
                  onChange={e => setFormRol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="cajero">💵 Cajero (Acepta pedidos, cobros y despacho)</option>
                  {!isRetail ? (
                    <option value="cocina">👨‍🍳 Personal de Cocina / KDS (Solo ve pedidos a preparar sin precios)</option>
                  ) : (
                    <option value="picker">📦 Picker / Bodeguero (Recolecta productos en percha y empaca)</option>
                  )}
                  <option value="admin">👑 Administrador / Encargado (Acceso completo y configuración)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {formRol === 'cocina' && 'Ideal para pantallas en el área de cocina sin acceso a montos ni dinero.'}
                  {formRol === 'picker' && 'Ideal para tiendas y supermercados para marcar ítems encontrados en percha.'}
                  {formRol === 'cajero' && 'Acceso a comanda, facturación, despacho y apertura/cierre de caja.'}
                  {formRol === 'admin' && 'Acceso total a catálogo, precios, colaboradores y reportes.'}
                </p>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Teléfono Móvil (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 0991234567"
                  value={formTelefono}
                  onChange={e => setFormTelefono(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* PIN de 4 dígitos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <KeyRound size={13} className="text-amber-400" /> PIN de Acceso Rápido (4 Dígitos) <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    🎲 Generar Aleatorio
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Ej: 1234"
                  value={formPin}
                  onChange={e => setFormPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono tracking-widest text-center text-white focus:outline-none focus:border-rose-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Se usa en la pantalla de mostrador para cambiar de turno sin escribir correos ni contraseñas.
                </p>
              </div>

              {/* Switch Activo */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300">¿Usuario Habilitado para Ingresar?</span>
                <button
                  type="button"
                  onClick={() => setFormActivo(!formActivo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formActivo ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formActivo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Botones de Acción */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingUser ? 'Guardar Cambios' : 'Registrar Colaborador'}</span>
                    </>
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
