// Servicio de Telemetría y Seguimiento para App Cliente (Baba y Babahoyo)

export interface OrderTrackingEta {
  pedidoId: string;
  estado: string;
  repartidorId?: string;
  origen: { lat: number; lon: number };
  destino: { lat: number; lon: number };
  distanciaMetros: number;
  etaMinutos: number;
}

export interface DriverLivePos {
  repartidorId: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  timestamp: string;
  status: 'online' | 'offline';
}

export interface CalculatedDeliveryFee {
  coberturaValida: boolean;
  zonaNombre?: string;
  canton?: string;
  distanciaKm: number;
  etaMinutos: number;
  tarifaFinal: number;
}

export async function fetchOrderEta(
  apiBaseUrl: string,
  pedidoId: string,
  fetchFn = fetch
): Promise<OrderTrackingEta> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/pedido/${pedidoId}/eta`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar ETA del pedido`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'No se pudo obtener el tracking del pedido');
  }
  return {
    pedidoId: data.pedidoId,
    estado: data.estado,
    repartidorId: data.repartidorId,
    origen: data.origen,
    destino: data.destino,
    distanciaMetros: data.distanciaMetros,
    etaMinutos: data.etaMinutos,
  };
}

export async function fetchDriverPosition(
  apiBaseUrl: string,
  repartidorId: string,
  fetchFn = fetch
): Promise<DriverLivePos> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/driver-pos/${repartidorId}`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar posición del conductor`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error('Respuesta inválida de posición de conductor');
  }
  return json.data;
}

export async function calculateLiveFee(
  apiBaseUrl: string,
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  fetchFn = fetch
): Promise<CalculatedDeliveryFee> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/calcular-tarifa`;
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originLat, originLon, destLat, destLon }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      coberturaValida: false,
      distanciaKm: 0,
      etaMinutos: 0,
      tarifaFinal: 1.50,
    };
  }
  return {
    coberturaValida: data.coberturaValida ?? true,
    zonaNombre: data.zona?.nombre,
    canton: data.zona?.canton,
    distanciaKm: data.distanciaKm,
    etaMinutos: data.etaMinutos,
    tarifaFinal: data.desgloseTarifa?.tarifaFinal ?? 1.50,
  };
}
