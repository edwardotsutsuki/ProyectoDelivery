import React, { useState, useEffect } from 'react';
import {
  Layers,
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Store,
  Tag,
  ArrowUpDown,
  Sliders,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface CategoriaItem {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  orden: number;
  is_activo: boolean;
  total_productos?: number | string;
}

interface TipoComercioItem {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  tipo_layout: string;
  requiere_cocina: boolean;
  permite_recetas: boolean;
  control_edad_18: boolean;
  orden: number;
  is_activo: boolean;
}

interface ComercioItem {
  id: string;
  nombre_comercial: string;
  tipo_comercio_id?: string;
  tipo_comercio_nombre?: string;
  tipo_comercio_icono?: string;
  direccion: string;
}

interface CategoriasPageProps {
  apiBaseUrl?: string;
}

export default function CategoriasPage({
  apiBaseUrl = 'http://localhost:8080/api/v1',
}: CategoriasPageProps) {
  const [activeTab, setActiveTab] = useState<'categorias_locales' | 'verticales_plataforma'>('categorias_locales');

  // Comercios
  const [comercios, setComercios] = useState<ComercioItem[]>([]);
  const [selectedComercioId, setSelectedComercioId] = useState<string>('');

  // Categorías de Local
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [showModalCat, setShowModalCat] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoriaItem | null>(null);

  // Form Categoría
  const [formCatNombre, setFormCatNombre] = useState('');
  const [formCatDescripcion, setFormCatDescripcion] = useState('');
  const [formCatIcono, setFormCatIcono] = useState('🏷️');
  const [formCatOrden, setFormCatOrden] = useState<number>(1);
  const [formCatActivo, setFormCatActivo] = useState(true);

  // Verticales
  const [verticales, setVerticales] = useState<TipoComercioItem[]>([]);
  const [loadingVerticales, setLoadingVerticales] = useState(false);
  const [showModalVert, setShowModalVert] = useState(false);

  // Form Vertical
  const [formVertId, setFormVertId] = useState('');
  const [formVertNombre, setFormVertNombre] = useState('');
  const [formVertDescripcion, setFormVertDescripcion] = useState('');
  const [formVertIcono, setFormVertIcono] = useState('🏪');
  const [formVertLayout, setFormVertLayout] = useState('grid_ecommerce');
  const [formVertCocina, setFormVertCocina] = useState(false);
  const [formVertRecetas, setFormVertRecetas] = useState(false);
  const [formVertEdad18, setFormVertEdad18] = useState(false);
  const [formVertOrden, setFormVertOrden] = useState<number>(1);

  // Feedback general
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Cargar comercios y verticales al montar
  useEffect(() => {
    fetchComercios();
    fetchVerticales();
  }, [apiBaseUrl]);

  const fetchComercios = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercios/admin`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setComercios(data.data);
        if (!selectedComercioId) {
          setSelectedComercioId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando comercios:', err);
    }
  };

  const fetchVerticales = async () => {
    setLoadingVerticales(true);
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/tipos-comercio`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setVerticales(data.data);
      }
    } catch (err) {
      console.error('Error cargando verticales:', err);
    } finally {
      setLoadingVerticales(false);
    }
  };

  // 2. Cargar categorías al cambiar de comercio seleccionado
  useEffect(() => {
    if (!selectedComercioId) return;
    fetchCategorias(selectedComercioId);
  }, [selectedComercioId, apiBaseUrl]);

  const fetchCategorias = async (comercioId: string) => {
    setLoadingCategorias(true);
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercio/${comercioId}/categorias`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategorias(data.data);
      } else {
        setCategorias([]);
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    } finally {
      setLoadingCategorias(false);
    }
  };

  // Abrir modal nueva categoría
  const handleOpenNewCat = () => {
    setEditingCat(null);
    setFormCatNombre('');
    setFormCatDescripcion('');
    setFormCatIcono('🏷️');
    setFormCatOrden(categorias.length + 1);
    setFormCatActivo(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModalCat(true);
  };

  // Abrir modal editar categoría
  const handleOpenEditCat = (cat: CategoriaItem) => {
    setEditingCat(cat);
    setFormCatNombre(cat.nombre);
    setFormCatDescripcion(cat.descripcion || '');
    setFormCatIcono(cat.icono || '🏷️');
    setFormCatOrden(cat.orden || 1);
    setFormCatActivo(cat.is_activo);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModalCat(true);
  };

  // Guardar categoría (Crear o Editar)
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCatNombre.trim() || !selectedComercioId) {
      setErrorMsg('El nombre de la categoría es requerido.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let res;
      if (editingCat) {
        // Editar
        res = await fetch(`${apiBaseUrl}/catalog/categoria/${editingCat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formCatNombre.trim(),
            descripcion: formCatDescripcion.trim(),
            icono: formCatIcono.trim(),
            orden: Number(formCatOrden),
            is_activo: formCatActivo,
          }),
        });
      } else {
        // Crear
        res = await fetch(`${apiBaseUrl}/catalog/comercio/${selectedComercioId}/categorias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formCatNombre.trim(),
            descripcion: formCatDescripcion.trim(),
            icono: formCatIcono.trim(),
            orden: Number(formCatOrden),
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error guardando categoría');
      }

      setSuccessMsg(editingCat ? 'Categoría actualizada exitosamente.' : 'Categoría creada exitosamente.');
      setShowModalCat(false);
      fetchCategorias(selectedComercioId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  // Alternar estado activo de categoría
  const handleToggleCatActivo = async (cat: CategoriaItem) => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/categoria/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_activo: !cat.is_activo }),
      });
      const data = await res.json();
      if (data.success) {
        setCategorias(prev =>
          prev.map(c => (c.id === cat.id ? { ...c, is_activo: !cat.is_activo } : c))
        );
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  // Eliminar categoría
  const handleDeleteCategoria = async (catId: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${nombre}"? Los productos pasarán a categoría General.`)) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/categoria/${catId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCategorias(prev => prev.filter(c => c.id !== catId));
      }
    } catch (err) {
      console.error('Error eliminando categoría:', err);
    }
  };

  // Guardar Tipo de Comercio / Vertical
  const handleSaveVertical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVertId.trim() || !formVertNombre.trim()) {
      setErrorMsg('El ID y nombre de la vertical son requeridos.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/tipos-comercio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formVertId.trim().toLowerCase().replace(/\s+/g, '_'),
          nombre: formVertNombre.trim(),
          descripcion: formVertDescripcion.trim(),
          icono: formVertIcono.trim(),
          tipoLayout: formVertLayout,
          requiereCocina: formVertCocina,
          permiteRecetas: formVertRecetas,
          controlEdad18: formVertEdad18,
          orden: Number(formVertOrden),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModalVert(false);
        fetchVerticales();
        setSuccessMsg('Vertical de negocio registrada con éxito.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar vertical');
    } finally {
      setSaving(false);
    }
  };

  const selectedComercio = comercios.find(c => c.id === selectedComercioId);

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderTree size={26} color="#e11d48" /> Gestión de Categorías y Verticales
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Administra los tipos de negocio de la plataforma y el catálogo de categorías por local.
          </p>
        </div>

        {/* Pestañas Superiores */}
        <div style={{ display: 'flex', gap: '8px', background: '#1e293b', padding: '4px', borderRadius: '12px' }}>
          <button
            onClick={() => setActiveTab('categorias_locales')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'categorias_locales' ? '#e11d48' : 'transparent',
              color: activeTab === 'categorias_locales' ? '#fff' : '#94a3b8',
            }}
          >
            <Tag size={16} /> Categorías por Local
          </button>
          <button
            onClick={() => setActiveTab('verticales_plataforma')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'verticales_plataforma' ? '#e11d48' : 'transparent',
              color: activeTab === 'verticales_plataforma' ? '#fff' : '#94a3b8',
            }}
          >
            <Sparkles size={16} /> Verticales de Negocio ({verticales.length})
          </button>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#4c0519', border: '1px solid #be123c', color: '#fda4af', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 1: CATEGORÍAS POR LOCAL */}
      {/* ========================================================================= */}
      {activeTab === 'categorias_locales' && (
        <>
          {/* Selector de Comercio y Acción */}
          <div style={{ background: '#1e293b', padding: '18px 24px', borderRadius: '14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Store size={20} color="#38bdf8" />
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>
                  Seleccionar Establecimiento:
                </label>
                <select
                  value={selectedComercioId}
                  onChange={(e) => setSelectedComercioId(e.target.value)}
                  style={{
                    background: '#0f172a',
                    color: '#fff',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    minWidth: '320px',
                  }}
                >
                  {comercios.map((com) => (
                    <option key={com.id} value={com.id}>
                      {com.nombre_comercial} · {com.tipo_comercio_nombre || 'Restaurante'} ({com.direccion.split(',')[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedComercio && (
                <div style={{ fontSize: '12px', background: '#0f172a', padding: '6px 12px', borderRadius: '8px', color: '#cbd5e1', border: '1px solid #334155' }}>
                  Vertical: <strong>{selectedComercio.tipo_comercio_icono || '🍔'} {selectedComercio.tipo_comercio_nombre || 'Restaurante'}</strong>
                </div>
              )}
              <button
                onClick={handleOpenNewCat}
                style={{
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Plus size={16} /> Nueva Categoría
              </button>
            </div>
          </div>

          {/* Listado de Categorías */}
          {loadingCategorias ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
              <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
              Cargando catálogo de categorías...
            </div>
          ) : categorias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '16px', border: '1px dashed #334155', color: '#94a3b8' }}>
              <Layers size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <h3 style={{ color: '#f1f5f9', margin: '0 0 6px' }}>No hay categorías registradas en este local</h3>
              <p style={{ fontSize: '13px', margin: '0 0 16px' }}>Crea las secciones o pasillos para organizar la carta o inventario.</p>
              <button
                onClick={handleOpenNewCat}
                style={{ background: '#e11d48', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                + Crear Primera Categoría
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {categorias.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    opacity: cat.is_activo ? 1 : 0.6,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px', background: '#1e293b', padding: '6px 10px', borderRadius: '10px' }}>
                          {cat.icono || '🏷️'}
                        </span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>
                            {cat.nombre}
                          </h3>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Orden de visualización: #{cat.orden}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleCatActivo(cat)}
                        title={cat.is_activo ? 'Pausar categoría (ocultar sus productos)' : 'Activar categoría'}
                        style={{
                          background: cat.is_activo ? '#064e3b' : '#334155',
                          color: cat.is_activo ? '#6ee7b7' : '#94a3b8',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
                      >
                        {cat.is_activo ? '✓ Activa' : '⏸ En Pausa'}
                      </button>
                    </div>

                    {cat.descripcion && (
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                        {cat.descripcion}
                      </p>
                    )}

                    <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600', marginBottom: '16px' }}>
                      📦 {cat.total_productos || 0} producto(s) asignado(s)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
                    <button
                      onClick={() => handleOpenEditCat(cat)}
                      style={{
                        flex: 1,
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #334155',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteCategoria(cat.id, cat.nombre)}
                      style={{
                        background: '#4c0519',
                        color: '#fda4af',
                        border: '1px solid #be123c',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Eliminar categoría"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: VERTICALES DE NEGOCIO GLOBALES */}
      {/* ========================================================================= */}
      {activeTab === 'verticales_plataforma' && (
        <>
          <div style={{ background: '#1e293b', padding: '18px 24px', borderRadius: '14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px', color: '#f8fafc' }}>
                Tipos de Comercio Habilitados
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Define las reglas de negocio, interfaz (menú vs grid) y requerimientos de cada nicho.
              </p>
            </div>
            <button
              onClick={() => {
                setFormVertId('');
                setFormVertNombre('');
                setFormVertDescripcion('');
                setFormVertIcono('🏪');
                setFormVertLayout('grid_ecommerce');
                setFormVertCocina(false);
                setFormVertRecetas(false);
                setFormVertEdad18(false);
                setFormVertOrden(verticales.length + 1);
                setShowModalVert(true);
              }}
              style={{
                background: '#e11d48',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={16} /> Registrar Nueva Vertical
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {verticales.map((vert) => (
              <div
                key={vert.id}
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px', background: '#1e293b', padding: '8px 12px', borderRadius: '12px' }}>
                      {vert.icono}
                    </span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#fff' }}>
                        {vert.nombre}
                      </h3>
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace' }}>
                        ID: {vert.id} · Orden #{vert.orden}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                    {vert.descripcion}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', background: '#1e293b', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Diseño de Tienda:</span>
                      <strong style={{ color: vert.tipo_layout === 'restaurante' ? '#f59e0b' : '#38bdf8' }}>
                        {vert.tipo_layout === 'restaurante' ? '🍽️ Menú Gastronómico' : '🛒 Grid Góndola / E-commerce'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Comanda de Cocina:</span>
                      <strong>{vert.requiere_cocina ? '✅ Sí (Chef/Cocina)' : '❌ No (Picking / Empaque)'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Recetas Médicas:</span>
                      <strong>{vert.permite_recetas ? '✅ Habilitado (Subir foto)' : '❌ No aplica'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Control Legal +18:</span>
                      <strong>{vert.control_edad_18 ? '🔞 Sí (Obligatorio)' : '❌ No aplica'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR CATEGORÍA DE LOCAL */}
      {/* ========================================================================= */}
      {showModalCat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={20} color="#e11d48" /> {editingCat ? 'Editar Categoría' : 'Nueva Categoría de Catálogo'}
              </h3>
              <button onClick={() => setShowModalCat(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategoria} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lácteos y Quesos, Platos Fuertes, Analgésicos"
                  value={formCatNombre}
                  onChange={(e) => setFormCatNombre(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                    Icono (Emoji)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 🥛, 🥩, 🍔, 💊, 🍾"
                    value={formCatIcono}
                    onChange={(e) => setFormCatIcono(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                    Orden en Pantalla
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formCatOrden}
                    onChange={(e) => setFormCatOrden(Number(e.target.value))}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre los productos de esta sección..."
                  value={formCatDescripcion}
                  onChange={(e) => setFormCatDescripcion(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', resize: 'none' }}
                />
              </div>

              {editingCat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '10px 14px', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="catActivo"
                    checked={formCatActivo}
                    onChange={(e) => setFormCatActivo(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="catActivo" style={{ fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>
                    Categoría visible y activa
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowModalCat(false)}
                  style={{ flex: 1, padding: '12px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 2, padding: '12px', background: '#e11d48', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  {editingCat ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR VERTICAL DE NEGOCIO */}
      {/* ========================================================================= */}
      {showModalVert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#e11d48" /> Nueva Vertical de Negocio
              </h3>
              <button onClick={() => setShowModalVert(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVertical} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                    ID Código (Único) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: mascotas, flores"
                    value={formVertId}
                    onChange={(e) => setFormVertId(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                    Icono Emoji *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: 🐾, 💐, 🛠️"
                    value={formVertIcono}
                    onChange={(e) => setFormVertIcono(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', textAlign: 'center' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  Nombre Comercial de la Vertical *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Mascotas & Veterinaria"
                  value={formVertNombre}
                  onChange={(e) => setFormVertNombre(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  Tipo de Layout en Tienda
                </label>
                <select
                  value={formVertLayout}
                  onChange={(e) => setFormVertLayout(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                >
                  <option value="grid_ecommerce">🛒 Grid Góndola / E-commerce (Supermercados, Farmacias, Licoreras)</option>
                  <option value="restaurante">🍽️ Menú Gastronómico Tradicional (Restaurantes, Cafés)</option>
                </select>
              </div>

              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formVertCocina} onChange={(e) => setFormVertCocina(e.target.checked)} />
                  Requiere comanda a cocina (Preparación de comida)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formVertRecetas} onChange={(e) => setFormVertRecetas(e.target.checked)} />
                  Permite subida de recetas médicas (Farmacias)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formVertEdad18} onChange={(e) => setFormVertEdad18(e.target.checked)} />
                  Aviso legal obligatorio para mayores de 18 años (Licores)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowModalVert(false)}
                  style={{ flex: 1, padding: '12px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 2, padding: '12px', background: '#e11d48', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                >
                  {saving ? 'Guardando...' : 'Guardar Vertical'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
