import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  DollarSign,
  Tag,
  Power,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

interface Producto {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion: string;
  precio: string | number;
  categoria: string;
  imagen_url: string | null;
  is_disponible: boolean;
}

interface ComercioSimple {
  id: string;
  nombre_comercial: string;
  direccion: string;
}

interface ProductosPageProps {
  apiBaseUrl?: string;
}

export default function ProductosPage({
  apiBaseUrl = 'http://localhost:8080/api/v1',
}: ProductosPageProps) {
  const [comercios, setComercios] = useState<ComercioSimple[]>([]);
  const [selectedComercioId, setSelectedComercioId] = useState<string>('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('4.50');
  const [formCategory, setFormCategory] = useState('Platos Fuertes');
  const [formImage, setFormImage] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);

  // 1. Cargar lista de comercios
  useEffect(() => {
    const fetchComercios = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/catalog/comercios`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setComercios(data.data);
          setSelectedComercioId(data.data[0].id);
        }
      } catch (err) {
        console.error('Error cargando comercios:', err);
      }
    };
    fetchComercios();
  }, [apiBaseUrl]);

  // 2. Cargar productos del comercio seleccionado
  const fetchProductos = async (comercioId: string) => {
    if (!comercioId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercio/${comercioId}/productos`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProductos(data.data);
      } else {
        setProductos([]);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedComercioId) {
      fetchProductos(selectedComercioId);
    }
  }, [selectedComercioId]);

  // 3. Toggle disponibilidad en cocina (Redis + PostgreSQL)
  const handleToggleDisponibilidad = async (productoId: string, currentAvailable: boolean) => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/producto/${productoId}/toggle-disponibilidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_disponible: !currentAvailable }),
      });
      const data = await res.json();
      if (data.success) {
        setProductos(prev =>
          prev.map(p => (p.id === productoId ? { ...p, is_disponible: !currentAvailable } : p))
        );
      }
    } catch (err) {
      console.error('Error cambiando disponibilidad de producto:', err);
    }
  };

  // 4. Eliminar producto
  const handleDeleteProducto = async (productoId: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${nombre}" del menú?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/catalog/producto/${productoId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setProductos(prev => prev.filter(p => p.id !== productoId));
        setSuccessMsg(`Plato "${nombre}" eliminado del catálogo.`);
      }
    } catch (err) {
      console.error('Error eliminando producto:', err);
    }
  };

  // 5. Crear producto nuevo
  const handleCreateProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) {
      setErrorMsg('Nombre y precio del plato son requeridos.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercio/${selectedComercioId}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formName.trim(),
          descripcion: formDesc.trim(),
          precio: parseFloat(formPrice),
          categoria: formCategory.trim() || 'Platos Fuertes',
          imagenUrl: formImage.trim() || null,
          isDisponible: formAvailable,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar producto.');
      }

      setSuccessMsg(`¡Plato "${data.data.nombre}" agregado con éxito!`);
      setShowModal(false);
      resetForm();
      fetchProductos(selectedComercioId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear producto.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormPrice('4.50');
    setFormCategory('Platos Fuertes');
    setFormImage('');
    setFormAvailable(true);
  };

  const categories = Array.from(new Set(productos.map(p => p.categoria || 'General')));

  const filteredProductos = productos.filter(p => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && (p.categoria || 'General') !== categoryFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Catálogo y Creador de Menú
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Gestiona platos, precios, descripciones y disponibilidad de cocina en tiempo real.
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setErrorMsg('');
          }}
          disabled={!selectedComercioId}
          style={{
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: selectedComercioId ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: selectedComercioId ? 1 : 0.5,
            boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)',
          }}
        >
          <Plus size={18} /> Agregar Plato / Bebida
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

      {/* Selector de Comercio y Filtros */}
      <div style={{
        background: '#0f172a',
        padding: '18px 22px',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              Seleccionar Local Comercial:
            </label>
            <select
              value={selectedComercioId}
              onChange={(e) => setSelectedComercioId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                outline: 'none',
              }}
            >
              {comercios.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre_comercial} ({c.direccion})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '2 1 300px', position: 'relative', marginTop: '18px' }}>
            <div style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar plato por nombre o ingredientes..."
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
        </div>

        {/* Píldoras de Categorías */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
            <button
              onClick={() => setCategoryFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: categoryFilter === 'all' ? '#e11d48' : '#334155',
                background: categoryFilter === 'all' ? '#e11d48' : '#1e293b',
                color: categoryFilter === 'all' ? '#fff' : '#94a3b8',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Todas las Categorías ({productos.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: categoryFilter === cat ? '#e11d48' : '#334155',
                  background: categoryFilter === cat ? '#e11d48' : '#1e293b',
                  color: categoryFilter === cat ? '#fff' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de Productos */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          Cargando carta gastronómica...
        </div>
      ) : filteredProductos.length === 0 ? (
        <div style={{
          background: '#0f172a',
          padding: '48px',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          textAlign: 'center',
          color: '#94a3b8',
        }}>
          <UtensilsCrossed size={40} style={{ margin: '0 auto 12px auto', color: '#64748b' }} />
          <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 6px 0' }}>No hay platos en esta categoría</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Haz clic en "Agregar Plato" para enriquecer la carta del local.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filteredProductos.map((p) => (
            <div
              key={p.id}
              style={{
                background: '#0f172a',
                borderRadius: '16px',
                border: '1px solid #1e293b',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    color: '#38bdf8',
                  }}>
                    {p.categoria || 'General'}
                  </span>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: p.is_disponible ? '#064e3b' : '#450a0a',
                    color: p.is_disponible ? '#6ee7b7' : '#f87171',
                  }}>
                    {p.is_disponible ? 'DISPONIBLE' : 'AGOTADO'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
                    {p.nombre}
                  </h3>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
                    ${Number(p.precio).toFixed(2)}
                  </div>
                </div>

                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 14px 0', lineHeight: 1.4 }}>
                  {p.descripcion || 'Sin descripción detallada.'}
                </p>
              </div>

              <div style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <button
                  onClick={() => handleToggleDisponibilidad(p.id, p.is_disponible)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: p.is_disponible ? '#1e293b' : '#064e3b',
                    color: p.is_disponible ? '#f87171' : '#6ee7b7',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Power size={13} /> {p.is_disponible ? 'Marcar Agotado' : 'Habilitar Plato'}
                </button>

                <button
                  onClick={() => handleDeleteProducto(p.id, p.nombre)}
                  title="Eliminar plato"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Agregar Producto */}
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
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Agregar Plato o Bebida</h3>
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

            <form onSubmit={handleCreateProducto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Nombre del Plato / Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Seco de Pato Tradicional"
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
                  Descripción de Ingredientes
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Acompañado de arroz amarillo, maduro frito y ensalada..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#fff',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                    Precio al Público ($) *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.50"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
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
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ej: Platos Fuertes, Bebidas..."
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
                  URL de Imagen (Opcional)
                </label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : 'Guardar en el Menú'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
