// Servicio de integración API de Pedidos y Despacho para Repartidores en Baba, Babahoyo y Montalvo

export interface OrderItem {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  unidad_medida?: string;
  requiere_receta?: boolean;
}

export interface BackendOrder {
  id: string;
  estado: string;
  metodo_pago: 'efectivo' | 'transferencia' | string;
  subtotal: string | number;
  costo_envio: string | number;
  total: string | number;
  ganancia_repartidor?: string | number;
  direccion_entrega: string;
  notas?: string;
  lat_entrega: number;
  lon_entrega: number;
  cliente_nombre: string;
  cliente_telefono?: string;
  comercio_nombre: string;
  comercio_direccion: string;
  comercio_telefono?: string;
  comercio_lat: number;
  comercio_lon: number;
  items?: OrderItem[];
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  // Campos de Vertical de Negocio
  tipo_comercio_id?: string;
  tipo_negocio_nombre?: string;
  vertical_layout?: string;
  requiere_cocina?: boolean;
  permite_recetas?: boolean;
  control_edad_18?: boolean;
  preferencia_sustitucion?: string;
  numero_bultos?: number;
  receta_url?: string;
  pedido_requiere_receta?: boolean;
  pedido_control_edad_18?: boolean;
  // Ruteo y Tiempos de Despacho
  repartidor_asignado_inicial?: string;
  fecha_expiracion_oferta?: string;
  es_oferta_prioritaria?: boolean;
  distancia_al_comercio_km?: number;
  distancia_entrega_km?: number;
  distancia_total_km?: number;
  eta_recogida_min?: number;
  eta_entrega_min?: number;
}

export interface DriverProfile {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  tipo_vehiculo: string;
  modelo_vehiculo: string;
  placa_vehiculo: string;
  cant_entregas_completadas: number;
  calificacion_promedio: string | number;
  lat: number;
  lon: number;
  ciudad: string;
}

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Bypass-Tunnel-Reminder': 'true',
};

export async function fetchAvailableOrders(
  apiBaseUrl: string,
  includePending = true,
  driverLat?: number,
  driverLon?: number,
  repartidorId?: string,
  signal?: AbortSignal
): Promise<BackendOrder[]> {
  let url = `${apiBaseUrl.replace(/\/$/, '')}/orders/disponibles/reparto?includePending=${includePending}`;
  if (driverLat !== undefined && driverLon !== undefined && !isNaN(driverLat) && !isNaN(driverLon)) {
    url += `&lat=${driverLat}&lon=${driverLon}`;
  }
  if (repartidorId) {
    url += `&repartidorId=${encodeURIComponent(repartidorId)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: COMMON_HEADERS,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al consultar pedidos disponibles.`);
  }

  const data = await response.json();
  if (!data.success || !Array.isArray(data.data)) {
    return [];
  }
  return data.data;
}

export async function fetchActiveOrder(
  apiBaseUrl: string,
  repartidorId = 'usr-repartidor-01',
  signal?: AbortSignal
): Promise<BackendOrder | null> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/repartidor/${encodeURIComponent(repartidorId)}/activo`;
  const response = await fetch(url, {
    method: 'GET',
    headers: COMMON_HEADERS,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al consultar pedido activo.`);
  }

  const data = await response.json();
  return data.success && data.data ? data.data : null;
}

export async function fetchOrderHistory(
  apiBaseUrl: string,
  repartidorId = 'usr-repartidor-01',
  signal?: AbortSignal
): Promise<BackendOrder[]> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/repartidor/${encodeURIComponent(repartidorId)}/historial`;
  const response = await fetch(url, {
    method: 'GET',
    headers: COMMON_HEADERS,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al consultar historial de entregas.`);
  }

  const data = await response.json();
  return data.success && Array.isArray(data.data) ? data.data : [];
}

export async function acceptOrder(
  apiBaseUrl: string,
  pedidoId: string,
  repartidorId = 'usr-repartidor-01'
): Promise<BackendOrder> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/${encodeURIComponent(pedidoId)}/tomar`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: COMMON_HEADERS,
    body: JSON.stringify({ repartidorId }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `No se pudo tomar el pedido #${pedidoId.slice(0, 8)}`);
  }

  const data = await response.json();
  return data.data;
}

export async function deliverOrder(
  apiBaseUrl: string,
  pedidoId: string
): Promise<BackendOrder> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/${encodeURIComponent(pedidoId)}/entregar`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `No se pudo marcar como entregado el pedido #${pedidoId.slice(0, 8)}`);
  }

  const data = await response.json();
  return data.data;
}

export async function releaseOrder(
  apiBaseUrl: string,
  pedidoId: string,
  motivo = 'Avería mecánica o emergencia'
): Promise<boolean> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/${encodeURIComponent(pedidoId)}/liberar`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: COMMON_HEADERS,
    body: JSON.stringify({ motivo }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `No se pudo liberar el pedido #${pedidoId.slice(0, 8)}`);
  }

  return true;
}

export async function rejectOffer(
  apiBaseUrl: string,
  pedidoId: string
): Promise<boolean> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/${encodeURIComponent(pedidoId)}/rechazar-oferta`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `No se pudo rechazar la oferta del pedido #${pedidoId.slice(0, 8)}`);
  }

  return true;
}

export async function fetchDriversList(apiBaseUrl: string): Promise<DriverProfile[]> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/repartidores/lista`;
  const response = await fetch(url, {
    method: 'GET',
    headers: COMMON_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} al consultar lista de repartidores.`);
  }

  const data = await response.json();
  if (data.success && Array.isArray(data.data)) {
    return data.data.map((d: any) => {
      let ciudad = 'Baba';
      const n = (d.nombre || '').toLowerCase();
      const lon = parseFloat(d.lon);
      if (n.includes('babahoyo') || (lon > -79.60 && lon < -79.40)) {
        ciudad = 'Babahoyo';
      } else if (n.includes('montalvo') || (lon > -79.40 && lon < -79.10)) {
        ciudad = 'Montalvo';
      }
      return {
        ...d,
        ciudad,
      };
    });
  }
  return [];
}
