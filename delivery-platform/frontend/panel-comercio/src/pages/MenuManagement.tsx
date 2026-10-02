import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Power,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  DollarSign,
  Tag,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { config } from '../config';

interface ProductItem {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url?: string;
  is_disponible: boolean;
  categoria: string;
}

const CATEGORIES = [
  'Platos Fuertes',
  'Desayunos y Tradicional',
  'Mariscos y Pescados',
  'Parrilladas y Asados',
  'Pizzas y Empanadas',
  'Bebidas',
  'Acompañamientos',
  'Postres'
];

export default function MenuManagement() {
  const { session } = useAuth();
  const comercioId = session?.user?.comercioId || '55555555-5555-5555-5555-555555555555';

  const [productos, setProductos] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formNombre, setFormNombre] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formCategoria, setFormCategoria] = useState(CATEGORIES[0]);
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [formDisponible, setFormDisponible] = useState(true);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/productos`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProductos(data.data);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [comercioId]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormNombre('');
    setFormDesc('');
    setFormPrecio('');
    setFormCategoria(CATEGORIES[0]);
    setFormImagenUrl('');
    setFormDisponible(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleEditClick = (p: ProductItem) => {
    setEditingProduct(p);
    setFormNombre(p.nombre);
    setFormDesc(p.descripcion || '');
    setFormPrecio(String(p.precio));
    setFormCategoria(p.categoria || CATEGORIES[0]);
    setFormImagenUrl(p.imagen_url || '');
    setFormDisponible(p.is_disponible);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleToggleDisponibilidad = async (productId: string, currentDisponible: boolean) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/producto/${productId}/toggle-disponibilidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_disponible: !currentDisponible }),
      });
      const data = await res.json();
      if (data.success) {
        setProductos((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_disponible: !currentDisponible } : p))
        );
        setSuccessMsg(`Disponibilidad de "${productId}" actualizada.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Error cambiando disponibilidad:', err);
    }
  };

  const handleDeleteProduct = async (productId: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el plato "${nombre}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/producto/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setProductos((prev) => prev.filter((p) => p.id !== productId));
        setSuccessMsg(`Plato "${nombre}" eliminado del catálogo.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message || 'No se pudo eliminar el producto.');
      }
    } catch (err) {
      setErrorMsg('Error de red al eliminar plato.');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formPrecio) {
      setErrorMsg('El nombre y el precio son obligatorios.');
      return;
    }

    const precioNum = parseFloat(formPrecio);
    if (isNaN(precioNum) || precioNum <= 0) {
      setErrorMsg('El precio debe ser un número válido mayor a 0.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEditing = Boolean(editingProduct);
      const url = isEditing
        ? `${config.apiBaseUrl}/catalog/producto/${editingProduct!.id}`
        : `${config.apiBaseUrl}/catalog/comercio/${comercioId}/productos`;
      const method = isEditing ? 'PUT' : 'POST';

      const bodyData: any = {
        nombre: formNombre.trim(),
        descripcion: formDesc.trim(),
        precio: precioNum,
        categoria: formCategoria,
        imagenUrl: formImagenUrl.trim() || null,
        isDisponible: formDisponible,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar producto.');
      }

      setSuccessMsg(
        isEditing
          ? `Plato "${data.data.nombre}" actualizado correctamente.`
          : `¡Plato "${data.data.nombre}" agregado a la carta!`
      );
      setShowModal(false);
      fetchProductos();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar plato.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProductos = productos.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCategory !== 'all' && p.categoria !== selectedCategory) return false;

    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Cabecera Rappi Partners */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
            <UtensilsCrossed size={16} /> Portal Aliados · Gestión de Menú
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            Carta de Platos y Disponibilidad en Vivo
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Crea, edita y pausa platos al instante. Los cambios se sincronizan en Redis y la app de clientes en Baba & Babahoyo.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-900/30 hover:from-rose-500 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <Plus size={18} /> Agregar Nuevo Plato
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="relative min-w-[260px] flex-1">
          <Search size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar plato por nombre o descripción..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        {/* Categorías */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Todas ({productos.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = productos.filter((p) => p.categoria === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <button
          onClick={fetchProductos}
          title="Refrescar lista"
          className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Grid de Productos */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 size={36} className="mx-auto mb-3 animate-spin text-rose-500" />
          <p>Cargando menú del restaurante...</p>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center text-slate-400">
          <UtensilsCrossed size={48} className="mx-auto mb-3 opacity-30 text-rose-500" />
          <h3 className="text-lg font-bold text-white">No hay platos registrados en esta categoría</h3>
          <p className="mt-1 text-sm">Empieza agregando tus primeros platos para que los clientes en Baba puedan pedir.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500"
          >
            <Plus size={16} /> Crear Plato Ahora
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProductos.map((prod) => (
            <div
              key={prod.id}
              className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-slate-900 transition-all ${
                prod.is_disponible
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-rose-950/60 bg-slate-950/80 opacity-75'
              }`}
            >
              <div>
                {/* Imagen del Plato */}
                <div className="relative h-44 w-full bg-slate-800">
                  {prod.imagen_url ? (
                    <img
                      src={prod.imagen_url}
                      alt={prod.nombre}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <UtensilsCrossed size={36} />
                    </div>
                  )}

                  {/* Badge de Categoría */}
                  <span className="absolute left-3 top-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-slate-200 backdrop-blur-md">
                    {prod.categoria || 'Platos Fuertes'}
                  </span>

                  {/* Badge de Disponibilidad */}
                  <span
                    className={`absolute right-3 top-3 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase backdrop-blur-md ${
                      prod.is_disponible
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {prod.is_disponible ? '● Activo' : '○ Pausado'}
                  </span>
                </div>

                {/* Contenido */}
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-white line-clamp-1">{prod.nombre}</h3>
                    <span className="text-lg font-extrabold text-emerald-400">
                      ${Number(prod.precio).toFixed(2)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {prod.descripcion || 'Sin descripción detallada.'}
                  </p>
                </div>
              </div>

              {/* Botonera de Acción estilo Rappi Partners */}
              <div className="border-t border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleDisponibilidad(prod.id, prod.is_disponible)}
                    title={prod.is_disponible ? 'Pausar plato (Agotado por hoy)' : 'Reactivar plato en carta'}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                      prod.is_disponible
                        ? 'bg-emerald-950/50 text-emerald-300 hover:bg-rose-900/50 hover:text-rose-200 border border-emerald-500/30'
                        : 'bg-rose-950/50 text-rose-300 hover:bg-emerald-900/50 hover:text-emerald-200 border border-rose-500/30'
                    }`}
                  >
                    <Power size={13} />
                    {prod.is_disponible ? 'Disponible' : 'Agotado'}
                  </button>

                  <button
                    onClick={() => handleEditClick(prod)}
                    title="Editar detalles del plato"
                    className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-2 text-sky-300 hover:bg-slate-700"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(prod.id, prod.nombre)}
                    title="Eliminar plato de la carta"
                    className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-2 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Plato */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-extrabold">
                {editingProduct ? 'Editar Plato de la Carta' : 'Crear Nuevo Plato'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300">Nombre del Plato *</label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Seco de Pato Criollo"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300">Descripción o Ingredientes</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Acompañado de arroz con choclo, maduro frito y ensalada..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300">Precio USD ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.25"
                    required
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(e.target.value)}
                    placeholder="4.50"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300">Categoría</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300">URL de Fotografía (Opcional)</label>
                <input
                  type="url"
                  value={formImagenUrl}
                  onChange={(e) => setFormImagenUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prodDisponible"
                  checked={formDisponible}
                  onChange={(e) => setFormDisponible(e.target.checked)}
                  className="h-4 w-4 rounded accent-rose-600"
                />
                <label htmlFor="prodDisponible" className="text-xs text-slate-300">
                  Plato disponible inmediatamente para pedidos de clientes
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/30 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  ) : editingProduct ? (
                    'Guardar Cambios'
                  ) : (
                    'Agregar a la Carta'
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
