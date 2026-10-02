export interface GeoPoint { lat: number; lng: number }
export interface CourierLocation extends GeoPoint { speed: number; heading: number; timestamp?: number }
export interface RoadRoute { points: GeoPoint[]; distance: number; duration: number }

export function validPoint(point: unknown): point is GeoPoint {
  if (!point || typeof point !== 'object') return false;
  const { lat, lng } = point as GeoPoint;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function parseLocation(raw: string, orderId: string, courierId?: string): CourierLocation | null {
  try {
    const message = JSON.parse(raw);
    if (!['courier:location_update', 'DRIVER_LOCATION'].includes(message?.event ?? message?.type)) return null;
    const data = message.payload ?? message.data ?? message;
    const order = data.order_id ?? data.pedidoId;
    const courier = data.courier_id ?? data.repartidorId;
    if (order != null && String(order) !== orderId) return null;
    if (courierId && String(courier) !== courierId) return null;
    const point = { lat: data.lat, lng: data.lng ?? data.lon };
    if (!validPoint(point)) return null;
    const timestamp = data.timestamp == null ? undefined : typeof data.timestamp === 'number' ? data.timestamp : Date.parse(data.timestamp);
    if (timestamp !== undefined && (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000)) return null;
    return { ...point, speed: Number.isFinite(data.speed) ? Math.max(0, data.speed) : 0,
      heading: Number.isFinite(data.heading) ? ((data.heading % 360) + 360) % 360 : 0, timestamp };
  } catch { return null; }
}

export function websocketUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol === 'http:') url.protocol = 'ws:';
  if (url.protocol === 'https:') url.protocol = 'wss:';
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('URL WebSocket inválida');
  return url.toString();
}

// Great-circle distance is used only to parameterize animation, never as road ETA.
export function metersBetween(a: GeoPoint, b: GeoPoint): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function preparePath(points: GeoPoint[]) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + metersBetween(points[i - 1], points[i]));
  return { points, lengths, total: lengths[lengths.length - 1] ?? 0 };
}

export function pointAlongPath(path: ReturnType<typeof preparePath>, progress: number): GeoPoint {
  if (!path.points.length) throw new Error('Ruta vacía');
  const distance = Math.max(0, Math.min(1, progress)) * path.total;
  for (let i = 1; i < path.points.length; i++) {
    if (path.lengths[i] >= distance) {
      const fraction = (distance - path.lengths[i - 1]) / (path.lengths[i] - path.lengths[i - 1] || 1);
      const a = path.points[i - 1], b = path.points[i];
      return { lat: a.lat + (b.lat - a.lat) * fraction, lng: a.lng + (b.lng - a.lng) * fraction };
    }
  }
  return path.points[path.points.length - 1];
}

export async function fetchRoadRoute(baseUrl: string, from: GeoPoint, to: GeoPoint, signal: AbortSignal): Promise<RoadRoute> {
  if (!validPoint(from) || !validPoint(to)) throw new Error('Coordenadas inválidas');
  // OSRM and GeoJSON use longitude,latitude; Leaflet uses latitude,longitude.
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`, { signal });
  if (!response.ok) throw new Error('OSRM no disponible');
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route || !Number.isFinite(route.distance) || route.distance < 0 || !Number.isFinite(route.duration) || route.duration < 0 || route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates)) throw new Error('OSRM no encontró una ruta');
  const points = route.geometry.coordinates.map((pair: unknown) => Array.isArray(pair) ? { lat: pair[1], lng: pair[0] } : null);
  if (points.length < 2 || !points.every(validPoint)) throw new Error('Geometría OSRM inválida');
  return { points, distance: route.distance, duration: route.duration };
}
