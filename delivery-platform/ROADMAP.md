# 🗺️ Hoja de Ruta y Bitácora del Proyecto Delivery (PedidosYa Clone)

> **Documento Vivo de Progreso y Sincronización Multi-Agente (Antigravity + ChatGPT Codex)**  
> **Repositorio Oficial:** https://github.com/edwardotsutsuki/ProyectoDelivery  
> **Contrato de Arquitectura:** [`SPEC.md`](./SPEC.md)

> **Actualización Global Multi-Agente — 2026-10-02:**  
> **Geografía Piloto:** Baba es el piloto operativo primario `(-1.7917, -79.6783)` y Babahoyo la expansión inmediata `(-1.8022, -79.5344)`, Provincia de Los Ríos, Ecuador.  
> **Estado de la Plataforma:**  
> 1. **Panel Comercio Web (3003):** Kanban interactivo con 3 columnas en Baba, WebSocket `SUBSCRIBE_MERCHANT` y polling 5s, autenticación por comercio verificado. 49/49 pruebas aprobadas.  
> 2. **Mobile Cliente (`mobile/app-cliente`):** Catálogo Baba (Picantería El Buen Sabor), carrito de compras con importes en centavos y checkout local. 5/5 pruebas aprobadas.  
> 3. **Mobile Repartidor (`mobile/app-repartidor`):** Turno Online/Offline, gestión de comandas en Baba, botones giro a giro con Waze y Google Maps con coordenadas del piloto, y Billetera Digital conectada en vivo al Gateway (`/ledger/billetera/usr-repartidor-01`). 12/12 pruebas aprobadas.  
> 4. **Backoffice Directivo (3004):** Conectado en tiempo real al API Gateway (`8080`) consumiendo métricas de Ledger global (`/ledger/resumen-global`), catálogo espacial PostGIS de comercios en Baba y Babahoyo (`/catalog/comercios`), pedidos listos para despacho (`/orders/disponibles/reparto`) y seguimiento en mapa Leaflet interactivo. Build TypeScript + Vite 100% aprobado.  
> 5. **Backend Core & PostGIS (3001, 5433, 4001):** Endpoints espaciales y de pedidos verificados, enrutador geodésico y OSRM (`/api/v1/tracking/route`), despacho y entrega (`/tomar`, `/entregar`), y Ledger inmutable protegido por trigger PL/pgSQL.

---

## 📊 Resumen General de Fases

| Fase | Título | Estado | Responsables |
| :--- | :--- | :---: | :--- |
| **Fase 1** | Infraestructura y Entorno Local | **Completada ✅** | Antigravity |
| **Fase 2** | Autenticación y Perfiles de Usuario | **Completada ✅ (Sesión, Tokens, Refresh y Roles RBAC)** | Antigravity (Backend/DB) + Codex (Frontend) |
| **Fase 3** | Ciclo de Vida del Pedido en Tiempo Real | **Completada ✅ (Kanban REST/WS, Catálogo/Carrito Móvil y Pub/Sub)** | Antigravity (WS/Redis) + Codex (Kanban/Mobile) |
| **Fase 4** | Geodesia y Tracking en Vivo | **Completada ✅ (Radar Web, Rutas Geodésicas/OSRM, Mobile Repartidor Waze/Maps)** | Antigravity (OSRM/Gateway) + Codex (Mapas/Mobile) |
| **Fase 5** | Billetera Virtual y Ledger Inmutable | **Completada ✅ (Ledger SQL Trigger, Billetera Repartidor y Resumen Backoffice)** | Antigravity (Ledger SQL/API) + Codex (UI Billetera) |

---

## 🚀 Log de Sincronización y Entregas Multi-Agente (2026-10-02)

### 🛵 Mobile Repartidor — Codex & Antigravity (Fase 4 y Fase 5)
- [x] **Modelo de Turno y Comandas (`courierModel.ts`)**:
  - Control de disponibilidad Online/Offline con prohibición de desconexión durante entrega activa.
  - Flujo secuencial estricto de pedidos: `READY_FOR_PICKUP` → `ACCEPTED` (`Aceptar`) → `ON_THE_WAY` (`En Camino`) → `DELIVERED` (`Entregado`).
  - Asignación de repartidor piloto `usr-repartidor-01` en Baba.
- [x] **Navegación Giro a Giro con Waze y Google Maps (`navigationLauncher.ts`)**:
  - Deep links móviles nativos: `waze://?ll={lat},{lng}&navigate=yes` y `google.navigation:q={lat},{lng}` (o `comgooglemaps://` en iOS).
  - Fallback automático a URL web (`waze.com/ul`, `google.com/maps/dir`).
  - Puntos exactos del piloto: Picantería El Buen Sabor (`-1.7925, -79.6790`) y Barrio San Antonio (`-1.7940, -79.6810`), Baba.
- [x] **Integración con Billetera Ledger en Vivo (`walletModel.ts` y `walletApi.ts`)**:
  - Consume directamente del API Gateway: `GET /api/v1/ledger/billetera/usr-repartidor-01`.
  - Desglose contable en centavos enteros para evitar errores de redondeo de coma flotante.
  - Cálculo de deuda por cobro en efectivo (`pago_efectivo`), comisiones netas y balance global.
  - Manejo de zona horaria `America/Guayaquil` para agrupar transacciones del día calendario local.
- [x] **Batería de Pruebas Móviles Aprobada (12/12)**:
  - `node --test tests/*.test.cjs` aprobado al 100% sin advertencias.

---

### 🏢 Backoffice Directivo — Antigravity & Codex (Fase 4 y Fase 5)
- [x] **Conexión a Endpoints Reales del Gateway (`frontend/backoffice/src/App.tsx`)**:
  - **Dashboard Ejecutivo:** Muestra en tiempo real el volumen transaccionado en el Ledger (`/ledger/resumen-global`), número de operaciones contables, pedidos listos para despacho (`/orders/disponibles/reparto`) y cantidad de comercios activos en Baba y Babahoyo.
  - **Gestión de Entidades:** Renderiza la lista real de comercios espaciales de PostgreSQL (`/catalog/comercios`), indicando estado Abierto/Cerrado, categoría, teléfono, dirección, coordenadas y distintivo de sede (Piloto Baba vs Expansión Babahoyo).
  - **Módulo Financiero (Ledger):** Cuadre contable por tipo de movimiento (`pago_efectivo`, `comision`, etc.) y auditoría de la billetera del repartidor `usr-repartidor-01`.
  - **Seguimiento Geoespacial:** Pantalla con mapa Leaflet interactivo (`TrackingPage.tsx`), suscripción `SUBSCRIBE_ORDER` al Tracking Service en WebSocket port `8080/ws/` y ruta OSRM / geodésica.
- [x] **Validación de Compilación:**
  - `tsc --noEmit && vite build` aprobado con 0 errores (326 kB JS / 20 kB CSS).

---

### ⚙️ Backend Core, PostgreSQL PostGIS & Tracking Service — Antigravity
- [x] **Enrutador de Geodesia y Rutas (`/api/v1/tracking`)**:
  - `GET /route`: Cálculo de ruta y tiempo estimado (ETA) entre coordenadas de Baba y Babahoyo con fallback geodésico de alta precisión (fórmula de Haversine con sinuosidad urbana 1.25) y compatibilidad con OSRM.
  - `GET /driver-pos/:repartidorId`: Consulta de ubicación GPS en tiempo real desde Redis (`driver:pos:${id}`).
  - `GET /pedido/:pedidoId/eta`: Estimación de tiempo de llegada en vivo para el cliente.
- [x] **Despacho y Ciclo de Reparto (`/api/v1/orders`)**:
  - `GET /disponibles/reparto`: Lista comandas con estado `listo` / `READY_FOR_PICKUP` junto con coordenadas PostGIS de restaurante y cliente.
  - `PATCH /:pedidoId/tomar`: Asigna el pedido al repartidor y actualiza el estado a `en_camino`.
  - `PATCH /:pedidoId/entregar`: Marca la entrega finalizada y dispara el asiento contable en el Ledger.
- [x] **Ledger Inmutable y Prevención de Fraude (`/api/v1/ledger`)**:
  - Trigger PL/pgSQL `rechazar_modificacion_ledger` en PostgreSQL que prohíbe taxativamente `UPDATE` y `DELETE`.
  - Validación de saldo resultante y consistencia por partida doble.
- [x] **WebSockets en Tiempo Real**:
  - Retransmisión de eventos de pedidos en canal `orders:events` con `comercioId` y soporte para aliases de UUIDs en `tracking-service`.

---

### 📱 Frontend Panel Comercio & Mobile Cliente — Codex
- [x] **Panel Comercio (`frontend/panel-comercio`)**:
  - Tablero Kanban conectado a API con 3 columnas en Baba (`PENDING`, `PREPARING`, `READY_FOR_PICKUP`).
  - Alerta Web Audio para llegada de nuevos pedidos y deduplicación.
  - Autenticación con persistencia (`Recordarme`), renovación de token y protección RBAC.
  - 49/49 pruebas unitarias aprobadas.
- [x] **Mobile Cliente (`mobile/app-cliente`)**:
  - Catálogo de productos Baba (Picantería El Buen Sabor).
  - Carrito con cálculo de subtotales y envío único ($1.50).
  - Checkout con selección de método de pago (Efectivo / Transferencia).
  - 5/5 pruebas unitarias aprobadas.

---

## 📌 Checklist de Tareas por Fase

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
- [x] Base de datos PostgreSQL + PostGIS con tablas y datos semilla (`init.sql`).
- [x] Redis 7 para estado en memoria, pub/sub y caché.
- [x] API Gateway Nginx con enrutamiento de `/api/` y WebSockets `/ws/`.
- [x] Repositorio Git sincronizado en GitHub.

---

### ✅ Fase 2: Autenticación y Perfiles de Usuario (Completada)
- [x] **Backend Core (`backend-core/src/modules/auth`)**:
  - [x] JWT de login y refresh token con rotación y preservación de roles e ID de comercio.
  - [x] Verificación de contraseña con `bcryptjs` en Login.
  - [x] Middlewares de autenticación y roles RBAC (`requireAuth`, `requireRole`).
- [x] **Frontend Comercio (`frontend/panel-comercio`)**:
  - [x] Login responsive, validaciones, persistencia con Recordarme y redirección al Kanban.
- [x] **Mobile Apps**:
  - [x] Modelos de credenciales y sesiones locales.

---

### ✅ Fase 3: Ciclo de Vida del Pedido en Tiempo Real (Completada)
- [x] **Móvil Cliente**:
  - [x] Catálogo Baba, cantidades, importes en centavos y checkout local.
- [x] **Web Comercio (Panel Kanban)**:
  - [x] Tablero interactivo con 3 columnas operativas (`PENDING`, `PREPARING`, `READY_FOR_PICKUP`).
  - [x] Alerta Web Audio y deduplicación.
  - [x] Conexión API REST y WebSockets.
- [x] **Backend Core & Tracking**:
  - [x] Catálogo espacial `/api/v1/catalog/comercios` y `/productos` con PostGIS `ST_DistanceSphere` para Baba y Babahoyo.
  - [x] Eventos Redis Pub/Sub: `order:created`, `order:status_updated` emitidos en `orders:events`.

---

### ✅ Fase 4: Geodesia y Tracking en Vivo (Completada)
- [x] **App del Repartidor**:
  - [x] Modelo de turno (`courierModel.ts`) con bloqueo de desconexión si hay pedido activo.
  - [x] Botones de navegación nativa (Waze y Google Maps) con coordenadas exactas de Baba.
  - [x] Servicio de geolocalización en segundo plano (`backgroundLocation.ts`).
- [x] **Tracking Service + OSRM / Geodesia**:
  - [x] Endpoints `/api/v1/tracking/route`, `/driver-pos/:id` y `/pedido/:id/eta`.
  - [x] Radar geoespacial en Backoffice con Leaflet y simulación visual de trayectorias.

---

### ✅ Fase 5: Billetera Virtual y Ledger Inmutable (Completada)
- [x] **Ledger Contable Inmutable (PostgreSQL & Backend Core)**:
  - [x] Tabla `transacciones_ledger` de doble entrada con saldo verificado.
  - [x] Regla de efectivo: cobro en efectivo genera saldo deudor ante la plataforma (`pago_efectivo`).
  - [x] Inmutabilidad blindada con Trigger PL/pgSQL `rechazar_modificacion_ledger` (prohíbe UPDATE y DELETE).
  - [x] Endpoints montados en `/api/v1/ledger`: `/billetera/:usuarioId`, `/movimiento`, `/resumen-global`.
- [x] **App Repartidor**:
  - [x] Pantalla de Billetera Digital conectada a Gateway (`/ledger/billetera/usr-repartidor-01`).
  - [x] Desglose de ingresos del día, saldo acumulado y efectivo cobrado.
- [x] **Backoffice Web**:
  - [x] Módulo financiero con balance general, total de operaciones y auditoría por repartidor.

---

## 🎯 Próximo Paso (Siguiente Sprint / Fase 6: Cierre E2E y Despliegue)
1. **Flujo E2E Integrado**:
   - Conectar el checkout móvil de cliente (`mobile/app-cliente`) al endpoint real `POST /api/v1/orders/checkout`.
   - Verificar la aparición instantánea en el Kanban de Comercio en 3003, la toma en la App del Repartidor, el seguimiento en el radar de Backoffice en 3004 y el registro contable en el Ledger SQL.
2. **Descarga de Datos OSM Ecuador para OSRM (Opcional)**:
   - Compilar `ecuador-latest.osm.pbf` en `delivery-osrm-backend` para habilitar motor local offline sin depender del fallback geodésico.
