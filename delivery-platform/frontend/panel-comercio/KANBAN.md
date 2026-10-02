# Kanban del restaurante — Baba, Los Ríos

Entrada solicitada: `frontend/comercio/src/pages/KanbanOrders.tsx`.
Implementación: `frontend/panel-comercio/src/pages/KanbanOrders.tsx`, dentro del
contexto Docker existente. Puerto externo 3003, interno 3000, sin cambios.

## Probar inmediatamente

Abrir http://localhost:3003/demo/pedidos. Las demos están habilitadas por defecto
en desarrollo; `VITE_ENABLE_DEMOS=true` permite habilitarlas explícitamente.
No se necesita login ni API para la demo.

Restaurante: **Picantería El Buen Sabor - Baba Centro**. IDs `ORD-BABA-*`, con
entregas en Barrio San Antonio, Calle Bolívar y Sucre, Parque Central de Baba,
Calle Sucre y Rocafuerte y Av. Guayaquil **en Baba** (no la ciudad Guayaquil).
Platos de prueba: seco de gallina, bolón mixto, menestra y jugos. Babahoyo se
identifica como expansión; los pedidos de este Kanban son del piloto Baba.

1. Activar sonido: desbloquea Web Audio y reproduce una muestra sutil de dos tonos.
2. Simular nuevo pedido: agrega un PENDING y dispara una única alerta automática.
3. Empezar preparación → PREPARING. Marcar como listo → READY_FOR_PICKUP.
4. Buscar por número/cliente o filtrar pendientes/en cocina de al menos 20 minutos.

Las tres columnas son Nuevos / Pendientes, En Cocina / Preparación y Listos para
Entrega. Tarjetas con cliente, ítems, cantidades, total USD, dirección, notas y
tiempo desde creación. Prioridad por antigüedad y foco accesible al moverlas.
Los mocks se reinician al recargar; nunca se envían como mutaciones a la API.

## Modo API

Actualización Fase 3: GET por UUID responde 200 y el DTO de PostgreSQL se procesa
correctamente. El backend también puede entregar sus propios mocks de Baba.
Se comprobó PATCH sobre `ORD-BABA-004` y lectura del estado confirmado, restaurando
su estado original al terminar. No se modificaron pedidos reales para esta prueba.

`<KanbanOrders />` usa API por defecto y toma `session.user.comercioId`.
`/pedidos` requiere sesión; la demo monta explícitamente `source="mock"`.
Se pueden inyectar `merchantId` y `api` para pruebas aisladas. No se obtiene el
comercio de variables de entorno ni del ID de usuario. Sin comercio se muestra error.

Configurar en `.env.local` y reiniciar Vite:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_TRACKING_URL=ws://localhost:8080/ws/
```

Base efectiva de pedidos: **http://localhost:8080/api/v1/orders**.
Se reutiliza `authClient.authorizedRequest` para bearer y gestión de sesión.
`merchantId` es el alcance de consulta, no una autorización: el servidor debe
comprobar que pertenece a la sesión. No se inventa un ID productivo por defecto.

Rutas tomadas del controlador existente `backend-core/src/modules/orders/order.controller.ts`:

- GET `/orders/comercio/:comercioId`: `{ success: true, data: [...] }` o array.
- PATCH `/orders/:pedidoId/estado`: `{ nuevoEstado: "en_preparacion" | "listo" }`.
  Se requiere confirmación `{ success: true }` o 204 antes de mover la tarjeta.

Mapeo de lectura: `creado/PENDING` y `confirmado/ACCEPTED` → PENDING;
`en_preparacion/PREPARING` → PREPARING; `listo/READY_FOR_PICKUP` → READY_FOR_PICKUP.
En ruta, entregados y cancelados quedan fuera de las tres columnas operativas.
El adaptador admite nombres de campos del controlador y del contrato canónico,
exige fecha de creación y valida identidades, cantidades, precios y estados.
Conserva `total` del servidor, incluidos cargos de entrega; no lo sustituye por
la suma de ítems. Rechaza respuestas ambiguas, duplicados y comercio incorrecto.

Consulta inicial y polling cada 5 s, sin solicitudes simultáneas de listado.
La primera carga es silenciosa; nuevos IDs PENDING posteriores disparan la
alerta una sola vez por sesión del tablero, aunque se vuelva a consultar o filtrar.
El modo API no tiene botón para simular pedidos. Un fallo conserva los últimos
datos conocidos, muestra error y permite reintentar; no cae automáticamente a mocks.
Mutaciones bloqueadas por tarjeta mientras se confirman. Las lecturas anteriores
a una mutación se descartan para no revertir un estado recién confirmado.
Se abortan peticiones/temporizadores al desmontar o cambiar de comercio.

WebSocket envía `{type:"SUBSCRIBE_MERCHANT",comercioId:merchantId}` y espera
`SUBSCRIBED_MERCHANT`. `ORDER_EVENT` con `order:created`/`order:status_updated`
(o tipos ORDER_CREATED/ORDER_STATUS_CHANGED) invalida la lista únicamente si
corresponde al comercio. Se vuelve a consultar REST; no se pintan payloads parciales.
Eventos durante GET/PATCH quedan pendientes y se reconcilian después. Polling 5 s
como respaldo, reconexión con espera creciente hasta 30 s y limpieza al cambiar
comercio/desmontar. Al reconectar se actualiza la lista para recuperar eventos perdidos.
La preferencia de audio persiste, pero requiere un gesto para reactivarse en una
nueva carga; no hay alertas por reloj, carga inicial, filtros o cambios de estado.

## Estado del backend

El antiguo 404 está resuelto. La suscripción WS real recibe confirmación, pero el
PATCH probado no produjo ORDER_EVENT para el comercio. En el código inspeccionado,
`order:status_updated` no incluye `comercioId`; Tracking lo necesita para enrutar.
Antigravity debe incluir el UUID del comercio en ese payload. El PATCH propio
actualiza la tarjeta tras confirmación y el polling cubre cambios externos.

Tras reparar bcrypt se verificó el flujo autenticado con la cuenta del comercio:
Login/restauración/refresh/listado y ambos avances PATCH confirmados por GET sobre
ORD-BABA-004, restaurando el estado inicial. WS confirmó la suscripción, pero no
entregó eventos de estado. Las pruebas anteriores sin Bearer no acreditaban aislamiento
entre comercios; esta validación tampoco es una auditoría de autorización.
No se modificaron backend, DB, puertos ni configuraciones Docker.

Verificación: `npm test` y `npm run build` (incluye TypeScript estricto).
