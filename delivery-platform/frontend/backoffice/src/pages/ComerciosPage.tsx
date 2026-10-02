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
  Edit3
} from 'lucide-react';

interface Comercio {
  id: string;
  nombre_comercial: string;
  descripcion: string;
  direccion: string;
  lat: number;
  lon: number;
  is_abierto: boolean;
  telefono: string;
  categoria: string;
  tiempo_entrega_promedio: number;
  costo_base_envio: string | number;
}

interface ComerciosPageProps {
  apiBaseUrl?: string;
}

export default function ComerciosPage({
  apiBaseUrl = 'http://localhost:8080/api/v1',
}: ComerciosPageProps) {
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState<'all' | 'baba' | 'babahoyo'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingComercioId, setEditingComercioId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState('Restaurante');
  const [formPhone, setFormPhone] = useState('+5939');
  const [formCity, setFormCity] = useState<'baba' | 'babahoyo'>('baba');
  const [formLat, setFormLat] = useState(-1.7917);
  const [formLon, setFormLon] = useState(-79.6783);
  const [formBaseFee, setFormBaseFee] = useState(1.50);
  const [formPrepTime, setFormPrepTime] = useState(30);

  const fetchComercios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercios`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setComercios(data.data);
      }
    } catch (err) {
      console.error('Error cargando comercios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComercios();
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
    setFormPhone(c.telefono || '+5939');
    setFormLat(c.lat || -1.7917);
    setFormLon(c.lon || -79.6783);
    setFormCity(c.direccion.toLowerCase().includes('babahoyo') ? 'babahoyo' : 'baba');
    setFormBaseFee(Number(c.costo_base_envio || 1.50));
    setFormPrepTime(Number(c.tiempo_entrega_promedio || 30));
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

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEditing = Boolean(editingComercioId);
      const url = isEditing
        ? `${apiBaseUrl}/catalog/comercio/${editingComercioId}`
        : `${apiBaseUrl}/catalog/comercios`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreComercial: formName.trim(),
          descripcion: formDesc.trim(),
          direccion: formAddress.trim(),
          lat: Number(formLat),
          lon: Number(formLon),
          categoria: formCategory,
          telefono: formPhone.trim(),
          costoBaseEnvio: Number(formBaseFee),
          tiempoEntregaPromedio: Number(formPrepTime),
          ...(isEditing ? {} : { isAbierto: true }),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar comercio en base de datos.');
      }

      setSuccessMsg(
        isEditing
          ? `¡Local "${data.data.nombre_comercial}" actualizado con éxito!`
          : `¡Local "${data.data.nombre_comercial}" registrado con éxito!`
      );
      setShowModal(false);
      resetForm();
      fetchComercios();
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
    setFormPhone('+5939');
    setCoordinatesBaba();
    setFormBaseFee(1.50);
    setFormPrepTime(30);
  };

  const filteredComercios = comercios.filter(c => {
    const matchesSearch =
      c.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (cityFilter === 'baba') {
      return (
        c.direccion.toLowerCase().includes('baba') ||
        Math.abs(c.lat - -1.7917) < 0.05
      );
    }
    if (cityFilter === 'babahoyo') {
      return (
        c.direccion.toLowerCase().includes('babahoyo') ||
        Math.abs(c.lat - -1.8022) < 0.05
      );
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Gestión de Locales y Comercios
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Administra restaurantes, asaderos y pizzerías con geolocalización PostGIS en Los Ríos.
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
            placeholder="Buscar por nombre, categoría o dirección..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'baba', 'babahoyo'] as const).map(key => (
            <button
              key={key}
              onClick={() => setCityFilter(key)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: cityFilter === key ? '#e11d48' : '#334155',
                background: cityFilter === key ? '#e11d48' : '#1e293b',
                color: cityFilter === key ? '#fff' : '#94a3b8',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {key === 'all' && 'Todos los Locales'}
              {key === 'baba' && '📍 Baba (Piloto)'}
              {key === 'babahoyo' && '📍 Babahoyo (Expansión)'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Comercios */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          Cargando red de locales comerciales...
        </div>
      ) : filteredComercios.length === 0 ? (
        <div style={{
          background: '#0f172a',
          padding: '48px',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          textAlign: 'center',
          color: '#94a3b8',
        }}>
          <Store size={40} style={{ margin: '0 auto 12px auto', color: '#64748b' }} />
          <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 6px 0' }}>No se encontraron comercios</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Intenta cambiando los términos de búsqueda o registra un nuevo local.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredComercios.map((comercio) => (
            <div
              key={comercio.id}
              style={{
                background: '#0f172a',
                borderRadius: '18px',
                border: '1px solid #1e293b',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    color: '#38bdf8',
                  }}>
                    {comercio.categoria || 'Restaurante'}
                  </span>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: comercio.is_abierto ? '#064e3b' : '#450a0a',
                    color: comercio.is_abierto ? '#6ee7b7' : '#f87171',
                  }}>
                    {comercio.is_abierto ? '● ABIERTO AL PÚBLICO' : '○ CERRADO'}
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
                  {comercio.nombre_comercial}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  {comercio.descripcion || 'Sin descripción disponible.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={15} color="#e11d48" />
                    <span>{comercio.direccion}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={15} color="#10b981" />
                    <span>{comercio.telefono}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="#f59e0b" /> ~{comercio.tiempo_entrega_promedio} min
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DollarSign size={14} color="#38bdf8" /> Envío: ${Number(comercio.costo_base_envio || 1.5).toFixed(2)}
                    </span>
                  </div>
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
                  PostGIS: {Number(comercio.lat).toFixed(4)}, {Number(comercio.lon).toFixed(4)}
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
          ))}
        </div>
      )}

      {/* Modal Registrar Nuevo Local */}
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
            maxWidth: '560px',
            maxHeight: '90vh',
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
                    Categoría
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
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
                    <option value="Restaurante">Restaurante Típico</option>
                    <option value="Comida Rápida">Comida Rápida / Burgers</option>
                    <option value="Pizzería">Pizzería</option>
                    <option value="Marisquería">Marisquería</option>
                    <option value="Cafetería y Postres">Cafetería y Postres</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+593987654321"
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

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Dirección Física Completa *
                </label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Calle, intersección o sector de referencia"
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

              {/* Botones rápidos de Geoposición */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Ciudad y Coordenadas Geográficas (PostGIS)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={setCoordinatesBaba}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: formCity === 'baba' ? '#e11d48' : '#1e293b',
                      color: '#fff',
                      border: '1px solid #334155',
                      fontWeight: '700',
                      fontSize: '12px',
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
                      padding: '8px',
                      borderRadius: '8px',
                      background: formCity === 'babahoyo' ? '#e11d48' : '#1e293b',
                      color: '#fff',
                      border: '1px solid #334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    📍 Babahoyo Centro (-1.8022, -79.5344)
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input
                    type="number"
                    step="0.0001"
                    value={formLat}
                    onChange={(e) => setFormLat(parseFloat(e.target.value))}
                    placeholder="Latitud"
                    style={{
                      padding: '8px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={formLon}
                    onChange={(e) => setFormLon(parseFloat(e.target.value))}
                    placeholder="Longitud"
                    style={{
                      padding: '8px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Costo Base Envío ($)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={formBaseFee}
                    onChange={(e) => setFormBaseFee(parseFloat(e.target.value))}
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
                    Tiempo Cocina Promedio (min)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(parseInt(e.target.value, 10))}
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
                  ) : editingComercioId ? (
                    'Guardar Cambios del Local'
                  ) : (
                    'Guardar Local en PostGIS'
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
