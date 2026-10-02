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

Actualización 2026-10-02: Login/sesión verificados contra Gateway real. GET
`/api/v1/orders/comercio/merch-baba-01` devuelve 404 incluso con Bearer válido.
El usuario recibido tiene ID `usr-comercio-01`, pero no identifica su comercio;
no confundir ambos IDs. Falta habilitar el router y confirmar la asociación.
La demo Baba permite probar las tarjetas; hay un enlace desde el panel cuando
las demos están habilitadas. No se sustituyen errores API por pedidos ficticios.

`/pedidos` requiere sesión y monta `<KanbanOrders source="api" />`.
La demo monta el mismo componente con `source="mock"` (valor predeterminado).
También se puede pasar `merchantId` y una implementación `api` para pruebas.

Configurar en `.env.local` y reiniciar Vite:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_MERCHANT_ID=ID_AUTORIZADO_DEL_COMERCIO
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

No se inventa un canal WS de comercio: el Tracking Service inspeccionado todavía
no implementa suscripción a eventos de pedidos. Por eso el cliente usa polling.
La preferencia de audio persiste, pero requiere un gesto para reactivarse en una
nueva carga; no hay alertas por reloj, carga inicial, filtros o cambios de estado.

## Estado del backend

En el corte 2026-09-29 los pedidos respondían 502. El 2026-10-02, GET
`/api/v1/orders/comercio/merch-baba-01` responde 404 con sesión válida.
`index.ts` no monta todavía el router de pedidos bajo
`/api/v1/orders`. La integración de cliente está implementada y probada con
fixtures; la operación real queda pendiente de Antigravity (montaje, disponibilidad,
autorización y transiciones válidas). No se modificó backend ni base de datos.

Verificación: `npm test` y `npm run build` (incluye TypeScript estricto).
