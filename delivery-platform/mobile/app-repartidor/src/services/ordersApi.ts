// Servicio de integración API de Pedidos y Despacho para Repartidores en Baba y Babahoyo

export interface OrderItem {
  producto: string;
  cantidad: number;
  precio_unitario: number;
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
  comercio_lat: number;
  comercio_lon: number;
  items?: OrderItem[];
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Bypass-Tunnel-Reminder': 'true',
};

export async function fetchAvailableOrders(
  apiBaseUrl: string,
  includePending = true,
  signal?: AbortSignal
): Promise<BackendOrder[]> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/orders/disponibles/reparto?includePending=${includePending}`;
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

