# Mapa del repartidor

Actualización Codex: la fuente del mapa y helpers vive ahora en
`frontend/shared-tracking`, paquete local `@delivery/tracking-web` usado también
por Backoffice. El archivo de Comercio es un wrapper que aplica `src/config.ts`.
Backoffice dispone de seguimiento en `http://localhost:3004/#tracking` con
escenarios Baba/Babahoyo del SPEC. La demo histórica de Comercio sigue usando
los puntos originales de Guayaquil. Las demos públicas de Comercio solo se
registran cuando `VITE_ENABLE_DEMOS` está habilitado (desarrollo por defecto).

Demo: `http://localhost:3003/demo/tracking`. Puntos de ejemplo en Guayaquil y
pedido `GYE-1042`. La demo no inventa posiciones del repartidor ni un ETA si
OSRM falla. El selector permite comparar conexión directa y Gateway.

```tsx
import CourierTrackingMap from './components/CourierTrackingMap';

<CourierTrackingMap
  orderId="GYE-1042"
  restaurant={{ lat: -2.1933, lng: -79.8805, name: 'Restaurante' }}
  destination={{ lat: -2.1890, lng: -79.8895, name: 'Cliente' }}
  trackingUrl="ws://localhost:8080/ws/"
  osrmUrl="http://localhost:5001"
/>
```

La implementación está dentro del contexto Docker `frontend/panel-comercio`;
`frontend/comercio/src/components/CourierTrackingMap.tsx` la reexporta.
Leaflet y sus estilos se instalan localmente; no se necesita token Mapbox.

## WebSocket

El servicio existente usa `ws`, no Socket.IO. En cada conexión y reconexión se
envía `{ "type": "SUBSCRIBE_ORDER", "pedidoId": "GYE-1042" }`.
URLs admitidas: `ws://localhost:4001`, `ws://localhost:8080/ws/` y equivalentes
HTTP/HTTPS (convertidos a WS/WSS). No usar el puerto 8080 sin `/ws/`.

Se aceptan estos mensajes JSON:

```json
{"event":"courier:location_update","payload":{"order_id":"GYE-1042","lat":-2.193,"lng":-79.881,"speed":5,"heading":270}}
```

```json
{"type":"DRIVER_LOCATION","payload":{"pedidoId":"GYE-1042","repartidorId":"courier-1","lat":-2.193,"lon":-79.881,"speed":5,"heading":270,"timestamp":"2026-09-29T15:00:00Z"}}
```

El primer formato también admite `type` en lugar de `event`, y `data` en lugar
de `payload`. El segundo es el emitido actualmente por el servidor. Los eventos
sin ID se consideran del pedido al que está suscrito este socket. Si se pasa
`courierId`, también se exige coincidencia del repartidor. Nunca se suscribe al
feed global de administración. El servidor debe autorizar las suscripciones:
los filtros de interfaz no sustituyen la autorización del backend.

Coordenadas WGS84 en grados, heading horario desde el norte en grados; speed
se interpreta en m/s y se muestra en km/h. Timestamp opcional ISO 8601 o epoch
en milisegundos. Se descartan coordenadas inválidas y timestamps duplicados o
anteriores. Sin timestamp se usa el orden de llegada. Tras 30 segundos sin GPS
reciente se indica señal desactualizada y se oculta el ETA.

## OSRM y animación

Se consulta `/route/v1/driving/{lng},{lat};{lng},{lat}` con geometría GeoJSON.
OSRM devuelve metros y segundos; el badge usa la distancia vial y duración de
la ruta repartidor → cliente. Antes del primer GPS muestra explícitamente la
ruta restaurante → cliente. El ETA no incluye preparación ni tráfico en vivo.
El perfil car.lua del proyecto aproxima conducción; no aplica reglas específicas
de motocicletas que no estén representadas en dicho perfil.

Cada lote de posiciones obtiene también la ruta desde el marcador hasta la
nueva posición. `requestAnimationFrame` recorre esa polilínea por distancia
acumulada, evitando cortar esquinas. Es una ruta inferida entre observaciones,
no una reconstrucción garantizada del recorrido real ni map matching de una
traza GPS. Haversine se utiliza solo para parametrizar la animación, no el ETA.
Si no existe el tramo vial, se coloca el marcador en el GPS recibido y se
informa del modo degradado. Se respeta `prefers-reduced-motion`.

Solicitudes agrupadas cada 2 s, máximo un lote en curso (dos peticiones OSRM),
timeout 7 s y actualización de ruta cada 15 s sin nuevos eventos. Reconexión WS
exponencial hasta 30 s. Al desmontar se cierran sockets, peticiones, animaciones,
temporizadores, observador de tamaño y mapa. Mover/zoom manualmente el mapa no
provoca recentrado; usar **Centrar mapa** para volver a encuadrar los puntos.

OSRM debe tener compilado el grafo de Ecuador según
`infrastructure/osrm/README.md` y permitir CORS desde el frontend. En HTTPS,
configurar WSS y OSRM HTTPS para evitar contenido mixto. Tiles predeterminados
de OpenStreetMap con atribución; `tileUrl` y `tileAttribution` permiten utilizar
el proveedor configurado para producción. No hay envío de GPS a un OSRM público.

## Validación

`node --test tests/tracking.test.cjs tests/orders.test.cjs tests/auth.test.cjs`
y `npm run build`.

Referencias: [Leaflet](https://leafletjs.com/reference),
[OSRM Route API](https://project-osrm.org/docs/v5.22.0/api/#route-service).
