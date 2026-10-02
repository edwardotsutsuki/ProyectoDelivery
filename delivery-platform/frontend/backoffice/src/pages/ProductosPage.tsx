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
  Store,
  Boxes,
  FileText,
  Edit2,
  Trash2,
  Sparkles
} from 'lucide-react';

interface Producto {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion: string;
  precio: number | string;
  categoria?: string;
  categoria_id?: string;
  categoria_nombre?: string;
  categoria_icono?: string;
  is_disponible: boolean;
  imagen_url?: string;
  unidad_medida?: string;
  maneja_stock?: boolean;
  stock_disponible?: number | null;
  requiere_receta?: boolean;
}

interface CategoriaItem {
  id: string;
  nombre: string;
  icono?: string;
}

interface ComercioItem {
  id: string;
  nombre_comercial: string;
  tipo_comercio_id?: string;
  tipo_comercio_nombre?: string;
  tipo_comercio_icono?: string;
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
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todas');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrecio, setFormPrecio] = useState<number>(3.50);
  const [formCategoriaId, setFormCategoriaId] = useState('');
  const [formNuevaCategoriaNombre, setFormNuevaCategoriaNombre] = useState('');
  const [showQuickNewCat, setShowQuickNewCat] = useState(false);
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [formUnidadMedida, setFormUnidadMedida] = useState('unidad');
  const [formManejaStock, setFormManejaStock] = useState(false);
  const [formStockDisponible, setFormStockDisponible] = useState<number>(20);
  const [formRequiereReceta, setFormRequiereReceta] = useState(false);

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

  // 2. Cargar productos y categorías del comercio seleccionado
  useEffect(() => {
    if (!selectedComercioId) return;
    fetchProductos(selectedComercioId);
    fetchCategorias(selectedComercioId);
  }, [selectedComercioId, apiBaseUrl]);

  const fetchProductos = async (comercioId: string) => {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async (comercioId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/comercio/${comercioId}/categorias`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategorias(data.data);
        if (data.data.length > 0) {
          setFormCategoriaId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  // Alternar disponibilidad en vivo (Redis + Postgres)
  const handleToggleDisponible = async (prodId: string, currentDisponible: boolean) => {
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/producto/${prodId}/toggle-disponibilidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_disponible: !currentDisponible }),
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

  // Abrir modal de nuevo producto
  const handleOpenNewModal = () => {
    setEditingProduct(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormPrecio(3.50);
    setFormCategoriaId(categorias[0]?.id || '');
    setFormNuevaCategoriaNombre('');
    setShowQuickNewCat(false);
    setFormImagenUrl('');
    setFormUnidadMedida('unidad');
    setFormManejaStock(false);
    setFormStockDisponible(20);
    setFormRequiereReceta(false);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  // Abrir modal para editar producto
  const handleOpenEditModal = (prod: Producto) => {
    setEditingProduct(prod);
    setFormNombre(prod.nombre);
    setFormDescripcion(prod.descripcion || '');
    setFormPrecio(Number(prod.precio));
    setFormCategoriaId(prod.categoria_id || categorias[0]?.id || '');
    setFormNuevaCategoriaNombre('');
    setShowQuickNewCat(false);
    setFormImagenUrl(prod.imagen_url || '');
    setFormUnidadMedida(prod.unidad_medida || 'unidad');
    setFormManejaStock(Boolean(prod.maneja_stock));
    setFormStockDisponible(prod.stock_disponible !== null && prod.stock_disponible !== undefined ? Number(prod.stock_disponible) : 20);
    setFormRequiereReceta(Boolean(prod.requiere_receta));
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !selectedComercioId) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        nombre: formNombre.trim(),
        descripcion: formDescripcion.trim(),
        precio: Number(formPrecio),
        categoriaId: showQuickNewCat ? null : (formCategoriaId || null),
        nuevaCategoriaNombre: showQuickNewCat && formNuevaCategoriaNombre.trim() ? formNuevaCategoriaNombre.trim() : null,
        imagenUrl: formImagenUrl.trim() || null,
        isDisponible: true,
        unidadMedida: formUnidadMedida,
        manejaStock: formManejaStock,
        stockDisponible: formManejaStock ? Number(formStockDisponible) : null,
        requiereReceta: formRequiereReceta,
      };

      let res;
      if (editingProduct) {
        res = await fetch(`${apiBaseUrl}/catalog/producto/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${apiBaseUrl}/catalog/comercio/${selectedComercioId}/productos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar el producto');
      }

      setSuccessMsg(editingProduct ? 'Producto actualizado correctamente.' : 'Producto creado exitosamente.');
      setShowModal(false);
      fetchProductos(selectedComercioId);
      fetchCategorias(selectedComercioId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar producto
  const handleDeleteProducto = async (prodId: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto "${nombre}" del catálogo?`)) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/catalog/producto/${prodId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setProductos(prev => prev.filter(p => p.id !== prodId));
      }
    } catch (err) {
      console.error('Error eliminando producto:', err);
    }
  };

  const selectedComercio = comercios.find(c => c.id === selectedComercioId);

  // Filtrado
  const filteredProductos = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCategoria === 'todas' ||
                       p.categoria_id === filterCategoria ||
                       p.categoria === filterCategoria;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UtensilsCrossed size={26} color="#e11d48" /> Catálogo de Productos y Platos
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Administra precios, categorías, unidades de medida y stock opcional por establecimiento.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
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
          <Plus size={16} /> + Nuevo Producto
        </button>
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

      {/* Barra de Filtros y Selector de Comercio */}
      <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={18} color="#38bdf8" />
            <select
              value={selectedComercioId}
              onChange={(e) => setSelectedComercioId(e.target.value)}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                minWidth: '280px',
              }}
            >
              {comercios.map((com) => (
                <option key={com.id} value={com.id}>
                  {com.nombre_comercial} · {com.tipo_comercio_nombre || 'Restaurante'}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Categoría */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={16} color="#94a3b8" />
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <option value="todas">Todas las categorías ({categorias.length})</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono || '🏷️'} {cat.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 12px 8px 36px',
              color: '#fff',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {/* Grid de Productos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
          Cargando catálogo del local...
        </div>
      ) : filteredProductos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '16px', border: '1px dashed #334155', color: '#94a3b8' }}>
          <UtensilsCrossed size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <h3 style={{ color: '#f1f5f9', margin: '0 0 6px' }}>No hay productos en esta selección</h3>
          <p style={{ fontSize: '13px', margin: '0 0 16px' }}>Agrega productos o platos al catálogo de este negocio.</p>
          <button
            onClick={handleOpenNewModal}
            style={{ background: '#e11d48', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            + Añadir Producto
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filteredProductos.map((prod) => (
            <div
              key={prod.id}
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                opacity: prod.is_disponible ? 1 : 0.65,
              }}
            >
              <div>
                {/* Imagen si existe */}
                {prod.imagen_url && (
                  <div style={{ height: '140px', width: '100%', overflow: 'hidden', background: '#1e293b' }}>
                    <img
                      src={prod.imagen_url}
                      alt={prod.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e: any) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div style={{ padding: '18px' }}>
                  {/* Categoría y Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '11px', background: '#1e293b', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                      {prod.categoria_icono || '🏷️'} {prod.categoria_nombre || prod.categoria || 'General'}
                    </span>
                    <span style={{ fontSize: '11px', background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px' }}>
                      {prod.unidad_medida?.toUpperCase() || 'UNIDAD'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>
                    {prod.nombre}
                  </h3>

                  {prod.descripcion && (
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#94a3b8', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {prod.descripcion}
                    </p>
                  )}

                  {/* Precio e Inventario */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#22c55e' }}>
                      ${Number(prod.precio).toFixed(2)}
                    </span>

                    {/* Badge de Inventario */}
                    {prod.maneja_stock ? (
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', background: (prod.stock_disponible || 0) > 0 ? '#1e293b' : '#450a0a', color: (prod.stock_disponible || 0) > 0 ? '#fbbf24' : '#ef4444' }}>
                        📦 Stock: {prod.stock_disponible ?? 0}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', background: '#1e293b', color: '#94a3b8', padding: '3px 8px', borderRadius: '6px' }}>
                        ♾️ Stock Ilimitado
                      </span>
                    )}
                  </div>

                  {prod.requiere_receta && (
                    <div style={{ fontSize: '11px', color: '#ec4899', fontWeight: '700', marginTop: '6px' }}>
                      ⚠️ Requiere Receta Médica
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div style={{ padding: '14px 18px', borderTop: '1px solid #1e293b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handleToggleDisponible(prod.id, prod.is_disponible)}
                  style={{
                    flex: 1,
                    background: prod.is_disponible ? '#064e3b' : '#334155',
                    color: prod.is_disponible ? '#6ee7b7' : '#94a3b8',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Power size={14} />
                  {prod.is_disponible ? 'Disponible' : 'Agotado'}
                </button>

                <button
                  onClick={() => handleOpenEditModal(prod)}
                  style={{
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
                  }}
                  title="Editar producto"
                >
                  <Edit2 size={14} />
                </button>

                <button
                  onClick={() => handleDeleteProducto(prod.id, prod.nombre)}
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
                  title="Eliminar producto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR PRODUCTO */}
      {/* ========================================================================= */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', maxWidth: '560px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UtensilsCrossed size={20} color="#e11d48" /> {editingProduct ? 'Editar Producto' : 'Nuevo Producto / Plato'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProducto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Encebollado Mixto, Arroz Súper Extra 1Kg, Paracetamol 500mg"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              {/* Categoría con botón de agregar al instante */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                    Categoría de Catálogo *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickNewCat(!showQuickNewCat)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    {showQuickNewCat ? '✕ Cancelar nueva' : '+ Crear Nueva Categoría'}
                  </button>
                </div>

                {showQuickNewCat ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nombre de la nueva categoría (Ej: Postres, Lácteos)..."
                      value={formNuevaCategoriaNombre}
                      onChange={(e) => setFormNuevaCategoriaNombre(e.target.value)}
                      style={{ flex: 1, background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                ) : (
                  <select
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                  >
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icono || '🏷️'} {cat.nombre}
                      </option>
                    ))}
                    {categorias.length === 0 && <option value="">General</option>}
                  </select>
                )}
              </div>

              {/* Precio y Unidad de Medida */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                    Precio Venta ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                    Unidad de Medida
                  </label>
                  <select
                    value={formUnidadMedida}
                    onChange={(e) => setFormUnidadMedida(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                  >
                    <option value="unidad">Unidad / Plato</option>
                    <option value="kg">Kilogramo (Kg)</option>
                    <option value="libra">Libra (lb)</option>
                    <option value="gramos">Gramos (g)</option>
                    <option value="litro">Litro (L)</option>
                    <option value="six_pack">Six Pack (6 un.)</option>
                    <option value="caja">Caja</option>
                    <option value="blister">Blíster (Farmacia)</option>
                  </select>
                </div>
              </div>

              {/* Control de Inventario Opcional */}
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formManejaStock ? '10px' : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formManejaStock}
                      onChange={(e) => setFormManejaStock(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    📦 ¿Controlar inventario numérico de este producto?
                  </label>
                  {!formManejaStock && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Stock ilimitado</span>
                  )}
                </div>

                {formManejaStock && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      Cantidad disponible en percha / almacén:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formStockDisponible}
                      onChange={(e) => setFormStockDisponible(parseInt(e.target.value) || 0)}
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '14px' }}
                    />
                    <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                      ⚠️ Al llegar a 0 unidades se mostrará automáticamente como agotado.
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  Descripción o Ingredientes
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de preparación, marca o ingredientes..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  URL de Imagen (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formImagenUrl}
                  onChange={(e) => setFormImagenUrl(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formRequiereReceta}
                  onChange={(e) => setFormRequiereReceta(e.target.checked)}
                />
                Requiere receta médica para su despacho (Farmacias)
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {editingProduct ? 'Guardar Cambios' : 'Añadir al Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
