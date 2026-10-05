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
- [x] **5.10 Onboarding Autónomo de Comercios, Aprobaciones KYC y Asignación de Credenciales**:
  - [x] **Modelo de Datos y Migración PostgreSQL**:
    - Campos tributarios y bancarios en tabla `comercios`: `ruc`, `razon_social`, `banco`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `estado_aprobacion` ('pendiente' | 'aprobado' | 'rechazado'), `motivo_rechazo`, `fecha_solicitud`, `fecha_aprobacion`.
    - Vinculación bidireccional entre usuarios y comercios: columna `usuarios.comercio_id UUID REFERENCES comercios(id)` y `comercios.usuario_id UUID REFERENCES usuarios(id)`.
    - Actualizado `infrastructure/database/init.sql` para nuevas instalaciones limpias.
  - [x] **Backend Core (`backend-core`)**:
    - Endpoint público de autoafiliación de restaurantes: `POST /api/v1/auth/afiliar-comercio` con validación de RUC, cantón, datos de encargado (crea usuario con rol 'comercio' desactivado temporalmente) y cuenta bancaria de liquidación.
    - Endpoints administrativos en `catalog.controller.ts`:
      - `GET /comercios/admin`: Listado maestro de comercios con datos fiscales, bancarios y usuario vinculado.
      - `GET /comercios/solicitudes`: Cola exclusiva de comercios pendientes de aprobación.
      - `PATCH /comercio/:id/aprobar`: Aprobación en 1-clic que activa la cuenta de usuario del comerciante, marca el local como aprobado y lo abre en la plataforma.
      - `PATCH /comercio/:id/rechazar`: Rechazo con motivo registrado para retroalimentación al comerciante.
    - Aislamiento en catálogo público (`GET /comercios`): Filtra de forma estricta comercios en estado `'aprobado'` o abiertos, protegiendo el escaparate de tiendas no verificadas.
    - Sincronización en creación y edición de locales (`POST /comercios`, `PUT /comercios/:id`): Posibilidad de crear usuario y contraseña al instante o asociar un usuario existente, y asignar `comercio_id` en administración de usuarios (`user.controller.ts`).
    - Login inteligente (`auth.controller.ts` y `auth.service.ts`): Retorna automáticamente `comercioId`, `nombreComercial` y valida `estadoAprobacion` al iniciar sesión.
  - [x] **Panel de Administración Backoffice (`frontend/backoffice` en http://localhost:3004)**:
    - Pestaña "Solicitudes de Afiliación" en `ComerciosPage.tsx` con badge dinámico de conteo de pendientes, fichas completas de verificación KYC (RUC, Banco, Tipo/Número de cuenta, Titular) y modales de aprobación/rechazo.
    - Modal de creación/edición de locales con opción para aprovisionar credenciales de acceso directo (`usuarioEmail`, `usuarioPassword`) y datos bancarios.
    - Asignación de local en `UsuariosPage.tsx` al registrar o editar usuarios con rol `comercio`.
    - Gestor de carta y platos en `ProductosPage.tsx`: Vista por restaurante con catálogo interactivo, alternancia de disponibilidad en tiempo real y formulario modal para añadir nuevos platos.
  - [x] **Portal Web Storefront (`frontend/landing-page` en http://localhost:3002)**:
    - Enlace destacado en cabecera: "¿Tienes un restaurante? **Afíliate**".
    - Modal guiado de auto-registro en 3 pasos:
      1. *Negocio & Ubicación* (Nombre, RUC, Categoría, Cantón Baba/Babahoyo, Dirección, Teléfono).
      2. *Encargado & Credenciales* (Nombre de contacto, WhatsApp, Correo y Contraseña de acceso).
      3. *Datos Bancarios para Liquidaciones* (Banco, Tipo de cuenta, Número, Titular).
    - Pantalla de confirmación con aviso de verificación en 24h y credenciales listas para ingresar al panel de comercio tras aprobación.

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
  - [x] Actualización completa a Expo SDK 57 (`expo@~57.0.26`, `react-native@0.86.3`, `react@19.2.3`), compatible con Expo Go.
  - [x] Conexión híbrida en vivo y remota vía túnel público (`https://delivery-baba-api.loca.lt/api/v1`): descarga de comercios, productos, tarifas zonales y cupones.
  - [x] Solución al aislamiento de catálogo: mapeo auténtico e independiente para todos los comercios (Burger & Wings, EDEM Mariscos, EDEM Express, Picantería Baba, El Gran Chef Babahoyo).
  - [x] Corrección de tipado en números decimales provenientes de PostgreSQL (evitando error `undefined is not a function` en `.toFixed(2)`).
  - [x] Modo Invitado y Preservación de Carrito: el cliente puede armar su pedido como invitado; al pulsar "Ver Canasta" o confirmar pedido se activa el login/registro sin perder jamás los artículos seleccionados.
  - [x] Integración de Direcciones Guardadas (`direcciones_usuario` de PostgreSQL): chips de selección rápida (`📍 Casa`, `🏢 Trabajo`) para autocompletar el destino en 1 clic.
  - [x] Historial real de pedidos desde PostgreSQL (`GET /api/v1/orders/cliente/:id`) con badges de estado y botón `🔁 Repetir pedido`.
  - [x] Recarga rápida de Billetera Digital en vivo (`+$5`, `+$10`, `+$20`) conectada al Ledger contable.
  - [x] Buscador de platos en vivo en la carta y selector de categorías.
  - [x] Prevención y modal de conflicto multitienda al agregar productos de un local distinto.
  - [x] Migración arquitectónica de `SafeAreaView` a `react-native-safe-area-context` (`SafeAreaProvider` + `SafeAreaView`) resolviendo advertencias de obsolescencia en React Native 0.86.3 / React 19.
  - [x] Conexión en vivo de catálogo, tarifas y cupones a PostgreSQL con timeout de 3.5s vía `AbortController` y fallback de resiliencia offline.
  - [x] **Visualizador de Mapa Vectorial Interactivo en Tiempo Real (LiveRouteMap)**: Proyección SVG de alto rendimiento de la ruta OSRM con polilínea iluminada, marcadores de tienda 🏬, destino 🏠 y motorizado 🛵 con halo de pulso de radar, métricas de ETA/distancia, controles de zoom (+/-) y botones de navegación externa 1-toque hacia Google Maps y Waze.
  - [x] **Geocodificación y Autocompletado de Calles de Los Ríos (searchGeocodingAddresses)**: Búsqueda y chips de selección rápida de puntos verificados (parques, avenidas, mercados, subcentros de salud) para Baba, Babahoyo y Montalvo en el checkout.
  - [x] **Solución Integral al Bucle de Recarga / Boot Loop**: Migración de DEFAULT_API a túnel Cloudflare (<45 ms), eliminación de ciclos de re-renderizado en el hook de Push Token ([currentUser?.id]) y protección safeFetch con AbortController.
  - [x] 15/15 pruebas unitarias aprobadas y bundle Android compilado sin errores.
- [x] **App Móvil Repartidor (`mobile/app-repartidor`)**:
  - [x] Actualización completa a Expo SDK 57 (`expo@~57.0.26`, `react-native@0.86.3`), compatible con Expo Go.
  - [x] Conexión al API Gateway y WebSocket en red local y remota vía túnel público (`https://delivery-baba-api.loca.lt/api/v1`).
  - [x] Transmisor continuo de telemetría WebSocket (`TelemetryTransmitter`) enviando `REPARTIDOR_LOCATION_UPDATE` cada 5 segundos al estar Online.
  - [x] Sincronización de turno, navegación GPS (Waze/Google Maps en Baba) y billetera de doble entrada.
  - [x] **Eliminación del Selector Arbitrario de Pruebas y Migración a Autenticación Real**:
    - Retirado el botón de prueba `Cambiar (10)` y el modal de selección arbitraria de conductores.
    - Implementado servicio de autenticación `courierAuthApi.ts` conectado a `POST /api/v1/auth/login`.
    - Pantalla de inicio de sesión de repartidor con formulario seguro (correo y contraseña), banners de error interactivos y perfiles precargados de un toque para pruebas rápidas en Baba, Babahoyo y Montalvo.
    - Botón de cierre de sesión en cabecera superior y botón maestro en pestaña de Perfil, con validación de seguridad (impide desconexión o logout con pedidos activos en curso).
  - [x] **Interfaz de Usuario Moderna (Estilo Uber Eats / Rappi Soy Repartidor)**:
    - Cabecera con selector de turno Online/Offline con radar visual pulsante y estado de satélites GPS en Baba Centro.
    - Barra HUD de métricas del día (Ganancia Hoy, Entregas Concluidas, Deuda Efectivo retenido).
    - Pestañas de navegación: *Misión Activa / Despacho*, *Mi Billetera*, *Historial de Entregas*, *Perfil y Conexión*.
    - Radar de Despacho en Vivo: Conectado a `GET /api/v1/orders/disponibles/reparto` con polling 7s, tarjetas de comanda con origen, destino, número de ítems, ganancia estimada (`+$0.80`) y botón "Aceptar Pedido".
    - HUD de Misión Activa en 2 pasos:
      1. *Paso 1 (Retiro en Restaurante)*: Nombre y dirección de cocina, botones 1-clic a Waze y Google Maps, checklist de verificación de platos y confirmación de recogida.
      2. *Paso 2 (Entrega al Domicilio)*: Datos de cliente, botón de llamada telefónica directa (`tel:`), navegación 1-clic a la vivienda, alerta de cobro de alta visibilidad (Efectivo obligatorio vs Pagado por Transferencia) y botón de entrega final.
    - Liquidación Automática en el Ledger: Al entregar, `PATCH /orders/:id/entregar` asienta el cobro en efectivo o ganancia digital en `transacciones_ledger` e informa al cliente y restaurante vía Redis Pub/Sub.
    - Alerta de Límite de Efectivo en Caja ($25+) para avisar al motorizado de liquidar en la central de Baba.
    - Selector dinámico de servidor (Túnel remoto vs IP local WiFi).
  - [x] **Filtro de Kalman para Suavizado de Coordenadas GPS (KalmanGpsFilter)**: Algoritmo matemático 2D que filtra el ruido satelital, amortigua el jitter y los saltos bruscos entre edificaciones, calculando rumbo (bearing) y velocidad continua para motorizados en Baba, Babahoyo y Montalvo.
  - [x] 18/18 pruebas unitarias aprobadas y bundle Android compilado sin errores.

---

### 🔄 Fase 7: Hardening, Despacho JIT, Push Notifications, Cashback & Lanzamiento Piloto [SPRINT ACTIVO]
- [x] **Compilación de Mapa OSRM Ecuador & Subregión Los Ríos (Completada ✅)**:
  - [x] Archivo ecuador-latest.osm.pbf procesado y compilado con algoritmo MLD en infrastructure/osrm.
  - [x] Contenedor delivery-osrm-backend activo en puerto 5001 atendiendo cotizaciones de ruta precisas (Baba, Babahoyo, Montalvo y Corredor E484).
- [x] **Geocodificación y Autocompletado Espacial de Los Ríos (Completada ✅)**:
  - [x] Endpoints /api/v1/tracking/geocoding/search y /geocoding/reverse implementados en backend-core.
  - [x] Catálogo verificado de puntos clave y avenidas de Montalvo, Baba y Babahoyo con coordenadas exactas e integración en checkout.
- [x] **Incorporación Plena de Montalvo en PostGIS & Catálogo (Completada ✅)**:
  - [x] Polígonos de cobertura montalvo_centro y montalvo_periferia en zonas_cobertura con tarifas base de $1.25 y $2.00.
  - [x] Comercios y productos locales integrados en base de datos (Restaurante, Supermercado, Farmacia, Licorera).
- [x] **Seguridad y Rate Limiting en API Gateway (Completada ✅)**:
  - [x] Reglas `limit_req_zone` activadas en `api-gateway/nginx.conf`: `auth_limit` (10 r/s con burst 15) para login/auth y `api_general_limit` (40 r/s con burst 60).
  - [x] Encabezados de proxy inverso, timeouts y WebSockets `/ws/` asegurados.
- [ ] **🔔 Sprint 7.1: Notificaciones Push Nativas Multi-Vertical (Expo Notifications / FCM)**:
  - [ ] Endpoints en Backend Core: `POST /api/v1/notifications/push-token` y `DELETE /push-token` sobre tabla `push_tokens` de PostgreSQL.
  - [ ] Servicio emisor `pushNotification.service.ts` conectado a la API de Expo Push con manejo de respuestas y reintentos.
  - [ ] **Matriz de Notificaciones Contextuales por Vertical**:
    - *Restaurantes / Comedores:* Avisos de cocción ("Comida en el fogón") y alerta a motorizados ("Comida caliente, mantener horizontal").
    - *Licoreras & Bebidas:* Avisos de enfriado ("Bebidas alistándose con hielo") y alerta a motorizados ("Contiene alcohol, exigir cédula +18").
    - *Supermercados & Tiendas:* Avisos de selección ("Recolectando víveres en percha") y alerta a motorizados ("Pedido de [X] fundas/bultos").
    - *Farmacias & Salud:* Avisos de validación ("Verificando receta médica") y alerta a motorizados ("Medicamentos sellados confidenciales").
    - *Tiendas Express:* Avisos de despacho ("Alistado rápido de mostrador").
  - [ ] **Disparo Inmediato al Cambiar Estado en Local**: La notificación salta en tiempo real en cuanto el encargado del local cambia el estado de la comanda en su pantalla (`PATCH /orders/:id/estado`): al pasar a `en_preparacion` salta al cliente con el tiempo y mensaje contextual; al pasar a `listo` salta al cliente (pedido empacado) y a los motorizados (comanda lista para retiro).
  - [ ] Integración cliente y repartidor en Expo SDK 57: registro de tokens en login y handlers en primer plano/segundo plano.
- [ ] **⏱️ Sprint 7.2: Sincronización Prep-Time de Cocina & Picking Multi-Vertical (Just-in-Time Dispatch)**:
  - [ ] Migración PostgreSQL: columnas `tiempo_preparacion_min`, `hora_inicio_cocina`, `hora_estimada_listo`, `estado_alistado` en `pedidos`.
  - [ ] **Panel Comercio Adaptativo (Kanban `:3003`)**:
    - *Restaurantes:* Selector de cocción (`10 min`, `20 min`, `35 min`) y temporizador regresivo de cocina.
    - *Licoreras:* Selector de bodega/enfriado (`3 min`, `7 min`, `12 min`).
    - *Supermercados / Tiendas:* Selector de picking por cantidad de ítems (`5 min`, `12 min`, `20 min`), checklist de recolección y botón de solicitud de producto sustituto.
    - *Farmacias:* Selector de dispensación (`5 min`, `10 min`) con visor de receta médica.
  - [ ] **Algoritmo JIT Diferenciado**: Despacho casi inmediato para licoreras/express (<2 min) y retención calibrada para restaurantes según cocción (`hora_estimada_listo - ETA_viaje - margen`).
- [ ] **💎 Sprint 7.3: Club de Fidelidad & Cashback Automático (Ledger Inmutable)**:
  - [ ] Regla contable: 5% de cashback sobre el subtotal consumido acreditado en `transacciones_ledger` tras entrega exitosa.
  - [ ] Asiento contable de tipo ingreso inmutable blindado por trigger PL/pgSQL.
  - [ ] Switch interactivo en checkout móvil y web para aplicar saldo de billetera/cashback en compras futuras.
- [ ] **⭐ Sprint 7.4: Calificaciones 5★, Respaldo Automatizado y Lanzamiento**:
  - [ ] Modal de calificación (1 a 5 estrellas) para restaurante y repartidor tras finalizar el pedido (`calificaciones_pedidos`).
  - [ ] Script de respaldo periódico `pg_dump` para salvaguardar el ledger y la base de datos de producción.
  - [ ] Checklist final de operaciones físicas en el cantón Baba y corredores de Los Ríos.
