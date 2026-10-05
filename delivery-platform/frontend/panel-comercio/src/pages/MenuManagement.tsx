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
  RefreshCw,
  FileSpreadsheet,
  Download,
  Upload,
  Store,
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { config } from '../config';

export interface TamanoItem {
  nombre: string;
  precio: number;
}

interface ProductItem {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url?: string;
  is_disponible: boolean;
  categoria: string;
  categoria_id?: string | null;
  categoria_nombre?: string | null;
  categoria_icono?: string | null;
  unidad_medida?: string;
  maneja_stock?: boolean;
  stock_disponible?: number | null;
  requiere_receta?: boolean;
  tamanos?: TamanoItem[];
}

interface CategoriaComercio {
  id: string;
  comercio_id: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  orden: number;
  is_activo: boolean;
}

const DEFAULT_CATEGORIES = [
  'Platos Fuertes',
  'Desayunos y Tradicional',
  'Mariscos y Pescados',
  'Parrilladas y Asados',
  'Pizzas y Empanadas',
  'Bebidas',
  'Acompañamientos',
  'Postres',
  'Víveres y Abarrotes',
  'Farmacia y Salud',
  'Licores y Vinos'
];

export interface MenuManagementProps {
  isRetail?: boolean;
  comercioTipo?: string;
}

export default function MenuManagement({ isRetail, comercioTipo }: MenuManagementProps = {}) {
  const { session } = useAuth();
  const comercioId = session?.user?.comercioId || '55555555-5555-5555-5555-555555555555';

  const [storeIsRetail, setStoreIsRetail] = useState(isRetail ?? false);
  const [storeTipo, setStoreTipo] = useState(comercioTipo ?? '');

  useEffect(() => {
    async function loadComercioMeta() {
      try {
        const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const retail = json.data.tipo_layout === 'grid_ecommerce' ||
                           ['supermercado', 'farmacia', 'licorera', 'express'].includes(json.data.tipo_comercio_id);
            setStoreIsRetail(retail);
            setStoreTipo(json.data.tipo_comercio_nombre || json.data.categoria || '');
          }
        }
      } catch (err) {
        console.warn('Error loading store meta in MenuManagement:', err);
      }
    }
    if (comercioId) loadComercioMeta();
  }, [comercioId]);

  const itemLabel = storeIsRetail ? 'Producto' : 'Plato';
  const itemLabelPlural = storeIsRetail ? 'Productos' : 'Platos';

  const dynamicCategories = React.useMemo(() => {
    const t = (storeTipo || '').toLowerCase();
    if (t.includes('licor') || t.includes('bebida')) {
      return ['Cervezas', 'Licores y Whisky', 'Vinos y Espumantes', 'Bebidas y Gaseosas', 'Hielo y Snacks', 'Cigarrillos y Vapes', 'Otros'];
    }
    if (t.includes('farmacia') || t.includes('salud')) {
      return ['Medicamentos con Receta', 'Venta Libre & Analgésicos', 'Cuidado Personal e Higiene', 'Primeros Auxilios', 'Vitaminas y Bienestar', 'Bebidas y Snacks'];
    }
    if (t.includes('marisco') || t.includes('pescado')) {
      return ['Pescados Frescos', 'Mariscos y Camarón', 'Ceviches y Especiales', 'Acompañamientos y Encurtidos', 'Bebidas y Fríos'];
    }
    if (storeIsRetail) {
      return ['Víveres y Abarrotes', 'Lácteos y Huevos', 'Bebidas y Jugos', 'Carnes y Embutidos', 'Limpieza y Hogar', 'Snacks y Golosinas'];
    }
    return DEFAULT_CATEGORIES;
  }, [storeTipo, storeIsRetail]);

  const [productos, setProductos] = useState<ProductItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaComercio[]>([]);
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
  const [formCategoria, setFormCategoria] = useState(DEFAULT_CATEGORIES[0]);
  const [formCategoriaId, setFormCategoriaId] = useState('');
  const [formNuevaCategoria, setFormNuevaCategoria] = useState('');
  const [formUnidadMedida, setFormUnidadMedida] = useState('unidad');
  const [formManejaStock, setFormManejaStock] = useState(false);
  const [formStockDisponible, setFormStockDisponible] = useState('');
  const [formRequiereReceta, setFormRequiereReceta] = useState(false);
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [formDisponible, setFormDisponible] = useState(true);
  const [formTieneTamanos, setFormTieneTamanos] = useState(false);
  const [formTamanos, setFormTamanos] = useState<TamanoItem[]>([]);

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [bulkItems, setBulkItems] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [bulkError, setBulkError] = useState('');

  const handleDownloadTemplate = () => {
    const csvContent =
      'nombre,descripcion,precio,categoria,unidad_medida,maneja_stock,stock_disponible,requiere_receta\n' +
      'Arroz Extra 1kg,Grano largo enriquecido calidad superior,1.40,Víveres y Abarrotes,kg,true,100,false\n' +
      'Aceite Palma 1L,Aceite vegetal comestible puro,2.25,Víveres y Abarrotes,litro,true,50,false\n' +
      'Paracetamol 500mg,Caja con 20 tabletas analgésico y antipirético,1.80,Farmacia y Salud,caja,true,40,false\n' +
      'Amoxicilina 500mg,Antibiótico bajo receta médica,4.50,Farmacia y Salud,caja,true,25,true\n' +
      'Cerveza Pilsener 330ml,Lata de cerveza fría nacional,1.25,Licores y Vinos,lata,true,150,false\n' +
      'Seco de Gallina Baba,Plato criollo tradicional de Los Ríos,4.50,Platos Fuertes,unidad,false,,false\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_catalogo_deliveryya.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseBulk = (rawText: string) => {
    setBulkError('');
    try {
      const trimmed = rawText.trim();
      if (!trimmed) {
        setBulkItems([]);
        return;
      }

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          setBulkItems(parsed);
          return;
        }
      }

      const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        throw new Error('El archivo CSV debe tener una fila de encabezados y al menos una fila de datos.');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const items = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx] || '';
        });

        return {
          nombre: row.nombre,
          descripcion: row.descripcion || '',
          precio: parseFloat(row.precio) || 0,
          categoria: row.categoria || 'Víveres y Abarrotes',
          unidad_medida: row.unidad_medida || 'unidad',
          maneja_stock: row.maneja_stock === 'true' || row.maneja_stock === '1',
          stock_disponible: row.stock_disponible ? parseInt(row.stock_disponible, 10) : null,
          requiere_receta: row.requiere_receta === 'true' || row.requiere_receta === '1',
        };
      }).filter(it => it.nombre && it.precio > 0);

      if (items.length === 0) {
        throw new Error('No se encontraron filas válidas con nombre y precio > 0.');
      }

      setBulkItems(items);
    } catch (err: any) {
      setBulkError(err.message || 'Error al procesar el archivo CSV/JSON.');
      setBulkItems([]);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (bulkItems.length === 0) return;
    setBulkLoading(true);
    setBulkError('');
    setBulkProgress(`Iniciando importación de ${bulkItems.length} productos...`);

    let creados = 0;
    let errores = 0;

    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      setBulkProgress(`Importando (${i + 1}/${bulkItems.length}): ${item.nombre}...`);
      try {
        const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/productos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: item.nombre,
            descripcion: item.descripcion,
            precio: item.precio,
            categoria: item.categoria,
            unidadMedida: item.unidad_medida || 'unidad',
            manejaStock: Boolean(item.maneja_stock),
            stockDisponible: item.maneja_stock && item.stock_disponible != null ? item.stock_disponible : null,
            requiereReceta: Boolean(item.requiere_receta),
            isDisponible: true,
          }),
        });
        if (res.ok) {
          creados++;
        } else {
          errores++;
        }
      } catch {
        errores++;
      }
    }

    setBulkLoading(false);
    setBulkProgress('');
    setShowBulkModal(false);
    setBulkData('');
    setBulkItems([]);
    setSuccessMsg(`¡Carga masiva completada! ${creados} productos importados exitosamente.${errores > 0 ? ` (${errores} fallaron)` : ''}`);
    fetchProductos();
    fetchCategorias();
  };

  const fetchCategorias = async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}/categorias`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategorias(data.data);
      }
    } catch (err) {
      console.warn('Error al cargar categorías del comercio:', err);
    }
  };

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
    fetchCategorias();
  }, [comercioId]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormNombre('');
    setFormDesc('');
    setFormPrecio('');
    setFormCategoria(categorias[0]?.nombre || DEFAULT_CATEGORIES[0]);
    setFormCategoriaId(categorias[0]?.id || '');
    setFormNuevaCategoria('');
    setFormUnidadMedida('unidad');
    setFormManejaStock(false);
    setFormStockDisponible('');
    setFormRequiereReceta(false);
    setFormImagenUrl('');
    setFormDisponible(true);
    setFormTieneTamanos(false);
    setFormTamanos([]);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleEditClick = (p: ProductItem) => {
    setEditingProduct(p);
    setFormNombre(p.nombre);
    setFormDesc(p.descripcion || '');
    setFormPrecio(String(p.precio));
    setFormCategoria(p.categoria_nombre || p.categoria || DEFAULT_CATEGORIES[0]);
    setFormCategoriaId(p.categoria_id || '');
    setFormNuevaCategoria('');
    setFormUnidadMedida(p.unidad_medida || 'unidad');
    setFormManejaStock(Boolean(p.maneja_stock));
    setFormStockDisponible(p.stock_disponible !== null && p.stock_disponible !== undefined ? String(p.stock_disponible) : '');
    setFormRequiereReceta(Boolean(p.requiere_receta));
    setFormImagenUrl(p.imagen_url || '');
    setFormDisponible(p.is_disponible);
    if (p.tamanos && Array.isArray(p.tamanos) && p.tamanos.length > 0) {
      setFormTieneTamanos(true);
      setFormTamanos(p.tamanos);
    } else {
      setFormTieneTamanos(false);
      setFormTamanos([]);
    }
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
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${storeIsRetail ? 'el producto' : 'el plato'} "${nombre}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${config.apiBaseUrl}/catalog/producto/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setProductos((prev) => prev.filter((p) => p.id !== productId));
        setSuccessMsg(`${itemLabel} "${nombre}" eliminado del catálogo.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message || 'No se pudo eliminar el producto.');
      }
    } catch (err) {
      setErrorMsg(`Error de red al eliminar ${itemLabel.toLowerCase()}.`);
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
        categoriaId: formCategoriaId || null,
        nuevaCategoriaNombre: formNuevaCategoria.trim() || null,
        unidadMedida: formUnidadMedida,
        manejaStock: formManejaStock,
        stockDisponible: formManejaStock && formStockDisponible !== '' ? parseInt(formStockDisponible, 10) : null,
        requiereReceta: formRequiereReceta,
        imagenUrl: formImagenUrl.trim() || null,
        isDisponible: formDisponible,
        tamanos: formTieneTamanos && formTamanos.length > 0 ? formTamanos.filter(t => t.nombre.trim() && Number(t.precio) > 0) : [],
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
          ? `Producto "${data.data.nombre}" actualizado correctamente.`
          : `¡Producto "${data.data.nombre}" agregado exitosamente!`
      );
      setShowModal(false);
      fetchProductos();
      fetchCategorias();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar producto.');
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
            {storeIsRetail ? <Store size={16} /> : <UtensilsCrossed size={16} />} Portal Aliados · {storeIsRetail ? 'Catálogo e Inventario' : 'Gestión de Menú'}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            {storeIsRetail ? 'Catálogo de Productos & Inventario' : 'Carta de Platos y Disponibilidad en Vivo'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {storeIsRetail
              ? 'Crea, edita y ajusta stock de tus productos al instante. Los cambios se sincronizan en Redis y la app de clientes en Baba & Babahoyo.'
              : 'Crea, edita y pausa platos al instante. Los cambios se sincronizan en Redis y la app de clientes en Baba & Babahoyo.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Descargar plantilla CSV para retail / supermercados / farmacias"
          >
            <Download size={16} /> Plantilla CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setBulkData('');
              setBulkItems([]);
              setBulkError('');
              setShowBulkModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-sky-600/50 bg-sky-950/40 px-4 py-3 text-xs font-bold text-sky-300 hover:bg-sky-900/50"
          >
            <FileSpreadsheet size={16} /> Carga Masiva (CSV / JSON)
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-900/30 hover:from-rose-500 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <Plus size={18} /> Agregar Nuevo {itemLabel}
          </button>
        </div>
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
            placeholder={`Buscar ${itemLabel.toLowerCase()} por nombre o descripción...`}
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
          {Array.from(new Set([...categorias.map(c => c.nombre), ...productos.map(p => p.categoria_nombre || p.categoria)].filter(Boolean))).map((cat) => {
            const count = productos.filter((p) => (p.categoria_nombre || p.categoria) === cat).length;
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
          <h3 className="text-lg font-bold text-white">No hay productos registrados en esta categoría</h3>
          <p className="mt-1 text-sm">Empieza agregando tus primeros productos para que los clientes en Baba puedan pedir.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500"
          >
            <Plus size={16} /> Crear Producto Ahora
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredProductos.map((prod) => (
            <div
              key={prod.id}
              className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-slate-900 card-hover-fx transition-all duration-300 ${
                prod.is_disponible
                  ? 'border-slate-800 hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-950/25'
                  : 'border-rose-950/60 bg-slate-950/80 opacity-75'
              }`}
            >
              <div>
                {/* Imagen del Plato / Producto */}
                <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                  {prod.imagen_url ? (
                    <img
                      src={prod.imagen_url}
                      alt={prod.nombre}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                    {prod.categoria_icono || '🏷️'} {prod.categoria_nombre || prod.categoria || 'Platos Fuertes'}
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
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-emerald-400">
                        ${Number(prod.precio).toFixed(2)}
                      </span>
                      {prod.unidad_medida && prod.unidad_medida !== 'unidad' && (
                        <span className="block text-[11px] text-slate-400">/ {prod.unidad_medida}</span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {prod.descripcion || 'Sin descripción detallada.'}
                  </p>

                  {/* Control Opcional de Stock en Tarjeta */}
                  {prod.maneja_stock ? (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                      {prod.stock_disponible != null && prod.stock_disponible <= 0 ? (
                        <span className="rounded bg-rose-950/80 px-2 py-0.5 font-bold text-rose-400 border border-rose-800/40">
                          ❌ Sin Stock (0)
                        </span>
                      ) : prod.stock_disponible != null && prod.stock_disponible <= 5 ? (
                        <span className="rounded bg-amber-950/80 px-2 py-0.5 font-bold text-amber-300 border border-amber-800/40">
                          ⚡ ¡Quedan {prod.stock_disponible}!
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-semibold text-slate-300 border border-slate-700">
                          📦 Stock: {prod.stock_disponible ?? 0} {prod.unidad_medida || 'uds'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-500 italic">
                      ✨ Stock ilimitado (sin inventario)
                    </div>
                  )}

                  {/* Badges de Tamaños si están configurados */}
                  {prod.tamanos && prod.tamanos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {prod.tamanos.map((t, idx) => (
                        <span key={idx} className="rounded bg-rose-950/40 border border-rose-800/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          {t.nombre}: ${Number(t.precio).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botonera de Acción estilo Rappi Partners */}
              <div className="border-t border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleDisponibilidad(prod.id, prod.is_disponible)}
                    title={prod.is_disponible ? `Pausar ${itemLabel.toLowerCase()} (Agotado por hoy)` : `Reactivar ${itemLabel.toLowerCase()} en catálogo`}
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
                    title={`Editar detalles del ${itemLabel.toLowerCase()}`}
                    className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-2 text-sky-300 hover:bg-slate-700"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(prod.id, prod.nombre)}
                    title={`Eliminar ${itemLabel.toLowerCase()} del catálogo`}
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

      {/* Modal Crear / Editar Plato - Diseño Panorámico Responsivo 2 Columnas */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header Fijo */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  {storeIsRetail ? <Store size={20} /> : <UtensilsCrossed size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {editingProduct ? `Editar ${itemLabel}` : `Crear Nuevo ${itemLabel}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configura los datos del producto, precios, fotos y variaciones de inventario
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-700/60 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo con Scroll y 2 Columnas Widescreen */}
            <form id="productForm" onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Columna Izquierda: Información Principal y Categorización */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      1. Información del Producto
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-slate-300">
                        Nombre del {itemLabel} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        placeholder={storeIsRetail ? "Ej: Ron Abuelo 750ml / Paracetamol 500mg" : "Ej: Seco de Pato Criollo / Hamburguesa Especial"}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300">
                        Categoría en el {storeIsRetail ? 'Catálogo' : 'Menú'} *
                      </label>
                      <select
                        value={formCategoriaId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormCategoriaId(val);
                          if (val === 'NEW') {
                            setFormNuevaCategoria('');
                          } else {
                            const found = categorias.find(c => c.id === val);
                            if (found) setFormCategoria(found.nombre);
                          }
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
                      >
                        <option value="">-- Seleccionar Categoría --</option>
                        {categorias.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icono} {cat.nombre}
                          </option>
                        ))}
                        <option value="NEW">➕ Crear Nueva Categoría...</option>
                      </select>

                      {formCategoriaId === 'NEW' && (
                        <div className="mt-2.5 rounded-xl border border-rose-500/40 bg-rose-950/20 p-3">
                          <label className="block text-[11px] font-bold text-rose-300">
                            Nombre de la Nueva Categoría
                          </label>
                          <input
                            type="text"
                            required
                            value={formNuevaCategoria}
                            onChange={(e) => {
                              setFormNuevaCategoria(e.target.value);
                              setFormCategoria(e.target.value);
                            }}
                            placeholder="Ej: Mariscos, Bebidas Frías, Postres..."
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300">
                        Descripción o Ingredientes
                      </label>
                      <textarea
                        rows={3}
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        placeholder="Detalle ingredientes, preparación o acompañamientos (ej. Incluye arroz, maduro y chifle)..."
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300">
                        Unidad de Medida
                      </label>
                      <select
                        value={formUnidadMedida}
                        onChange={(e) => setFormUnidadMedida(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
                      >
                        <option value="unidad">Unidad (ud)</option>
                        <option value="porción">Porción / Plato</option>
                        <option value="kg">Kilogramo (kg)</option>
                        <option value="libra">Libra (lb)</option>
                        <option value="litro">Litro (L)</option>
                        <option value="botella">Botella</option>
                        <option value="paquete">Paquete</option>
                        <option value="caja">Caja</option>
                      </select>
                    </div>
                  </div>

                  {/* Estado y Políticas */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Disponibilidad y Restricciones
                    </h4>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <input
                        type="checkbox"
                        id="prodDisponible"
                        checked={formDisponible}
                        onChange={(e) => setFormDisponible(e.target.checked)}
                        className="h-4 w-4 rounded accent-rose-600"
                      />
                      <label htmlFor="prodDisponible" className="text-xs font-medium text-slate-200 cursor-pointer">
                        {storeIsRetail ? 'Producto activo y visible para los clientes en la tienda' : 'Plato activo y visible para los clientes en el menú'}
                      </label>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-rose-900/30 bg-rose-950/20 p-3">
                      <input
                        type="checkbox"
                        id="prodRequiereReceta"
                        checked={formRequiereReceta}
                        onChange={(e) => setFormRequiereReceta(e.target.checked)}
                        className="h-4 w-4 rounded accent-rose-600"
                      />
                      <label htmlFor="prodRequiereReceta" className="text-xs font-medium text-rose-300 cursor-pointer">
                        💊 Requiere receta médica (Para farmacias o medicina bajo prescripción)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Precios, Inventario, Tamaños e Imagen */}
                <div className="space-y-4">
                  {/* Precios e Inventario */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      2. Precio y Existencias
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-slate-300">
                        Precio de Venta Base ($ USD) *
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-2.5 text-sm font-bold text-emerald-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.05"
                          required
                          value={formPrecio}
                          onChange={(e) => setFormPrecio(e.target.value)}
                          placeholder="4.50"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-3.5 text-sm font-semibold text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* CONTROL OPCIONAL DE STOCK / INVENTARIO */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="prodManejaStock"
                          checked={formManejaStock}
                          onChange={(e) => setFormManejaStock(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-rose-600"
                        />
                        <div>
                          <label htmlFor="prodManejaStock" className="text-xs font-bold text-slate-200 cursor-pointer">
                            ¿Controlar inventario / stock numérico?
                          </label>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            {formManejaStock
                              ? 'Se descontará con cada venta. Si llega a 0, figurará como Agotado.'
                              : 'Desactivado: Recomendado para restaurantes con cocina en vivo (stock ilimitado).'}
                          </p>
                        </div>
                      </div>

                      {formManejaStock && (
                        <div className="pt-2 border-t border-slate-800">
                          <label className="block text-xs font-bold text-amber-400">Cantidad de Stock Disponible *</label>
                          <input
                            type="number"
                            min="0"
                            required={formManejaStock}
                            value={formStockDisponible}
                            onChange={(e) => setFormStockDisponible(e.target.value)}
                            placeholder="Ej: 20"
                            className="mt-1 w-full rounded-xl border border-amber-500/40 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OPCIONES DE TAMAÑOS / PRESENTACIONES */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="prodTieneTamanos"
                          checked={formTieneTamanos}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormTieneTamanos(checked);
                            if (checked && formTamanos.length === 0) {
                              const base = parseFloat(formPrecio) || 2.50;
                              setFormTamanos([
                                { nombre: '1/2 Libra / Pequeño', precio: Math.round(base * 0.6 * 100) / 100 },
                                { nombre: '1 Libra / Estándar', precio: base },
                              ]);
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded accent-rose-600"
                        />
                        <div>
                          <label htmlFor="prodTieneTamanos" className="text-xs font-bold text-slate-200 cursor-pointer">
                            ¿Ofrecer diferentes tamaños o porciones?
                          </label>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            Permite elegir Personal, Familiar, 1/2 libra, etc., cada una con su precio independiente.
                          </p>
                        </div>
                      </div>
                      {formTieneTamanos && (
                        <button
                          type="button"
                          onClick={() => setFormTamanos(prev => [...prev, { nombre: '', precio: parseFloat(formPrecio) || 1.50 }])}
                          className="rounded-lg bg-rose-950/80 border border-rose-800/40 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-900"
                        >
                          + Añadir
                        </button>
                      )}
                    </div>

                    {formTieneTamanos && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        {formTamanos.map((tam, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              required={formTieneTamanos}
                              value={tam.nombre}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormTamanos(prev => prev.map((t, i) => i === idx ? { ...t, nombre: val } : t));
                              }}
                              placeholder="Ej: 1 Libra, Personal, 500g"
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                            />
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.05"
                                required={formTieneTamanos}
                                value={tam.precio}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setFormTamanos(prev => prev.map((t, i) => i === idx ? { ...t, precio: val } : t));
                                }}
                                placeholder="Precio"
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-6 pr-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormTamanos(prev => prev.filter((_, i) => i !== idx))}
                              className="rounded p-1 text-slate-500 hover:bg-rose-950/60 hover:text-rose-400"
                              title="Eliminar este tamaño"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FOTOGRAFÍA DEL PRODUCTO CON SUBIDA Y PREVISUALIZACIÓN */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                    <label className="block text-xs font-bold text-slate-300">
                      Fotografía del {itemLabel}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          📁 Subir archivo local
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('La imagen no debe superar los 5MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (uploadEvt) => {
                                setFormImagenUrl(uploadEvt.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-rose-400 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          🌐 O enlace URL web
                        </label>
                        <input
                          type="url"
                          value={formImagenUrl}
                          onChange={(e) => setFormImagenUrl(e.target.value)}
                          placeholder="https://images.unsplash..."
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Previsualización en vivo */}
                    {formImagenUrl && (
                      <div className="relative mt-2 h-40 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 group">
                        <img
                          src={formImagenUrl}
                          alt="Vista previa"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => setFormImagenUrl('')}
                          className="absolute right-2 top-2 rounded-lg bg-rose-600/90 p-1.5 text-white hover:bg-rose-600 shadow-md transition-all"
                          title="Eliminar imagen"
                        >
                          <X size={14} />
                        </button>
                        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          ✓ Foto cargada
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Footer Fijo con Acciones */}
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/30 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : editingProduct ? (
                  'Guardar Cambios'
                ) : (
                  `Agregar al ${storeIsRetail ? 'Catálogo' : 'Menú'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva de Productos */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Carga Masiva de Catálogo (Supermercados, Farmacias, Licoreras)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Importa decenas o cientos de artículos pegando datos CSV o cargando un archivo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800/60 p-3 text-xs text-slate-300">
                <span>
                  Formato esperado: <code className="text-sky-300">nombre, descripcion, precio, categoria, unidad_medida, maneja_stock, stock_disponible, requiere_receta</code>
                </span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1 font-bold text-sky-400 hover:underline"
                >
                  <Download size={13} /> Descargar plantilla ejemplo
                </button>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-300">
                  Subir archivo CSV / JSON o pegar contenido
                </label>
                <div className="mb-2">
                  <input
                    type="file"
                    accept=".csv, .json, text/csv, application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          if (content) {
                            setBulkData(content);
                            handleParseBulk(content);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>

                <textarea
                  rows={6}
                  value={bulkData}
                  onChange={(e) => {
                    setBulkData(e.target.value);
                    handleParseBulk(e.target.value);
                  }}
                  placeholder="Pega aquí las filas de tu archivo CSV o array JSON..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {bulkError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Vista previa de productos a importar */}
              {bulkItems.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      Vista Previa ({bulkItems.length} productos detectados)
                    </span>
                    <span className="text-emerald-400">✓ Formato validado</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 sticky top-0 text-slate-400">
                        <tr>
                          <th className="p-2">Nombre</th>
                          <th className="p-2">Categoría</th>
                          <th className="p-2">Precio</th>
                          <th className="p-2">Unidad</th>
                          <th className="p-2">Stock</th>
                          <th className="p-2">Receta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {bulkItems.slice(0, 10).map((it, idx) => (
                          <tr key={idx} className="text-slate-300">
                            <td className="p-2 font-medium">{it.nombre}</td>
                            <td className="p-2 text-slate-400">{it.categoria}</td>
                            <td className="p-2 font-bold text-emerald-400">${Number(it.precio).toFixed(2)}</td>
                            <td className="p-2">{it.unidad_medida || 'unidad'}</td>
                            <td className="p-2">{it.maneja_stock ? (it.stock_disponible ?? 'Inf') : 'No'}</td>
                            <td className="p-2">{it.requiere_receta ? '💊 Sí' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkItems.length > 10 && (
                      <p className="p-2 text-center text-xs text-slate-500">
                        ...y {bulkItems.length - 10} productos más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {bulkProgress && (
                <div className="flex items-center gap-2 rounded-xl bg-sky-950/40 p-3 text-xs text-sky-300 border border-sky-800">
                  <Loader2 size={16} className="animate-spin shrink-0" />
                  <span>{bulkProgress}</span>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={bulkLoading || bulkItems.length === 0}
                  onClick={handleExecuteBulkImport}
                  className="flex-1 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-900/30 hover:from-sky-500 hover:to-sky-600 disabled:opacity-50"
                >
                  {bulkLoading ? (
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  ) : (
                    `Importar ${bulkItems.length} Productos al Catálogo`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
