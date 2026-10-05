// Servicio de Telemetría y Seguimiento para App Cliente (Baba y Babahoyo)

export interface OrderTrackingEta {
  pedidoId: string;
  estado: string;
  repartidorId?: string;
  origen: { lat: number; lon: number; nombre?: string };
  repartidor?: { lat: number; lon: number; heading?: number; speed?: number };
  destino: { lat: number; lon: number };
  distanciaMetros: number;
  etaMinutos: number;
  routeCoordinates?: Array<[number, number]>;
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

const FALLBACK_TUNNEL_URL = 'https://cocktail-martial-dear-back.trycloudflare.com/api/v1';

export async function safeFetch(primaryUrl: string, init?: RequestInit, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(primaryUrl, { ...init, signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(`Tunnel status ${res.status}`);
    }
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (primaryUrl.includes('loca.lt')) {
      const fallbackUrl = primaryUrl.replace('https://delivery-baba-api.loca.lt/api/v1', FALLBACK_TUNNEL_URL);
      return await fetch(fallbackUrl, init);
    } else if (primaryUrl.includes('trycloudflare.com')) {
      const fallbackUrl = primaryUrl.replace(FALLBACK_TUNNEL_URL, 'https://delivery-baba-api.loca.lt/api/v1');
      return await fetch(fallbackUrl, init);
    }
    throw err;
  }
}

export async function fetchOrderEta(
  apiBaseUrl: string,
  pedidoId: string,
  fetchFn = safeFetch
): Promise<OrderTrackingEta> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/pedido/${pedidoId}/eta`;
  const res = await fetchFn(url, {
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
  });
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
    repartidor: data.repartidor,
    destino: data.destino,
    distanciaMetros: data.distanciaMetros,
    etaMinutos: data.etaMinutos,
  };
}

export async function fetchDriverPosition(
  apiBaseUrl: string,
  repartidorId: string,
  fetchFn = safeFetch
): Promise<DriverLivePos> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/driver-pos/${repartidorId}`;
  const res = await fetchFn(url, {
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
  });
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
  fetchFn = safeFetch
): Promise<CalculatedDeliveryFee> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/calcular-tarifa`;
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    },
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

export interface GeocodingResultItem {
  id: string;
  direccion: string;
  barrio: string;
  canton: 'baba' | 'babahoyo' | 'montalvo';
  lat: number;
  lon: number;
  referencia: string;
  tipo: 'parque' | 'calle' | 'salud' | 'comercial' | 'institucional' | 'residencial';
}

export async function searchGeocodingAddresses(
  apiBaseUrl: string,
  query = '',
  canton = '',
  fetchFn = safeFetch
): Promise<GeocodingResultItem[]> {
  try {
    const qPart = query ? `q=${encodeURIComponent(query)}` : '';
    const cPart = canton ? `canton=${encodeURIComponent(canton)}` : '';
    const qs = [qPart, cPart].filter(Boolean).join('&');
    const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/geocoding/search${qs ? '?' + qs : ''}`;
    const res = await fetchFn(url, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

export async function reverseGeocodeAddress(
  apiBaseUrl: string,
  lat: number,
  lon: number,
  fetchFn = safeFetch
): Promise<GeocodingResultItem | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/tracking/geocoding/reverse?lat=${lat}&lon=${lon}`;
    const res = await fetchFn(url, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.data ? data.data : null;
  } catch {
    return null;
  }
}

