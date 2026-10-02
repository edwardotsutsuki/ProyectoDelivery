# 🗺️ Hoja de Ruta y Bitácora del Proyecto Delivery (PedidosYa Clone)

> **Documento Vivo de Progreso y Sincronización Multi-Agente (Antigravity + ChatGPT Codex)**  
> **Repositorio Oficial:** https://github.com/edwardotsutsuki/ProyectoDelivery  
> **Contrato de Arquitectura:** [`SPEC.md`](./SPEC.md)

> **Actualización Codex — 2026-10-02:** Baba es el piloto obligatorio
> `(-1.7917, -79.6783)` y Babahoyo la expansión `(-1.8022, -79.5344)`, Los Ríos.
> Login/sesión comprobados contra Gateway real. Pedidos: 404. Refresh: devuelve
> token sin permiso comercio (403); sigue deshabilitado. El 502 de auth quedó resuelto.

## Entrega y verificación de Codex — 2026-10-02

- **Login conectado:** adaptado `frontend/panel-comercio/src/auth.ts` a la respuesta
  real `data.tokens`. Se verifica permiso remoto antes de persistir y abrir `/pedidos`.
  Comprobados salud, login, perfil y acceso comercio: 200; preflight desde 3003: 204.
- **Sesión:** cliente real probado con la cuenta de restaurante, con/sin Recordarme,
  restauración, petición autorizada y logout local, usando almacenamiento simulado.
  No se almacena contraseña ni se imprimen tokens. Refresh automático sigue apagado.
- **Kanban Baba:** tres columnas, tarjetas con cliente/ítems/cantidades/total/tiempo,
  direcciones San Antonio, Bolívar y Sucre y Parque Central, filtros, avance de estado
  y sonido por nueva llegada tras activación. Nombre: Picantería El Buen Sabor - Baba Centro.
  `/demo/pedidos` permite probarlo; enlace desde el panel si las demos están habilitadas.
- **Cliente API existente:** listado por comercio, PATCH de estado, polling cada 5 s,
  protección frente a respuestas tardías, errores sin fallback ficticio y deduplicación.
  La aplicación en 3003 es `frontend/panel-comercio`; `frontend/comercio` la reexporta.
- **Geografía:** demo tracking de Comercio, ejemplos y pruebas migrados a Baba;
  Landing ofrece Baba/Babahoyo; Mobile cambia referencias y destino mock a San Antonio
  `(-1.7940, -79.6810)`. Av. Guayaquil permanece como calle de Baba definida en SPEC.
  Los casos de rechazo de coordenadas inválidas conservan valores fuera de rango a propósito.
- **Tracking web ya implementado por Codex:** Leaflet compartido en
  `frontend/shared-tracking`, restaurante/destino/moto, WebSocket, animación, OSRM
  ETA/distancia y pantalla Backoffice con escenarios Baba/Babahoyo. Mobile/GPS real pendientes.
- **Validación:** 43/43 pruebas aprobadas; build TypeScript estricto + Vite de Comercio
  y build Landing aprobados. Sin comprobación visual en navegador ni dispositivo físico.
- **Para Antigravity:** conservar sus cambios de auth/infraestructura. Montar API de
  pedidos (GET por comercio da 404 con Bearer válido) y publicar asociación comercio/usuario.
  `usr-comercio-01` no se usa como merchantId. Refresh emite rol cliente y solo accessToken;
  corregir identidad/rol y contrato de rotación antes de habilitarlo. Cookies HttpOnly,
  revocación, eventos pedidos y autorización WS/OSRM real continúan pendientes.
- **Autoría:** Codex modificó frontend, referencias mock de Mobile, pruebas y documentación;
  no modificó backend, BD, Gateway ni puertos. Sin commit/push ni mensajes externos.

Referencias: [Login/sesión](./frontend/panel-comercio/AUTH.md),
[Kanban](./frontend/panel-comercio/KANBAN.md), [Tracking](./frontend/panel-comercio/TRACKING.md).

## 🚀 Sprint Activo Antigravity — 2026-10-02 (Backend Core, PostGIS & Tracking)
- [x] **Auth Refresh Fix**: Corregido `refreshToken` en `auth.service.ts` y `auth.controller.ts` para retener la identidad del usuario, su rol real y emitir rotación completa (`accessToken` y `refreshToken`).
- [x] **Asociación Usuario-Comercio**: Retorna `comercioId: '55555555-5555-5555-5555-555555555555'` (alias `merch-baba-01`) en el login y perfil de `usr-comercio-01`.
- [x] **Montaje API Pedidos**: Montado `orderRouter` en `backend-core/src/index.ts` bajo `/api/v1/orders` y `/api/orders`.
- [x] **Endpoints de Pedidos Robustecidos**:
  - `GET /api/v1/orders/comercio/:comercioId`: Responde con pedidos reales de PostgreSQL PostGIS (o mock fallback Baba si está vacía). Comprobado con cURL / PowerShell (`200 OK`).
  - `PATCH /api/v1/orders/:pedidoId/estado`: Acepta tanto `nuevoEstado` (`en_preparacion`, `listo`) como `status` (`PREPARING`, `READY_FOR_PICKUP`). Probado en vivo contra BD.
  - `POST /api/v1/orders/checkout`: Valida carrito Redis, inserta en `pedidos` con `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` y `pedidos_items`. Probado en vivo.
- [x] **Eventos Redis Pub/Sub en Tiempo Real**: Publica `order:created` y `order:status_updated` en el canal Redis `orders:events`.
- [x] **Tracking Service WebSockets**: Suscrito a `orders:events` y `tracking:positions` para retransmitir por WebSocket a clientes (`/ws/`).
- [x] **Semillas Baba y Babahoyo en PostgreSQL**: Actualizado `init.sql` e insertados en `delivery-db-postgis` los comercios, productos y usuarios con contraseñas encriptadas `bcrypt`.

---

## 📊 Resumen General de Fases

| Fase | Título | Estado | Responsables |
| :--- | :--- | :---: | :--- |
| **Fase 1** | Infraestructura y Entorno Local | **Completada ✅** | Antigravity |
| **Fase 2** | Autenticación y Perfiles de Usuario | **Login/sesión verificados ✅ / refresh y Mobile pendientes** | Antigravity (Backend/DB) + Codex (Frontend) |
| **Fase 3** | Ciclo de Vida del Pedido en Tiempo Real | **Kanban y cliente API implementados ✅ / endpoints y eventos pendientes** | Antigravity (WS/Redis) + Codex (Kanban) |
| **Fase 4** | Geodesia y Tracking en Vivo | **Web implementada ✅ / Mobile y recorrido real pendientes** | Antigravity (OSRM/Gateway) + Codex (Mapas) |
| **Fase 5** | Billetera Virtual y Ledger Inmutable | **Pendiente ⏳** | Antigravity (Ledger SQL) + ChatGPT (UI Billetera) |

---

## 📌 Detalle de Fases y Checklist de Tareas

### ✅ Fase 1: Infraestructura y Entorno Local (Completada)
- [x] Contenedores Docker levantados y verificados con mapeo de puertos libres:
  - Nginx API Gateway: `8080` (HTTP) / `8443` (HTTPS)
  - Backend Core: `3001`
  - Tracking Service: `4001`
  - PostgreSQL 15 + PostGIS 3.3: `5433`
  - Redis 7: `6380`
  - OSRM Backend (Routing): `5001`
  - Landing Web: `3002`
  - Comercio Web: `3003`
  - Backoffice Web: `3004`
- [x] Base de datos PostgreSQL + PostGIS con tablas y datos semilla (`init.sql`, registro de infraestructura).
- [ ] Verificar semillas de BD contra la geografía obligatoria Baba/Babahoyo; esta entrega no modifica BD.
- [x] Redis 7 para estado en memoria, pub/sub y caché.
- [x] API Gateway Nginx con enrutamiento de `/api/` y WebSockets `/ws/` y DNS dinámico Docker.
- [x] Estructura modular de los 3 portales web y las 2 apps móviles.
- [x] Contrato técnico inicial `SPEC.md` y repositorio Git sincronizado en GitHub.

---

### 🔄 Fase 2: Autenticación y Perfiles de Usuario (En Progreso)
- [ ] **Backend Core (`backend-core/src/modules/auth`)**:
  - [x] JWT de login y verificación de permiso comercio comprobados; renovación correcta pendiente.
  - [x] Verificación de contraseña con `bcryptjs` en Login.
  - [ ] Middlewares de autorización:
    - `requireAuth`: Verifica firma de token y extrae datos del usuario.
    - `requireRole(['comercio', 'admin', 'repartidor', 'cliente'])`: Control de acceso basado en roles (RBAC).
- [ ] **Frontend Comercio (`frontend/comercio`)**:
  - [x] Codex: Login responsive, validaciones, modo oscuro y permiso remoto comercio/admin.
  - [x] Codex: persistencia con Recordarme, restauración, logout local y redirección al Kanban.
  - [ ] Refresh correcto, rol cocina acordado y cookies HttpOnly. Web Storage actual no protege frente a XSS.
- [ ] **Mobile Cliente (`mobile/app-cliente`)**:
  - [ ] Flujo de registro rápido (Nombre, Teléfono, Contraseña).
  - [ ] Selector de dirección con geolocalización de entrega.
- [ ] **Mobile Repartidor (`mobile/app-repartidor`)**:
  - [ ] Login de conductor con verificación de vehículo (Moto/Bicicleta) y estado de disponibilidad (*Online/Offline*).

---

### ⏳ Fase 3: Ciclo de Vida del Pedido en Tiempo Real
- [ ] **Móvil Cliente**:
  - [ ] Carrito sincronizado en Redis (`POST /api/orders/carrito/:clienteId`) con TTL de 24h.
  - [ ] Checkout interactivo con métodos de pago: Efectivo, Transferencia, Billetera Virtual.
- [ ] **Web Comercio (Panel Kanban)**:
  - [x] Codex: tablero interactivo con mocks de Baba y 3 columnas operativas:
    1. *Nuevos / Pendientes* (`PENDING`).
    2. *En Cocina / Preparación* (`PREPARING`).
    3. *Listos para Entrega* (`READY_FOR_PICKUP`).
  - [x] Codex: alerta Web Audio por nueva llegada, activación inicial y deduplicación.
  - [x] Codex: cliente Gateway con polling, listado y cambios confirmados, probado con fixtures.
  - [x] Antigravity: Endpoints de pedidos montados y verificados en `/api/v1/orders`.
  - [x] Antigravity: Catálogo espacial `/api/v1/catalog/comercios` y `/productos` con cálculo PostGIS `ST_DistanceSphere` para Baba y Babahoyo.
  - [x] Antigravity: Interruptor On/Off de disponibilidad en tiempo real con Redis pipeline y Postgres.
  - [ ] Transición de estados con actualización en tiempo real por WebSocket.
- [x] **Backend Core & Tracking**:
  - [x] Eventos Redis Pub/Sub: `order:created`, `order:status_updated` emitidos en canal `orders:events` y escuchados por WebSocket en `tracking-service`.

---

### ⏳ Fase 4: Geodesia y Tracking en Vivo
- [ ] **App del Repartidor**:
  - [ ] Foreground Service en segundo plano que transmite GPS cada 5 segundos a `ws://localhost:4001`.
  - [ ] Botones de integración profunda de navegación:
    - Waze: `waze://?ll={lat},{lng}&navigate=yes`
    - Google Maps: `google.navigation:q={lat},{lng}`
- [ ] **Tracking Service + OSRM**:
  - [ ] Cálculo de distancia real y tiempo estimado (ETA) consultando `http://osrm-backend:5000/route/v1/driving/...`.
- [x] **Codex — Comercio y Backoffice web:** mapa compartido Leaflet, suscripción
  `SUBSCRIBE_ORDER`, animación, ruta OSRM y ETA/distancia; escenarios Baba/Babahoyo.
- [ ] **App del Cliente:** integrar mapa nativo y validar seguimiento con GPS real.

---

### ⏳ Fase 5: Billetera Virtual y Ledger Inmutable
- [x] **Ledger Contable Inmutable (PostgreSQL & Backend Core)**:
  - [x] Tabla `transacciones_ledger` de doble entrada con saldo resultante verificado.
  - [x] Regla de efectivo implementada: si el cliente paga en efectivo, el repartidor acumula saldo deudor ante la plataforma (`pago_efectivo`).
  - [x] Regla de inmutabilidad blindada con Trigger PL/pgSQL `rechazar_modificacion_ledger` (impide UPDATE y DELETE).
  - [x] Endpoints del ledger montados en `/api/v1/ledger`:
    - `GET /billetera/:usuarioId`: Saldo neto en USD y extracto de movimientos.
    - `POST /movimiento`: Asiento contable transaccional con bloqueo de concurrencia.
    - `GET /resumen-global`: Auditoría consolidada por tipo de movimiento.
- [ ] **App Repartidor**:
  - [ ] Pantalla de Billetera Digital con saldo neto diario, historial de entregas y botón de retiro.
- [ ] **Backoffice Web**:
  - [ ] Módulo administrativo de liquidaciones, comisiones por zona y cuadre de caja de repartidores.

---

## 🤝 Protocolo de Trabajo Multi-Agente (Antigravity + ChatGPT Codex)

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│       CHATGPT CODEX             │           │         ANTIGRAVITY (YO)        │
│    (Frontend & Componentes)     │           │       (Backend, DB & Docker)    │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ • Diseña pantallas e interfaces │           │ • Escribe código en disco duro  │
│ • Crea componentes UI y estilos │           │ • Ejecuta migraciones en PostGIS│
│ • Maqueta lógica de clientes JS │  ◄═════►  │ • Valida TypeScript y linter    │
│ • Redacta pruebas y validadores │           │ • Orquesta contenedores Docker  │
│ • Sugiere UX y experiencia móvil│           │ • Realiza commits y push GitHub │
└─────────────────────────────────┘           └─────────────────────────────────┘
```
