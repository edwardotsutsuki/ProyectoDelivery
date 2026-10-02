import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  DollarSign,
  Power,
  Tag,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Store
} from 'lucide-react';

interface Producto {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion: string;
  precio: number | string;
  categoria: string;
  is_disponible: boolean;
  imagen_url?: string;
}

interface ComercioItem {
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
  const [comercios, setComercios] = useState<ComercioItem[]>([]);
  const [selectedComercioId, setSelectedComercioId] = useState<string>('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrecio, setFormPrecio] = useState<number>(3.50);
  const [formCategoria, setFormCategoria] = useState('Platos Fuertes');
  const [formImagenUrl, setFormImagenUrl] = useState('');

  // 1. Cargar lista de comercios
  useEffect(() => {
    const fetchComercios = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/catalog/comercios/admin`);
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
  useEffect(() => {
    if (!selectedComercioId) return;
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/catalog/comercio/${selectedComercioId}/productos`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setProductos(data.data);
        } else {
          setProductos([]);
        }
      } catch (err) {
        console.error('Error cargando productos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, [selectedComercioId, apiBaseUrl]);

  const handleToggleDisponible = async (prodId: string, currentDisponible: boolean) => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/producto/${prodId}/disponibilidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDisponible: !currentDisponible }),
      });
      const data = await res.json();
      if (data.success) {
        setProductos(prev =>
          prev.map(p => (p.id === prodId ? { ...p, is_disponible: !currentDisponible } : p))
        );
      }
    } catch (err) {
      console.error('Error cambiando disponibilidad:', err);
    }
  };

  const handleCreateProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !selectedComercioId) {
      setErrorMsg('El nombre del plato y el comercio son obligatorios.');
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
          nombre: formNombre.trim(),
          descripcion: formDescripcion.trim(),
          precio: Number(formPrecio),
          categoria: formCategoria,
          imagenUrl: formImagenUrl.trim() || null,
          isDisponible: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al crear producto');
      }

      setSuccessMsg(`Plato "${data.data.nombre}" agregado con éxito.`);
      setShowModal(false);
      setFormNombre('');
      setFormDescripcion('');
      setFormPrecio(3.50);
      setFormCategoria('Platos Fuertes');
      setFormImagenUrl('');

      // Recargar lista
      const refreshRes = await fetch(`${apiBaseUrl}/catalog/comercio/${selectedComercioId}/productos`);
      const refreshData = await refreshRes.json();
      if (refreshData.success && Array.isArray(refreshData.data)) {
        setProductos(refreshData.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de red');
    } finally {
      setSaving(false);
    }
  };

  const filteredProductos = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
            Catálogo y Platos por Restaurante
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
            Gestiona la carta, precios y disponibilidad en tiempo real sincronizado con Redis.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setShowModal(true);
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
            cursor: !selectedComercioId ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)',
            opacity: !selectedComercioId ? 0.6 : 1,
          }}
        >
          <Plus size={18} /> Agregar Plato a este Local
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

      {/* Selector de Restaurante y Buscador */}
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
        <div style={{ minWidth: '280px', flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
            🏪 SELECCIONA EL RESTAURANTE / LOCAL
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
              fontWeight: '600',
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

        <div style={{ flex: 1, minWidth: '240px', position: 'relative', marginTop: '18px' }}>
          <div style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar plato o categoría..."
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
      </div>

      {/* Grid de Platos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <p>Cargando carta de platos...</p>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#0f172a',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          color: '#94a3b8',
        }}>
          <UtensilsCrossed size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 6px 0' }}>No hay platos registrados en este local</h3>
          <p style={{ fontSize: '14px', margin: 0 }}>Haz clic en "Agregar Plato a este Local" para añadir comidas o bebidas al menú.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filteredProductos.map((prod) => (
            <div
              key={prod.id}
              style={{
                background: '#0f172a',
                borderRadius: '16px',
                border: `1px solid ${prod.is_disponible ? '#1e293b' : '#450a0a'}`,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}>
                    {prod.categoria || 'Especialidades'}
                  </span>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: prod.is_disponible ? '#064e3b' : '#450a0a',
                    color: prod.is_disponible ? '#34d399' : '#f87171',
                  }}>
                    {prod.is_disponible ? '● DISPONIBLE' : '○ AGOTADO'}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}>
                  {prod.nombre}
                </h3>

                {prod.descripcion && (
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                    {prod.descripcion}
                  </p>
                )}
              </div>

              <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#e11d48' }}>
                  ${Number(prod.precio || 0).toFixed(2)}
                </span>

                <button
                  onClick={() => handleToggleDisponible(prod.id, prod.is_disponible)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: prod.is_disponible ? '#1e293b' : '#064e3b',
                    color: prod.is_disponible ? '#f87171' : '#6ee7b7',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Power size={13} /> {prod.is_disponible ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Agregar Plato */}
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
            maxWidth: '520px',
            padding: '28px',
            color: '#fff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                Agregar Plato al Menú
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

            <form onSubmit={handleCreateProducto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#cbd5e1' }}>
                  Nombre del Plato / Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Seco de gallina con maduro"
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
                <input
                  type="text"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej: Con arroz, chicha artesanal y hierbitas frescas"
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
                    Precio al Público ($) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(parseFloat(e.target.value) || 0)}
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
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
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
                    <option value="Platos Fuertes">Platos Fuertes</option>
                    <option value="Desayunos">Desayunos Criollos</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Burgers">Hamburguesas y Alitas</option>
                    <option value="Bebidas">Bebidas y Jugos</option>
                    <option value="Acompañamientos">Acompañamientos</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
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
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Guardando...' : 'Guardar Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
