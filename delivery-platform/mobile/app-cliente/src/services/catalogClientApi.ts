// Servicio de Catálogo, Comercios, Tarifas y Promociones para App Móvil Cliente
// Con soporte Offline-First y Timeout de seguridad para evitar pantallas congeladas

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

// Fallback auténtico de Comercios en Baba y Babahoyo
const FALLBACK_COMERCIOS: ComercioItem[] = [
  {
    id: '55555555-5555-5555-5555-555555555555',
    nombre_comercial: 'Picantería El Buen Sabor - Baba Centro',
    descripcion: 'Comida criolla típica, secos y asados en el corazón de Baba',
    direccion: 'Calle Bolívar y Sucre, Baba',
    ciudad: 'baba',
    tiempo_entrega_promedio: 25,
    costo_base_envio: 1.00,
    subsidia_envio: false,
    is_abierto: true,
    tipo_comercio_id: 'restaurante',
    tipo_comercio_nombre: 'Restaurantes & Cafeterías',
    tipo_comercio_icono: '🍲',
    categoria: 'Platos Típicos',
  },
  {
    id: '09a73128-1943-4d28-8f7f-d730f2817864',
    nombre_comercial: 'Burger & Wings Baba - Av. Guayaquil',
    descripcion: 'Alitas BBQ, hamburguesas smash y papas rústicas',
    direccion: 'Av. Guayaquil y Sucre, Baba',
    ciudad: 'baba',
    tiempo_entrega_promedio: 20,
    costo_base_envio: 1.00,
    subsidia_envio: true,
    is_abierto: true,
    tipo_comercio_id: 'restaurante',
    tipo_comercio_nombre: 'Restaurantes & Cafeterías',
    tipo_comercio_icono: '🍔',
    categoria: 'Comida Rápida',
  },
  {
    id: '3efe0c84-0b81-4191-8193-699c81fc26be',
    nombre_comercial: 'EDEM PESCADOS Y MARISCOS',
    descripcion: 'Pescados frescos de río y mariscos al por mayor y menor',
    direccion: 'Sector San Antonio, Baba',
    ciudad: 'baba',
    tiempo_entrega_promedio: 30,
    costo_base_envio: 1.00,
    subsidia_envio: false,
    is_abierto: true,
    tipo_comercio_id: 'supermercado',
    tipo_comercio_nombre: 'Supermercados & Abarrotes',
    tipo_comercio_icono: '🦐',
    categoria: 'Pescados y Mariscos',
  },
  {
    id: '996d5ed0-1015-4289-aaf5-8d2cd80601d3',
    nombre_comercial: 'EDEM EXPRESS',
    descripcion: 'Botellones de agua, gas doméstico y snacks rápidos',
    direccion: 'Av. Guayaquil, Baba',
    ciudad: 'baba',
    tiempo_entrega_promedio: 15,
    costo_base_envio: 1.00,
    subsidia_envio: false,
    is_abierto: true,
    tipo_comercio_id: 'express',
    tipo_comercio_nombre: 'Tiendas Express & Antojos',
    tipo_comercio_icono: '⚡',
    categoria: 'Agua, GAS y Bebidas',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    nombre_comercial: 'Restaurante El Gran Chef Babahoyo',
    descripcion: 'Gastronomía de mariscos y cortes finos en Babahoyo',
    direccion: 'Av. 9 de Octubre y Pedro Carbo, Babahoyo',
    ciudad: 'babahoyo',
    tiempo_entrega_promedio: 35,
    costo_base_envio: 1.50,
    subsidia_envio: false,
    is_abierto: true,
    tipo_comercio_id: 'restaurante',
    tipo_comercio_nombre: 'Restaurantes & Cafeterías',
    tipo_comercio_icono: '🍤',
    categoria: 'Mariscos y Carnes',
  },
];

// Fallback de platos de Picantería Baba
const FALLBACK_BABA_PRODUCTS: ProductoItem[] = [
  {
    id: '66666666-6666-6666-6666-666666666601',
    nombre: 'Seco de gallina criolla Baba',
    descripcion: 'Preparado con chicha tradicional y hierbitas frescas, arroz y maduro',
    precio: 4.50,
    imagen_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
    is_disponible: true,
    categoria: 'Platos Fuertes',
    tamanos: [
      { nombre: 'Normal', precio: 4.50 },
      { nombre: 'Especial Doble Presa', precio: 6.00 },
    ],
  },
  {
    id: '66666666-6666-6666-6666-666666666602',
    nombre: 'Bolón mixto con queso y chicharrón',
    descripcion: 'Plátano verde majado con queso manaba y chicharrón crocante',
    precio: 3.75,
    imagen_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
    is_disponible: true,
    categoria: 'Desayunos y Tradicional',
  },
  {
    id: '66666666-6666-6666-6666-666666666604',
    nombre: 'Arroz con menestra y carne asada',
    descripcion: 'Carne de res asada al carbón con menestra de lenteja casera',
    precio: 6.50,
    imagen_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
    is_disponible: true,
    categoria: 'Platos Fuertes',
  },
  {
    id: '66666666-6666-6666-6666-666666666605',
    nombre: 'Jugo natural de maracuyá',
    descripcion: 'Jugo natural refrescante de fruta fresca de Los Ríos',
    precio: 1.50,
    imagen_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500',
    is_disponible: true,
    categoria: 'Bebidas',
  },
  {
    id: '66666666-6666-6666-6666-666666666606',
    nombre: 'Patacones con queso criollo',
    descripcion: 'Porción de patacones crocantes con queso fresco de la zona',
    precio: 2.00,
    imagen_url: 'https://cdn.avena.io/avena-recipes-v2/2025/01/dall-e-1736454991711.jpeg',
    is_disponible: true,
    categoria: 'Acompañamientos',
  },
];

export async function fetchComercios(
  apiBaseUrl: string,
  params?: { ciudad?: string; tipo?: string },
  fetchFn = fetch
): Promise<ComercioItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000); // 3 segundos max para responder

  try {
    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    const queryParts: string[] = [];
    if (params?.ciudad) queryParts.push(`ciudad=${encodeURIComponent(params.ciudad)}`);
    if (params?.tipo && params.tipo !== 'todos') queryParts.push(`tipo=${encodeURIComponent(params.tipo)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const res = await fetchFn(`${baseUrl}/catalog/comercios${qs}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      return json.data;
    }
    throw new Error('Lista vacía');
  } catch (err) {
    clearTimeout(timer);
    // Filtrado del fallback offline
    let list = FALLBACK_COMERCIOS;
    if (params?.ciudad) {
      const city = params.ciudad.toLowerCase();
      list = list.filter(c => (c.ciudad || 'baba').toLowerCase() === city);
    }
    if (params?.tipo && params.tipo !== 'todos') {
      const t = params.tipo.toLowerCase();
      list = list.filter(c => (c.tipo_comercio_id || 'restaurante').toLowerCase() === t);
    }
    return list;
  }
}

export async function fetchProductosComercio(
  apiBaseUrl: string,
  comercioId: string,
  fetchFn = fetch
): Promise<ProductoItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/catalog/comercio/${comercioId}/productos`;
    const res = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      return json.data;
    }
    throw new Error('Sin productos');
  } catch {
    clearTimeout(timer);
    return FALLBACK_BABA_PRODUCTS;
  }
}

export async function fetchTarifas(
  apiBaseUrl: string,
  fetchFn = fetch
): Promise<ZonaTarifa[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/config/tarifas`;
    const res = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && json.data.length > 0) return json.data;
    throw new Error('Sin tarifas');
  } catch {
    clearTimeout(timer);
    return [
      { id: 'z1', canton: 'Baba', zona_nombre: 'Baba Urbano (Centro y Barrios)', tarifa_envio: 1.00, tiempo_estimado_min: 20, is_activa: true },
      { id: 'z2', canton: 'Baba', zona_nombre: 'Baba Periferia y Sectores Cercanos', tarifa_envio: 1.50, tiempo_estimado_min: 30, is_activa: true },
      { id: 'z3', canton: 'Baba', zona_nombre: 'Recintos y Zonas Rurales Baba', tarifa_envio: 2.50, tiempo_estimado_min: 45, is_activa: true },
      { id: 'z4', canton: 'Babahoyo', zona_nombre: 'Babahoyo Urbano Central', tarifa_envio: 1.50, tiempo_estimado_min: 25, is_activa: true },
      { id: 'z5', canton: 'Babahoyo', zona_nombre: 'Babahoyo Periferia y El Salto', tarifa_envio: 2.00, tiempo_estimado_min: 35, is_activa: true },
    ];
  }
}

export async function validateCoupon(
  apiBaseUrl: string,
  codigo: string,
  subtotal: number,
  fetchFn = fetch
): Promise<CouponValidationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/promotions/validate`;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigo.trim().toUpperCase(), subtotal }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = await res.json();
    if (!res.ok || !json.success || !json.valid) {
      return {
        valid: false,
        message: json.message || 'Cupón no aplicable',
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
  } catch {
    clearTimeout(timer);
    const code = codigo.trim().toUpperCase();
    if (code === 'BIENVENIDO') {
      return {
        valid: true,
        message: '¡Cupón de Bienvenida aplicado con éxito!',
        descuento: 1.50,
        codigo: 'BIENVENIDO',
      };
    }
    if (code === 'BABA10') {
      return {
        valid: true,
        message: '¡10% de descuento en tu compra!',
        descuento: Math.round(subtotal * 0.10 * 100) / 100,
        codigo: 'BABA10',
      };
    }
    return {
      valid: false,
      message: 'Código de cupón no válido.',
      descuento: 0,
    };
  }
}
