# 🗺️ Hoja de Ruta y Bitácora del Proyecto Delivery (PedidosYa Clone)

> **Documento Vivo de Progreso y Sincronización Arquitectónica Multi-Agente**  
> **Repositorio Oficial:** https://github.com/edwardotsutsuki/ProyectoDelivery  
> **Contrato de Arquitectura:** [`SPEC.md`](./SPEC.md)

> **Actualización Global — 2026-10-02:**  
> **Geografía Piloto:** Baba es el piloto operativo primario `(-1.7917, -79.6783)` y Babahoyo la expansión inmediata `(-1.8022, -79.5344)`, Provincia de Los Ríos, Ecuador.  
> **Estado de la Plataforma:**  
> 1. **Panel Comercio Web (3003):** Kanban interactivo con 3 columnas en Baba, WebSocket `SUBSCRIBE_MERCHANT` y polling 5s, autenticación por comercio verificado. 49/49 pruebas aprobadas.  
> 2. **Mobile Cliente (`mobile/app-cliente`):** Catálogo Baba (Picantería El Buen Sabor), carrito de compras con importes en centavos y Checkout conectado en vivo al API Gateway (`POST /api/v1/orders/checkout`) con confirmación de cocina y ID de PostgreSQL. 10/10 pruebas aprobadas.  
> 3. **Mobile Repartidor (`mobile/app-repartidor`):** Turno Online/Offline, gestión de comandas en Baba, botones giro a giro con Waze y Google Maps con coordenadas del piloto, y Billetera Digital conectada en vivo al Gateway (`/ledger/billetera/usr-repartidor-01`). 12/12 pruebas aprobadas.  
> 4. **Backoffice Directivo (3004):** Conectado en tiempo real al API Gateway (`8080`) consumiendo métricas de Ledger global (`/ledger/resumen-global`), catálogo espacial PostGIS de comercios en Baba y Babahoyo (`/catalog/comercios`), pedidos listos para despacho (`/orders/disponibles/reparto`) y seguimiento en mapa Leaflet interactivo. Build TypeScript + Vite 100% aprobado.  
> 5. **Backend Core & PostGIS (3001, 5433, 4001):** Endpoints espaciales y de pedidos verificados, enrutador geodésico y OSRM (`/api/v1/tracking/route`), despacho y entrega (`/tomar`, `/entregar`), y Ledger inmutable protegido por trigger PL/pgSQL.  
> 6. **Flujo E2E:** 100% verificado y validado con **71 de 71 pruebas unitarias aprobadas**.

---

## 📊 Resumen General de Fases Reestructuradas

| Fase | Título | Estado | Enfoque Principal |
| :--- | :--- | :---: | :--- |
| **Fase 1** | Infraestructura y Entorno Local | **Completada ✅** | 9 contenedores Docker, PostGIS, Redis, Gateway |
| **Fase 2** | Autenticación, Roles y Seguridad Base | **Completada ✅** | Login, refresh tokens rotativos, roles RBAC y bcrypt |
| **Fase 3** | Ciclo de Vida del Pedido en Tiempo Real y Checkout | **Completada ✅** | Kanban REST/WS, Catálogo/Carrito Móvil, Checkout E2E |
| **Fase 4** | Geodesia, Tracking Base y Billetera Ledger | **Completada ✅** | Enrutador Haversine, Waze/Maps Baba, Ledger SQL trigger |
| **Fase 5** | **Portal Maestro de Administración y Gestión Comercial (Backoffice Enterprise)** | **EN PROCESO 🔄** | **Login Admin, Locales CRUD, Menú/Productos, Zonas y Tarifas** |
| **Fase 6** | Telemetría Móvil en Vivo y Experiencia de Usuario Avanzada | **Pendiente ⏳** | Radar en vivo en App Cliente, GPS segundo plano, Historial |
| **Fase 7** | Hardening, Compilación OSRM Nativa y Lanzamiento Piloto | **Pendiente ⏳** | OSRM Ecuador PBF, Liquidación Caja, Rate Limit, Push |

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
- [x] Base de datos PostgreSQL + PostGIS con tablas y datos semilla (`init.sql`).
- [x] Redis 7 para estado en memoria, pub/sub y caché.
- [x] API Gateway Nginx con enrutamiento de `/api/` y WebSockets `/ws/`.
- [x] Repositorio Git sincronizado en GitHub.

---

### ✅ Fase 2: Autenticación, Roles y Seguridad Base (Completada)
- [x] **Backend Core (`backend-core/src/modules/auth`)**:
  - [x] JWT de login y refresh token con rotación y preservación de roles e ID de comercio.
  - [x] Verificación de contraseña con `bcryptjs` en Login.
  - [x] Middlewares de autenticación y roles RBAC (`requireAuth`, `requireRole`).
- [x] **Frontend Comercio (`frontend/panel-comercio`)**:
  - [x] Login responsive, validaciones, persistencia con Recordarme y redirección al Kanban.
- [x] **Mobile Apps**:
  - [x] Modelos de credenciales y sesiones locales.

---

### ✅ Fase 3: Ciclo de Vida del Pedido en Tiempo Real y Checkout (Completada)
- [x] **Backend Core & Tracking**:
  - [x] Catálogo espacial `/api/v1/catalog/comercios` y `/productos` con PostGIS `ST_DistanceSphere` para Baba y Babahoyo.
  - [x] Checkout relacional en `POST /api/v1/orders/checkout` compatible con UUIDs y slugs.
  - [x] Eventos Redis Pub/Sub: `order:created`, `order:status_updated` emitidos en `orders:events`.
- [x] **Web Comercio (Panel Kanban)**:
  - [x] Tablero interactivo con 3 columnas operativas (`PENDING`, `PREPARING`, `READY_FOR_PICKUP`).
  - [x] Alerta Web Audio y deduplicación.
  - [x] Conexión API REST y WebSockets. 49/49 pruebas aprobadas.
- [x] **Mobile Cliente (`mobile/app-cliente`)**:
  - [x] Catálogo Baba, carrito de compras en centavos enteros.
  - [x] Checkout conectado en vivo al Gateway con confirmación y número de comanda. 10/10 pruebas aprobadas.

---

### ✅ Fase 4: Geodesia, Tracking Base y Billetera Ledger (Completada)
- [x] **Tracking Service + OSRM / Geodesia**:
  - [x] Endpoints `/api/v1/tracking/route` (Haversine + tortuosidad urbana 1.25), `/driver-pos/:id` y `/pedido/:id/eta`.
  - [x] Radar geoespacial en Backoffice con Leaflet y simulación visual de trayectorias.
- [x] **App del Repartidor (`mobile/app-repartidor`)**:
  - [x] Modelo de turno (`courierModel.ts`) con bloqueo de desconexión si hay pedido activo.
  - [x] Botones de navegación nativa (Waze y Google Maps) con coordenadas exactas de Baba.
  - [x] Billetera digital con cálculo de deuda en efectivo y comisiones. 12/12 pruebas aprobadas.
- [x] **Ledger Contable Inmutable (PostgreSQL & Backend Core)**:
  - [x] Tabla `transacciones_ledger` de doble entrada con saldo verificado.
  - [x] Regla de efectivo: cobro en efectivo genera saldo deudor ante la plataforma (`pago_efectivo`).
  - [x] Inmutabilidad blindada con Trigger PL/pgSQL `rechazar_modificacion_ledger` (prohíbe UPDATE y DELETE).
  - [x] Endpoints montados en `/api/v1/ledger`: `/billetera/:usuarioId`, `/movimiento`, `/resumen-global`.

---

### ✅ Fase 5: Portal Maestro de Administración y Gestión Comercial (Backoffice Enterprise) - [COMPLETADA]
> **Propósito:** Dotar a la plataforma de las herramientas de gestión de negocios equivalentes a PedidosYa Partner / Rappi Backoffice para administrar restaurantes, menús, tarifas y zonas de cobertura sin depender de semillas hardcodeadas.

- [x] **5.1 Autenticación Administrativa & Guard de Rutas**:
  - [x] Pantalla de Login en Backoffice (`/login`) para `admin@delivery.com` con token JWT persistente y botón Demo.
  - [x] Almacenamiento seguro del token JWT y persistencia de sesión del operador.
  - [x] Protección de rutas: redirigir a `/login` si el usuario no tiene rol `admin`.
  - [x] Barra superior con perfil del administrador activo y botón de Cerrar Sesión.
- [x] **5.2 Onboarding y Administración de Locales (Comercios CRUD)**:
  - [x] Endpoints backend: `POST /api/v1/catalog/comercios` (creación con punto espacial PostGIS `ST_SetSRID(ST_MakePoint(lon, lat), 4326)`), `PUT /:id` (edición) y `PATCH /:id/estado` (abierto/cerrado en Postgres + Redis).
  - [x] Pantalla de Gestión de Locales en Backoffice con tabla filtrable por ciudad (Baba vs Babahoyo).
  - [x] Modal de registro y edición completa de comercio (`handleEditClick`) con presets de coordenadas en Baba Centro y Babahoyo.
- [x] **5.3 Creador de Menús y Gestión de Productos (Backoffice)**:
  - [x] Endpoints backend: `POST /api/v1/catalog/comercios/:id/productos`, `PUT /productos/:id`, `PATCH /productos/:id/toggle-disponibilidad` y `DELETE /productos/:id`.
  - [x] Pantalla en Backoffice con selector de local comercial y visor de catálogo por categorías.
  - [x] Modal de creación de platos/productos y switch de disponibilidad ultra rápida en cocina vía Redis + Postgres.
- [x] **5.4 Zonas de Cobertura Geofencing y Tarifas Dinámicas**:
  - [x] Tabla en PostgreSQL `zonas_cobertura` con polígonos PostGIS `GEOMETRY(Polygon, 4326)`:
    - Zona 1: Casco Urbano Baba (Tarifa base $1.25, km extra $0.35).
    - Zona 2: Periferia y Recintos Baba (Tarifa $2.00, km extra $0.50).
    - Zona 3: Babahoyo Centro (Tarifa $1.50, km extra $0.40).
    - Zona 4: Corredor E484 Baba-Babahoyo (Tarifa intercantonal $3.50, km extra $0.60).
  - [x] Endpoint de cotización dinámica de flete con validación PostGIS `ST_Contains`: `POST /api/v1/tracking/calcular-tarifa`.
  - [x] Pantalla en Backoffice para sincronizar polígonos de zonas y simulación dinámica con recargos nocturnos ($0.50) y lluvia ($0.75).
- [x] **5.5 Torre de Control de Flota y Cuadre de Caja**:
  - [x] Endpoints backend: `GET /api/v1/ledger/repartidores-flota` y `POST /api/v1/ledger/liquidar-caja`.
  - [x] Pantalla `FlotaCajaPage` con monitoreo de repartidores, alerta de límite de deuda en efectivo ($25+) y modal de liquidación inmutable en el ledger.
- [x] **5.6 Directorio Central de Usuarios y Permisos RBAC (Backoffice)**:
  - [x] Endpoints backend montados en `/api/v1/users`: `GET /` (listado con filtro por rol), `POST /` (creación con hashing bcrypt y validación de correo único), `PUT /:id` (edición y cambio de contraseña), `PATCH /:id/estado` (activación/suspensión de cuentas).
  - [x] Pantalla `UsuariosPage.tsx` integrada en barra lateral del Backoffice con tarjetas filtrables por rol (Clientes, Repartidores, Comercios, Administradores), búsqueda en vivo y modales interactivos.
- [x] **5.7 Gestión de Menú para Comercios (Portal Aliados / Rappi Partners en http://localhost:3003)**:
  - [x] Barra de navegación superior en `ProtectedPortal` con alternancia entre "Comandas en Cocina" y "Mi Carta & Productos".
  - [x] Pantalla `MenuManagement.tsx` inspirada en Rappi Partners: los locales crean, editan precios, cambian descripciones, pausan por falta de ingredientes y eliminan platos de su catálogo directamente sin intervención del administrador.
- [x] **5.8 Módulo de Perfil de Cliente, Direcciones Guardadas y Billetera Virtual (Ledger)**:
  - [x] **Tabla Relacional en PostgreSQL (`direcciones_usuario`)**:
    - Campos: `id`, `usuario_id`, `alias` (Casa, Trabajo, Pareja), `direccion`, `canton` (Baba/Babahoyo), `referencia`, `lat`, `lon`, `es_principal`.
    - Índices espaciales y de usuario vinculados por clave foránea `ON DELETE CASCADE`.
  - [x] **Endpoints Backend (`backend-core/src/modules/users/user.controller.ts`)**:
    - `GET /api/v1/users/:id/direcciones`: Listado ordenado por principal y fecha de creación.
    - `POST /api/v1/users/:id/direcciones`: Creación de nueva ubicación con desmarcado automático de principal anterior.
    - `DELETE /api/v1/users/:id/direcciones/:dirId`: Eliminación de direcciones antiguas.
    - `PATCH /api/v1/users/:id/direcciones/:dirId/principal`: Cambio de domicilio favorito para entregas.
    - `POST /api/v1/users/:id/recargar-billetera`: Recarga de saldo virtual con asiento contable en `transacciones_ledger`.
  - [x] **Integración con Billetera Virtual y Checkout Contable**:
    - Nuevo método de pago `saldo_virtual` en checkout (`order.controller.ts`), validando saldo disponible en `transacciones_ledger` e insertando asiento de débito (`tipoMovimiento: 'egreso'`).
    - Consulta de saldo actual y extracto en vivo (`GET /api/v1/ledger/billetera/:id`).
    - Historial de pedidos del cliente autenticado (`GET /api/v1/orders/cliente/:clienteId`).
  - [x] **Panel de Control de Usuario en Storefront Web (`landing-page`)**:
    - Botón de saldo `[💰 $XX.XX]` y acceso rápido a perfil en la barra de navegación superior.
    - Modal con 4 pestañas interactivas:
      1. **👤 Mis Datos**: Edición de nombre, teléfono WhatsApp y cambio de contraseña con persistencia en PostgreSQL (`PUT /users/:id`).
      2. **📍 Mis Ubicaciones**: Administración de direcciones guardadas en Baba y Babahoyo con selector de cantón y referencias.
      3. **💳 Mi Billetera**: Tarjeta visual de saldo, recarga instantánea ($5, $10, $20, $50) con DeUna/Banco Pichincha y extracto de transacciones del ledger.
      4. **📦 Mis Pedidos**: Historial de comandas con estado en vivo y botón para ver el radar de seguimiento.
- [x] **5.9 Aislamiento de Carrito Multitienda y Catálogo Completo Baba & Babahoyo**:
  - [x] Corregido error de mezcla de tiendas en `catalog.controller.ts`: se eliminó el fallback indiscriminado de platos de Baba hacia otros comercios.
  - [x] Sembrado catálogo completo y auténtico en base de datos para todos los comercios registrados:
    - *Restaurante El Gran Chef Babahoyo*: Cazuela mixta de mariscos, encebollado mixto, corvina frita, bife de chorizo, arroz marinero, limonada imperial con menta.
    - *Burger & Wings Baba*: Alitas BBQ, hamburguesas smash, salchipapas cheddar, gaseosas.
    - *EDEM Pescados y Mariscos Baba*: Ceviche de camarón, sudado de pescado de río, arroz con camarón.
  - [x] Regla de Aislamiento de Carrito en `landing-page`: Advertencia interactiva ("¿Empezar un nuevo pedido?") al intentar añadir platos de un restaurante diferente, protegiendo al usuario de pedidos inválidos.
  - [x] Checkout potenciado con selector de ubicaciones guardadas y habilitación de pago con Saldo Virtual.

---

### 🔄 Fase 6: Telemetría Móvil en Vivo y Experiencia de Usuario Avanzada - [EN PROCESO]
- [x] **Storefront Web Cliente (`frontend/landing-page` en http://localhost:3002)**:
  - [x] Portal web completo para realizar pedidos directamente desde el navegador (PC, Tablet o Celular) sin necesidad de descargar app móvil.
  - [x] Eliminados enlaces internos de desarrollo hacia la cocina (3003) y administración (3004) de la vista de cara al cliente.
  - [x] Identificación obligatoria de cliente antes de enviar el pedido: Modal de autenticación ("Ya tengo cuenta" vs "Crear cuenta nueva") que preserva el 100% de los productos del carrito.
  - [x] Explorador de restaurantes abiertos en Baba y Babahoyo con tiempos de entrega y fletes base.
  - [x] Visor de carta/menú con selector de cantidades (+/-) y bandeja de carrito flotante.
  - [x] Checkout web con selector de direcciones geodésicas en Baba (San Antonio, Parque Central, La Nobleza) y método de pago (Efectivo vs Transferencia).
  - [x] Emisión directa de comandas a PostgreSQL y Redis Pub/Sub, activando al instante el sonido de comanda en el Panel de Comercio (Kanban en puerto 3003).
  - [x] Radar de seguimiento web con stepper de preparación y datos de telemetría vial.
- [x] **App Móvil Cliente (`mobile/app-cliente`)**:
  - [x] Radar de pedido en tiempo real mostrando etapas (Cocina ➔ En camino ➔ Entrega), distancia en metros y ETA dinámico con OSRM.
  - [x] Historial de pedidos anteriores y botón "Repetir este pedido (1 Clic)" con rellenado automático de comanda.
  - [x] Selector rápido de ubicaciones y presets geodésicos en Baba (San Antonio, Parque Central, La Nobleza, Babahoyo).
  - [x] 11/11 pruebas unitarias aprobadas.
- [x] **App Móvil Repartidor (`mobile/app-repartidor`)**:
  - [x] Transmisor continuo de telemetría WebSocket (`TelemetryTransmitter`) enviando `REPARTIDOR_LOCATION_UPDATE` cada 5 segundos al estar Online.
  - [x] Sincronización de turno, navegación GPS (Waze/Google Maps en Baba) y billetera de doble entrada.
  - [x] 14/14 pruebas unitarias aprobadas.

---

### ⏳ Fase 7: Hardening, Compilación OSRM Nativa y Lanzamiento Piloto
- [ ] **Compilación de Mapa OSRM Ecuador**:
  - [ ] Descargar y compilar `ecuador-latest.osm.pbf` en `delivery-osrm-backend` para ruteo local nativo calle por calle.
- [ ] **Seguridad y Hardening de Infraestructura**:
  - [ ] Rate limiting en Nginx (`limit_req_zone`) en endpoints de login y checkout.
  - [ ] Cookies seguras `HttpOnly` y restricción de CORS por origen específico.
- [ ] **Notificaciones Push**:
  - [ ] Alertas push a móviles mediante Expo Notifications / Firebase FCM.
