// Servicio de Catálogo, Comercios, Tarifas y Promociones para App Móvil Cliente

export interface ComercioItem {
  id: string;
  nombre_comercial: string;
  descripcion?: string;
  direccion: string;
  ciudad?: string;
  categoria?: string;
  tiempo_entrega_promedio: number;
  costo_base_envio: number;
  subsidia_envio?: boolean;
  tarifa_fija_local?: number;
  is_abierto: boolean;
  tipo_comercio_id?: string;
  tipo_comercio_nombre?: string;
  tipo_comercio_icono?: string;
  tipo_layout?: string;
  distancia_km?: number;
}

export interface ProductoItem {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen_url?: string;
  categoria?: string;
  categoria_id?: string;
  is_disponible: boolean;
  unidad_medida?: string;
  maneja_stock?: boolean;
  stock_disponible?: number | null;
  requiere_receta?: boolean;
  tamanos?: Array<{ nombre: string; precio: number }>;
}

export interface ZonaTarifa {
  id: string;
  canton: string;
  zona_nombre: string;
  tarifa_envio: number;
  tiempo_estimado_min: number;
  is_activa: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  descuento: number;
  codigo?: string;
  tipo?: string;
  cupon?: {
    id: string;
    codigo: string;
    titulo: string;
    descripcion: string;
    tipo: string;
    valor: number;
    tope_descuento_maximo?: number;
    compra_minima?: number;
  };
}

export async function fetchComercios(
  apiBaseUrl: string,
  params?: { ciudad?: string; tipo?: string },
  fetchFn = fetch
): Promise<ComercioItem[]> {
  try {
    const url = new URL(`${apiBaseUrl.replace(/\/$/, '')}/catalog/comercios`);
    if (params?.ciudad) url.searchParams.set('ciudad', params.ciudad);
    if (params?.tipo && params.tipo !== 'todos') url.searchParams.set('tipo', params.tipo);

    const res = await fetchFn(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Fallback a comercios locales:', err);
    return [
      {
        id: '55555555-5555-5555-5555-555555555555',
        nombre_comercial: 'Picantería El Buen Sabor - Baba Centro',
        descripcion: 'Platos típicos montuvios, secos y asados al carbón.',
        direccion: 'Calle Bolívar y Sucre, Baba',
        tiempo_entrega_promedio: 30,
        costo_base_envio: 1.00,
        is_abierto: true,
        tipo_comercio_nombre: 'Restaurantes',
        tipo_comercio_icono: '🍔',
        categoria: 'Platos Típicos',
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        nombre_comercial: 'Restaurante El Gran Chef Babahoyo',
        descripcion: 'Mariscos frescos, cazuelas y parrilladas gourmet.',
        direccion: 'Av. 9 de Octubre y Pedro Carbo, Babahoyo',
        tiempo_entrega_promedio: 35,
        costo_base_envio: 1.50,
        is_abierto: true,
        tipo_comercio_nombre: 'Restaurantes',
        tipo_comercio_icono: '🍤',
        categoria: 'Mariscos y Carnes',
      },
    ];
  }
}

export async function fetchProductosComercio(
  apiBaseUrl: string,
  comercioId: string,
  fetchFn = fetch
): Promise<ProductoItem[]> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/catalog/comercio/${comercioId}/productos`;
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('Fallback a productos locales:', err);
    return [];
  }
}

export async function fetchTarifas(
  apiBaseUrl: string,
  fetchFn = fetch
): Promise<ZonaTarifa[]> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/config/tarifas`;
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    return [
      { id: 'z1', canton: 'Baba', zona_nombre: 'Baba Urbano (Centro)', tarifa_envio: 1.00, tiempo_estimado_min: 20, is_activa: true },
      { id: 'z2', canton: 'Baba', zona_nombre: 'Baba Periferia y Sectores', tarifa_envio: 1.50, tiempo_estimado_min: 30, is_activa: true },
      { id: 'z3', canton: 'Baba', zona_nombre: 'Recintos y Zonas Rurales', tarifa_envio: 2.50, tiempo_estimado_min: 45, is_activa: true },
      { id: 'z4', canton: 'Babahoyo', zona_nombre: 'Babahoyo Urbano Central', tarifa_envio: 1.50, tiempo_estimado_min: 25, is_activa: true },
    ];
  }
}

export async function validateCoupon(
  apiBaseUrl: string,
  codigo: string,
  subtotal: number,
  fetchFn = fetch
): Promise<CouponValidationResult> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/promotions/validate`;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigo.trim().toUpperCase(), subtotal }),
    });
    const json = await res.json();
    if (!res.ok || !json.success || !json.valid) {
      return {
        valid: false,
        message: json.message || 'Cupón inválido o no cumple las condiciones',
        descuento: 0,
      };
    }
    return {
      valid: true,
      message: json.message || '¡Cupón aplicado!',
      descuento: Number(json.descuento) || 0,
      codigo: json.cupon?.codigo || codigo.toUpperCase(),
      tipo: json.tipo,
      cupon: json.cupon,
    };
  } catch (err) {
    return {
      valid: false,
      message: 'No se pudo validar el cupón con el servidor',
      descuento: 0,
    };
  }
}
