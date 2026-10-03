// Servicio de Catálogo, Comercios, Tarifas y Promociones para App Móvil Cliente
// Con soporte para API en Túnel Remoto, headers de Bypass y Fallback por Comercio específico

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

const COMMON_HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'Bypass-Tunnel-Reminder': 'true',
};

// Fallback auténtico de Comercios en Baba y Babahoyo
export const FALLBACK_COMERCIOS: ComercioItem[] = [
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

// Fallback de Productos INDIVIDUAL por cada Local Comercial
export const FALLBACK_PRODUCTS_BY_STORE: Record<string, ProductoItem[]> = {
  // 1. Picantería El Buen Sabor - Baba
  '55555555-5555-5555-5555-555555555555': [
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
  ],

  // 2. Burger & Wings Baba
  '09a73128-1943-4d28-8f7f-d730f2817864': [
    {
      id: 'bw-prod-001',
      nombre: 'Combo 12 Alitas BBQ + Papas Rústicas',
      descripcion: 'Alitas crocantes bañadas en salsa BBQ artesanal con papas',
      precio: 8.50,
      imagen_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500',
      is_disponible: true,
      categoria: 'Alitas y Combos',
    },
    {
      id: 'bw-prod-002',
      nombre: 'Hamburguesa Smash Doble Carne y Queso',
      descripcion: 'Doble carne smash, queso cheddar derretido, tocino y salsa de la casa',
      precio: 7.25,
      imagen_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
      is_disponible: true,
      categoria: 'Hamburguesas',
    },
    {
      id: 'bw-prod-003',
      nombre: 'Hamburguesa Doble Queso y Tocino',
      descripcion: 'Carne artesanal, queso americano, tocino ahumado y cebolla caramelizada',
      precio: 6.50,
      imagen_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500',
      is_disponible: true,
      categoria: 'Hamburguesas',
    },
    {
      id: 'bw-prod-004',
      nombre: 'Salchipapa Especial con Queso Cheddar',
      descripcion: 'Papas fritas crocantes, salchicha premium y baño de queso cheddar',
      precio: 4.00,
      imagen_url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500',
      is_disponible: true,
      categoria: 'Entradas',
    },
    {
      id: 'bw-prod-005',
      nombre: 'Gaseosa Coca-Cola 500ml',
      descripcion: 'Botella personal bien helada',
      precio: 1.25,
      imagen_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500',
      is_disponible: true,
      categoria: 'Bebidas',
    },
  ],

  // 3. EDEM PESCADOS Y MARISCOS
  '3efe0c84-0b81-4191-8193-699c81fc26be': [
    {
      id: 'ed-prod-001',
      nombre: 'Filete de Corvina Fresca (Libra)',
      descripcion: 'Filete limpio sin espinas, listo para freír o sudar',
      precio: 2.75,
      imagen_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500',
      is_disponible: true,
      categoria: 'Pescados',
      unidad_medida: 'libra',
    },
    {
      id: 'ed-prod-002',
      nombre: 'Camarón Grande de Exportación (Libra)',
      descripcion: 'Camarón fresco de piscina, ideal para ceviches y apanados',
      precio: 3.00,
      imagen_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500',
      is_disponible: true,
      categoria: 'Mariscos',
      unidad_medida: 'libra',
    },
    {
      id: 'ed-prod-003',
      nombre: 'Albacora Fresca para Encebollado (Libra)',
      descripcion: 'Lomo rojo fresco especial para el mejor encebollado criollo',
      precio: 2.75,
      imagen_url: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=500',
      is_disponible: true,
      categoria: 'Pescados',
      unidad_medida: 'libra',
    },
    {
      id: 'ed-prod-004',
      nombre: 'Calamar Limpio (Libra)',
      descripcion: 'Anillos y tentáculos limpios para mariscos salteados',
      precio: 2.00,
      imagen_url: 'https://images.unsplash.com/photo-1606851094655-b2593a9af63f?w=500',
      is_disponible: true,
      categoria: 'Mariscos',
      unidad_medida: 'libra',
    },
    {
      id: 'ed-prod-005',
      nombre: 'Dorado Fresco en Postas (Libra)',
      descripcion: 'Pescado de carne blanca en postas de primera calidad',
      precio: 3.00,
      imagen_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500',
      is_disponible: true,
      categoria: 'Pescados',
      unidad_medida: 'libra',
    },
  ],

  // 4. EDEM EXPRESS (Agua y Gas)
  '996d5ed0-1015-4289-aaf5-8d2cd80601d3': [
    {
      id: 'exp-prod-001',
      nombre: 'Botellón de Agua Purificada 20L',
      descripcion: 'Agua de mesa purificada con precinto de seguridad a domicilio',
      precio: 1.25,
      imagen_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500',
      is_disponible: true,
      categoria: 'Agua',
    },
    {
      id: 'exp-prod-002',
      nombre: 'Gas Doméstico 15Kg (Cambio de cilindro)',
      descripcion: 'Entrega rápida a domicilio en Baba Centro y alrededores',
      precio: 2.50,
      imagen_url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500',
      is_disponible: true,
      categoria: 'General',
    },
    {
      id: 'exp-prod-003',
      nombre: 'Pack de 6 Aguas Dasani 500ml',
      descripcion: 'Pack familiar de botellas de agua fría',
      precio: 0.50,
      imagen_url: 'https://images.unsplash.com/photo-1559839914-ba2a114757c2?w=500',
      is_disponible: true,
      categoria: 'Agua',
    },
  ],

  // 5. Restaurante El Gran Chef Babahoyo
  '77777777-7777-7777-7777-777777777777': [
    {
      id: 'gc-prod-001',
      nombre: 'Cazuela Mixta de Mariscos',
      descripcion: 'Plátano verde con maní, pescado fresco, camarón y calamar en paila de barro',
      precio: 7.50,
      imagen_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500',
      is_disponible: true,
      categoria: 'Mariscos',
    },
    {
      id: 'gc-prod-002',
      nombre: 'Encebollado Mixto Especial',
      descripcion: 'Albacora fresca con camarón, yuca suave, chifles y tostado',
      precio: 4.50,
      imagen_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500',
      is_disponible: true,
      categoria: 'Sopas Criollas',
    },
    {
      id: 'gc-prod-003',
      nombre: 'Corvina Frita con Patacones y Ensalada',
      descripcion: 'Corvina entera crocante con patacones de verde y ensalada fresca',
      precio: 8.00,
      imagen_url: 'https://images.unsplash.com/photo-1535400255456-984241443b29?w=500',
      is_disponible: true,
      categoria: 'Pescados y Mariscos',
    },
    {
      id: 'gc-prod-004',
      nombre: 'Arroz Marinero Especial Babahoyo',
      descripcion: 'Arroz con concha, camarón, calamar, cangrejo y maduro frito',
      precio: 8.50,
      imagen_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500',
      is_disponible: true,
      categoria: 'Platos Fuertes',
    },
    {
      id: 'gc-prod-005',
      nombre: 'Bife de Chorizo a la Parrilla',
      descripcion: 'Corte de res jugoso al carbón con papas rústicas y chimichurri',
      precio: 9.50,
      imagen_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=500',
      is_disponible: true,
      categoria: 'Carnes y Parrillas',
    },
    {
      id: 'gc-prod-006',
      nombre: 'Limonada Imperial con Menta',
      descripcion: 'Jarra personal de limonada frappé con hierbabuena fresca',
      precio: 2.00,
      imagen_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500',
      is_disponible: true,
      categoria: 'Bebidas',
    },
  ],
};

export async function fetchComercios(
  apiBaseUrl: string,
  params?: { ciudad?: string; tipo?: string },
  fetchFn = fetch
): Promise<ComercioItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    const queryParts: string[] = [];
    if (params?.ciudad) queryParts.push(`ciudad=${encodeURIComponent(params.ciudad)}`);
    if (params?.tipo && params.tipo !== 'todos') queryParts.push(`tipo=${encodeURIComponent(params.tipo)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const res = await fetchFn(`${baseUrl}/catalog/comercios${qs}`, {
      headers: COMMON_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      return json.data.map((c: any) => ({
        ...c,
        costo_base_envio: Number(c.costo_base_envio) || 1.0,
        tarifa_fija_local: c.tarifa_fija_local != null ? Number(c.tarifa_fija_local) : undefined,
        calificacion: Number(c.calificacion) || 4.5,
      }));
    }
    throw new Error('Lista vacía');
  } catch (err) {
    clearTimeout(timer);
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
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/catalog/comercio/${comercioId}/productos`;
    const res = await fetchFn(url, {
      headers: COMMON_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      return json.data.map((p: any) => ({
        ...p,
        precio: Number(p.precio) || 0,
        tamanos: Array.isArray(p.tamanos)
          ? p.tamanos.map((s: any) => ({ ...s, precio: Number(s.precio) || 0 }))
          : [],
      }));
    }
    throw new Error('Sin productos');
  } catch {
    clearTimeout(timer);
    // Retornar exactamente los productos del comercio seleccionado
    if (FALLBACK_PRODUCTS_BY_STORE[comercioId]) {
      return FALLBACK_PRODUCTS_BY_STORE[comercioId];
    }
    // Fallback secundario si es Picantería Baba
    return FALLBACK_PRODUCTS_BY_STORE['55555555-5555-5555-5555-555555555555'];
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
    const res = await fetchFn(url, {
      headers: COMMON_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      return json.data.map((t: any) => ({
        ...t,
        tarifa_envio: Number(t.tarifa_envio) || 0,
        tiempo_estimado_min: Number(t.tiempo_estimado_min) || 20,
      }));
    }
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
      headers: {
        'Content-Type': 'application/json',
        ...COMMON_HEADERS,
      },
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
