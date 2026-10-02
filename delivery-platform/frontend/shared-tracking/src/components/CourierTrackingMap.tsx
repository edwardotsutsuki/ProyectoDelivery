import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './CourierTrackingMap.css';

import { fetchRoadRoute, metersBetween, parseLocation, pointAlongPath, preparePath, validPoint, websocketUrl, type CourierLocation, type GeoPoint, type RoadRoute } from '../tracking';

export interface CourierTrackingMapProps {
  orderId: string;
  courierId?: string;
  restaurant: GeoPoint & { name?: string };
  destination: GeoPoint & { name?: string };
  /** Native WebSocket: ws://localhost:4001 or gateway ws://localhost:8080/ws/ */
  trackingUrl?: string;
  osrmUrl?: string;
  tileUrl?: string;
  tileAttribution?: string;
}

function pin(kind: string, symbol: string) {
  return L.divIcon({ className: 'tracking-pin-container', html: `<span class="tracking-pin tracking-pin--${kind}">${symbol}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] });
}
function label(text: string) { const node = document.createElement('span'); node.textContent = text; return node; }

export default function CourierTrackingMap({ orderId, courierId, restaurant, destination,
  trackingUrl = 'ws://localhost:8080/ws/', osrmUrl = 'http://localhost:5001',
  tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}: CourierTrackingMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [connection, setConnection] = useState('Conectando…');
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeError, setRouteError] = useState('');
  const [tileError, setTileError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [location, setLocation] = useState<CourierLocation | null>(null);
  const [now, setNow] = useState(Date.now);
  const [routeAt, setRouteAt] = useState<number | null>(null);
  const [routeFromCourier, setRouteFromCourier] = useState(false);

  useEffect(() => {
    if (!container.current || !validPoint(restaurant) || !validPoint(destination)) return;
    setRoute(null); setRouteError(''); setLastUpdate(null); setLocation(null); setRouteAt(null); setRouteFromCourier(false); setTileError(false);
    const map = L.map(container.current, { scrollWheelZoom: false });
    mapRef.current = map;
    map.fitBounds(L.latLngBounds([restaurant, destination]), { padding: [45, 45], maxZoom: 16 });
    const tiles = L.tileLayer(tileUrl, { attribution: tileAttribution, maxZoom: 19 }).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    L.marker(restaurant, { icon: pin('restaurant', 'R'), title: 'Restaurante' }).addTo(map).bindPopup(label(restaurant.name ?? 'Restaurante'));
    L.marker(destination, { icon: pin('destination', 'E'), title: 'Entrega del cliente' }).addTo(map).bindPopup(label(destination.name ?? 'Entrega del cliente'));
    const line = L.polyline([], { color: '#e11d48', weight: 5, opacity: 0.85 }).addTo(map);
    let bike: L.Marker | null = null;
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let animation = 0;
    let latest: CourierLocation | null = null;
    let acceptedTimestamp = -Infinity;
    let request: AbortController | null = null;
    let busy = false;
    let dirty = true;
    let lastRequest = -Infinity;
    let lastProcessed = 0;
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);

    function orient(heading: number) {
      const element = bike?.getElement()?.querySelector<HTMLElement>('.tracking-bike-heading');
      if (element) element.style.transform = `rotate(${heading}deg)`;
    }
    function move(points: GeoPoint[], heading: number, duration: number) {
      cancelAnimationFrame(animation);
      if (!bike) return;
      const path = preparePath(points);
      const start = performance.now();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      orient(heading);
      const frame = (time: number) => {
        if (disposed || !bike) return;
        const fraction = reduced ? 1 : Math.min(1, (time - start) / duration);
        bike.setLatLng(pointAlongPath(path, fraction));
        if (fraction < 1) animation = requestAnimationFrame(frame);
      };
      animation = requestAnimationFrame(frame);
    }
    async function updateRoute() {
      if (disposed || busy || (!dirty && Date.now() - lastRequest < 15000)) return;
      busy = true; dirty = false; lastRequest = Date.now();
      const sample = latest;
      const origin = sample ?? restaurant;
      cancelAnimationFrame(animation);
      const from = bike?.getLatLng();
      const controller = new AbortController(); request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 7000);
      try {
        const [remaining, movement] = await Promise.all([
          fetchRoadRoute(osrmUrl, origin, destination, controller.signal),
          sample && from && metersBetween(from, sample) > 3 ? fetchRoadRoute(osrmUrl, from, sample, controller.signal).catch(() => null) : Promise.resolve(null),
        ]);
        if (disposed) return;
        setRoute(remaining); setRouteAt(Date.now()); setRouteFromCourier(!!sample);
        line.setLatLngs(remaining.points);
        setRouteError(sample && from && metersBetween(from, sample) > 3 && !movement ? 'Posición GPS sin ajuste vial: no se pudo calcular el tramo recorrido.' : '');
        if (sample && bike) {
          const duration = Math.min(3500, Math.max(800, Date.now() - lastProcessed));
          if (movement) move(movement.points, sample.heading, duration);
          else { cancelAnimationFrame(animation); bike.setLatLng(sample); orient(sample.heading); }
        }
        lastProcessed = Date.now();
      } catch {
        if (disposed) return;
        setRoute(null); setRouteAt(null); line.setLatLngs([]);
        setRouteError('OSRM no disponible o sin ruta. ETA y distancia no disponibles; se muestra la última posición GPS.');
        if (sample && bike) { cancelAnimationFrame(animation); bike.setLatLng(sample); orient(sample.heading); }
      } finally { window.clearTimeout(timeout); busy = false; if (request === controller) request = null; }
    }
    function connect() {
      if (disposed) return;
      setConnection(attempts ? 'Reconectando…' : 'Conectando…');
      try { socket = new WebSocket(websocketUrl(trackingUrl)); }
      catch { setConnection('URL de tracking inválida o bloqueada'); return; }
      socket.onopen = () => {
        if (disposed) return;
        attempts = 0; setConnection('Conectado');
        socket?.send(JSON.stringify({ type: 'SUBSCRIBE_ORDER', pedidoId: orderId }));
      };
      socket.onmessage = event => {
        if (disposed || typeof event.data !== 'string') return;
        const sample = parseLocation(event.data, orderId, courierId);
        if (!sample || (sample.timestamp !== undefined && sample.timestamp <= acceptedTimestamp)) return;
        if (sample.timestamp !== undefined) acceptedTimestamp = sample.timestamp;
        latest = sample; dirty = true;
        setLocation(sample); setLastUpdate(sample.timestamp ?? Date.now());
        if (!bike) {
          bike = L.marker(sample, { icon: L.divIcon({ className: 'tracking-pin-container', html: '<span class="tracking-pin tracking-pin--bike"><span class="tracking-bike-heading">▲</span><span aria-hidden="true">🏍</span></span>', iconSize: [44, 44], iconAnchor: [22, 22] }), title: 'Repartidor' }).addTo(map).bindPopup(label('Repartidor'));
          orient(sample.heading);
        }
      };
      socket.onerror = () => { if (!disposed) setConnection('Error de conexión'); socket?.close(); };
      socket.onclose = () => {
        if (disposed) return;
        setConnection('Desconectado · reintentando');
        reconnectTimer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)));
      };
    }
    connect(); void updateRoute();
    const timer = window.setInterval(() => { setNow(Date.now()); void updateRoute(); }, 2000);
    return () => {
      disposed = true; window.clearInterval(timer); clearTimeout(reconnectTimer); request?.abort(); cancelAnimationFrame(animation);
      if (socket) { socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.onopen = null; socket.close(); }
      resize.disconnect(); map.remove(); mapRef.current = null;
    };
  }, [orderId, courierId, restaurant.lat, restaurant.lng, restaurant.name, destination.lat, destination.lng, destination.name, trackingUrl, osrmUrl, tileUrl, tileAttribution]);

  if (!validPoint(restaurant) || !validPoint(destination)) return <p role="alert">Las coordenadas del restaurante o la entrega no son válidas.</p>;
  const stale = lastUpdate !== null && now - lastUpdate > 30000;
  const estimateStale = stale || (routeAt !== null && now - routeAt > 30000) || (location !== null && !routeFromCourier);
  return <section className="tracking-card" aria-label={`Seguimiento del pedido ${orderId}`}>
    <header className="tracking-header"><div><span className="tracking-eyebrow">DELIVERYYA · EN RUTA</span><h2>Seguimiento de tu pedido</h2><p>#{orderId} · {connection}</p></div><div className="tracking-eta" role="status" aria-live="polite"><strong>{route && !estimateStale ? `${Math.max(1, Math.ceil(route.duration / 60))} min` : 'ETA no disponible'}</strong><span>{route && !estimateStale ? (route.distance < 1000 ? `${Math.round(route.distance)} m` : `${(route.distance / 1000).toFixed(1)} km`) : 'Distancia pendiente'}</span></div></header>
    <div className="tracking-info">{routeFromCourier ? 'Ruta del repartidor a la entrega' : 'Ruta desde el restaurante · esperando GPS'} · ETA estimada por OSRM, sin tráfico en vivo.</div>
    <div ref={container} className="tracking-map" aria-label="Mapa interactivo del restaurante, repartidor y entrega" />
    <footer className="tracking-footer"><span><b className="tracking-dot restaurant" />Restaurante</span><span><b className="tracking-dot destination" />Entrega</span><span><b className="tracking-dot bike" />Repartidor</span><button type="button" onClick={() => mapRef.current?.fitBounds(L.latLngBounds([restaurant, destination, ...(location ? [location] : [])]), { padding: [45, 45], maxZoom: 16 })}>Centrar mapa</button></footer>
    <p className="tracking-status" role="status">{lastUpdate === null ? 'Esperando la ubicación del repartidor…' : stale ? 'Señal GPS desactualizada. Mostrando la última ubicación conocida.' : `Última señal hace ${Math.max(0, Math.floor((now - lastUpdate) / 1000))} s · ${((location?.speed ?? 0) * 3.6).toFixed(0)} km/h`}</p>
    {routeError && <p className="tracking-warning" role="status">{routeError}</p>}
    {tileError && <p className="tracking-warning" role="status">No se pudieron cargar algunas imágenes del mapa. Revisa tu conexión.</p>}
  </section>;
}
