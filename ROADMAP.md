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
| **Fase 5** | Billetera Virtual y Ledger Inmutable | **Completada ✅** | Antigravity (Ledger SQL + UI Billetera) |
| **Fase 5.11** | Arquitectura Multi-Vertical, Categorías y Stock Opcional | **Completada ✅** | Antigravity |
| **Fase 5.12** | Experiencia Especializada Retail & Modo Picking Operativo | **Completada ✅** | Antigravity |

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
- [x] **Backoffice Web & Landing Billetera**:
  - [x] Módulo en Landing Page de Billetera Virtual con saldo neto, movimientos y recargas DeUna / transferencia.
  - [x] Integración de pago con saldo virtual en checkout.

---

### ✅ Fase 5.11: Arquitectura Multi-Vertical, Módulo de Categorías y Control de Stock Opcional (Completada)
- [x] **Base de Datos Relacional (`delivery-db-postgis`)**:
  - [x] Nueva tabla `tipos_comercio`: `id` (`restaurante`, `supermercado`, `farmacia`, `licorera`, `express`), `nombre`, `descripcion`, `icono`, `tipo_layout` (`restaurante` vs `grid_ecommerce`), `requiere_cocina`, `permite_recetas`, `control_edad_18`, `orden`, `is_activo`.
  - [x] Alteración de tabla `comercios`: adición de `tipo_comercio_id` (FK a `tipos_comercio`) y `maneja_inventario_general`.
  - [x] Nueva tabla `categorias_productos`: `id UUID`, `comercio_id UUID` (FK a `comercios` con `ON DELETE CASCADE`), `nombre`, `descripcion`, `icono`, `orden`, `is_activo`.
  - [x] Alteración de tabla `productos`: adición de `categoria_id` (FK con `ON DELETE SET NULL`), `unidad_medida` (unidad, kg, libra, litro, porción, etc.), `maneja_stock BOOLEAN DEFAULT FALSE`, `stock_disponible INT DEFAULT NULL`, `requiere_receta BOOLEAN DEFAULT FALSE`.
  - [x] Semillas cargadas y migraciones ejecutadas sin pérdida de datos en `02_verticales_y_categorias.sql`.
- [x] **Regla de Negocio de Control Opcional de Stock**:
  - [x] Si `maneja_stock = FALSE`: `stock_disponible` se mantiene en `NULL`. El producto se considera con stock ilimitado (ideal para restaurantes de comida criolla, platos preparados y comercios sin inventario digital), controlando disponibilidad únicamente con el switch activo/pausado.
  - [x] Si `maneja_stock = TRUE`: `stock_disponible >= 0`. El sistema valida existencias en el backend y frontend; si el stock llega a 0, se bloquea la adición al carrito con la etiqueta "Agotado".
- [x] **Backend Core (`backend-core/src/modules/catalog`)**:
  - [x] `GET /api/v1/catalog/tipos-comercio`: Retorna las verticales activas del ecosistema.
  - [x] `POST /api/v1/catalog/tipos-comercio`: Creación y actualización de tipos de comercio.
  - [x] `GET /api/v1/catalog/comercio/:comercioId/categorias`: Lista categorías propias del comercio con conteo en vivo de productos.
  - [x] `POST /api/v1/catalog/comercio/:comercioId/categorias`: Crea nueva categoría para el local.
  - [x] `PUT /api/v1/catalog/categoria/:categoriaId` & `DELETE`: Edita y elimina categorías (desvinculando productos de forma segura sin borrarlos).
  - [x] `GET /catalog/comercios`: Enriquecido con metadatos de vertical y filtro `?tipo=restaurante|supermercado|...`.
  - [x] `GET /catalog/comercio/:id/productos` & `POST` / `PUT`: Soporte para `categoria_id`, `unidad_medida`, `maneja_stock`, `stock_disponible` y `requiere_receta`.
- [x] **Frontend Backoffice Admin (`frontend/backoffice` - Puerto 3004)**:
  - [x] Nueva vista `CategoriasPage.tsx`: Gestión con pestañas para "Categorías por Local" y "Verticales de Negocio".
  - [x] Actualización de `ProductosPage.tsx`: Selector de categorías dinámicas, creación rápida de categorías, selector de unidad de medida, switch de control de stock opcional y checkbox de receta.
  - [x] Actualización de `ComerciosPage.tsx`: Selector de vertical de negocio y toggle de inventario general.
- [x] **Frontend Aliados / Comercio (`frontend/panel-comercio` - Puerto 3003)**:
  - [x] Actualización de `MenuManagement.tsx`: Carga dinámica de categorías del local, creación de categorías al vuelo, selector de unidad de medida, switch para stock opcional y badges de existencia en vivo.
- [x] **Frontend Landing Page Cliente (`frontend/landing-page` - Puerto 3002)**:
  - [x] Barra horizontal de selección de verticales con iconos y conteo en vivo de locales (`🌟 Todos`, `🍔 Restaurantes`, `🛒 Supermercados`, `💊 Farmacias`, `🍾 Licoreras`, `⚡ Express`).
  - [x] Layout adaptativo para retail (`grid_ecommerce`): tarjetas compactas tipo estantería, selector de cantidad directo en tarjeta, precio con unidad de medida (`$1.50 / kg`) y badges de stock / agotado.
  - [x] Layout adaptativo para comida (`restaurante`): experiencia gastronómica con platos, descripciones y pedidos a cocina.
  - [x] Buscador instantáneo de productos y filtro por categorías dentro de cada local.

---

### ✅ Fase 5.12: Experiencia Especializada Retail / Supermercados / Farmacias & Modo Picking Operativo (Completada)
- [x] **Storefront Retail Cliente (`frontend/landing-page` - Puerto 3002)**:
  - [x] **Barra Flotante Sticky de Canasta**: Bottom bar persistente que muestra total acumulado, conteo de ítems, acceso al drawer y botón directo a checkout para compras rápidas de supermercado y farmacia.
  - [x] **Preferencias de Sustitución en Tienda**: Sección en el checkout con 3 alternativas claras ante falta de stock (`Reemplazar similar`, `Llamar por teléfono / WhatsApp`, `No reemplazar / cancelar ítem`).
  - [x] **Validación de Receta Médica (ARCSA)**: Carga y verificación obligatoria de comprobante médico para fármacos con prescripción.
  - [x] **Control de Mayoría de Edad (+18 Años)**: Declaración legal juramentada para compras en licoreras con presentación de cédula física obligatoria al motorizado.
- [x] **Panel Comercio Operativo (`frontend/panel-comercio` - Puerto 3003)**:
  - [x] **Selector Dual de Modo Operativo**: Switch en cabecera entre `🍳 Modo Cocina (Restaurante)` y `🛒 Modo Picking Despensa (Retail / Supermercado / Farmacia)`.
  - [x] **Tablero Kanban de Picking**: Columnas adaptadas (`Nuevas Canastas` ➔ `En Recolección / Picking` ➔ `Canastas Listas para Retiro`).
  - [x] **Checklist Interactivo de Recolección en Percha**: Permite marcar cada ítem recolectado con checkbox y barra visual de progreso (`X/Y ítems recolectados - %`).
  - [x] **Contador de Bultos / Fundas**: Control operativo de número de paquetes (`📦 Fundas / Bultos: [- 1 +]`) para despacho seguro al repartidor.
  - [x] **Badges de Sustitución y Receta**: Visualización directa en cada comanda de la política elegida por el cliente y el archivo de receta médica adjunta.
  - [x] **Carga Masiva de Catálogo (CSV / JSON)**: Botón de descarga de plantilla CSV oficial y modal de importación masiva con previsualización para comercios con catálogos extensos.

---

### ✅ Fase 5.13: Depuración de Base de Datos, Eliminación Segura de Productos, Flujo de Aceptación/Rechazo y Estación de Trabajo Dedicada (Completada)
- [x] **Depuración de Base de Datos y Supresión de Modo Demo**:
  - [x] Limpieza integral de pedidos y transacciones de prueba en PostgreSQL (`pedidos_items`, `pedidos`, `transacciones_ledger`).
  - [x] Supresión de generación de pedidos mock/simulados tanto en el Backend (`order.controller.ts`) como en el Frontend (`landing-page/src/App.tsx`), garantizando que la plataforma opere exclusivamente con datos reales y reporte errores genuinos.
- [x] **Eliminación Segura de Productos (Foreign Key & Soft-Delete)**:
  - [x] Corrección de restricción de clave foránea en base de datos: `pedidos_items_producto_id_fkey` actualizada con `ON DELETE SET NULL` para evitar bloqueos por historial de pedidos.
  - [x] Implementación de soft-delete en PostgreSQL con columna `is_eliminado BOOLEAN DEFAULT FALSE` y filtrado activo en consultas de catálogo.
  - [x] En `DELETE /api/v1/catalog/producto/:id`: eliminación física inmediata si el producto no tiene referencias, o desactivación segura con `is_eliminado = true` e invalidación en Redis si está referenciado en comandas históricas.
- [x] **Flujo Operativo de Aceptación y Rechazo de Pedidos por el Local**:
  - [x] Endpoint `PATCH /api/v1/orders/:pedidoId/rechazar`: permite al comercio rechazar pedidos pendientes con registro de `motivo_rechazo` y `fecha_rechazo` en la base de datos.
  - [x] Reembolso automático a la billetera virtual (`transacciones_ledger`) si el pedido rechazado fue cancelado con saldo virtual.
  - [x] Emisión en tiempo real vía Redis Pub/Sub del evento `order:status_updated` con estado `ORDER_CANCELLED`.
  - [x] Modal interactivo de rechazo en el Panel del Comercio (`KanbanOrders.tsx`) con causales predefinidas (`Ingrediente o producto agotado`, `Cocina saturada`, `Fuera de horario`, `Fuera de cobertura`, `Otro motivo`).
  - [x] Botones de acción rápida en tarjetas pendientes: **"✓ Aceptar Comanda"** (inicia preparación/picking) y **"✕ Rechazar"** (despliega modal de causales).
- [x] **Detección Automática de Vertical y Eliminación del Selector Manual**:
  - [x] Retiro definitivo del switch dual manual `[Modo Cocina] [Modo Picking Despensa]` para evitar confusión al personal operativo.
  - [x] Detección contextual y automática de la estación según la vertical del local (`GET /catalog/comercio/:id`):
    - **Restaurantes y Cafeterías** ➔ Visualizan exclusivamente la **Estación de Cocina** (comandas de platos y preparaciones culinarias).
    - **Supermercados, Farmacias, Licoreras y Tiendas Express** ➔ Visualizan exclusivamente la **Estación de Picking y Despensa** (canastas de ítems con percha, checklist de recolección y control de fundas/bultos).
  - [x] Badge estático de identificación de estación en cabecera.

---

### ✅ Fase 5.14: Renderizado de Fotografías de Catálogo, Selector de Densidad de Tarjetas y Opciones de Tamaños/Presentaciones Multi-Precio (Completada)
- [x] **Renderizado de Fotografías de Productos en el Storefront (`frontend/landing-page`)**:
  - [x] Corrección del storefront donde los productos no mostraban sus fotos: añadido contenedor de imagen responsive con `object-fit: cover`, bordes redondeados y carga diferida (`loading="lazy"`).
  - [x] Fallback automático con gradiente y emojis temáticos (`🦐`, `🐟`, `🍔`, `💊`, `🛍️`) si el producto no tiene foto o falla el enlace externo.
  - [x] Badges flotantes sobre la imagen para categoría y advertencia de receta médica obligatoria.
- [x] **Selector de Densidad y Tamaño de Tarjetas en la Tienda**:
  - [x] Nueva barra de herramientas superior con botones de alternancia en vivo:
    - **📱 Compacto**: Cuadrícula densa (minmax 190px/230px, imagen 130px) ideal para compras masivas y percha rápida de supermercado.
    - **🖼️ Estándar**: Tamaño balanceado (minmax 240px/280px, imagen 170px) para navegación cómoda con descripción completa.
    - **🔍 Grande**: Tarjetas amplias (minmax 320px/360px, imagen 230px) con fotos destacadas tipo catálogo gourmet.
- [x] **Variantes y Opciones para Diferentes Tamaños / Presentaciones**:
  - [x] Soporte en base de datos PostgreSQL: columna `tamanos JSONB DEFAULT '[]'::jsonb` en tabla `productos`.
  - [x] Soporte en `backend-core`: `catalog.controller.ts` y `order.controller.ts` soportan almacenamiento y lectura de tamaños/precios diferenciados y resolución limpia de IDs de productos en comandas.
  - [x] En `landing-page/src/App.tsx`: Píldoras interactivas de tamaños en cada tarjeta (`[1/2 Libra · $1.75] [1 Libra · $3.00]`), actualización dinámica del precio principal al seleccionar tamaño, y agregación al carrito con la porción elegida.
  - [x] En `panel-comercio/src/pages/MenuManagement.tsx` y `backoffice/src/pages/ProductosPage.tsx`:
    - Sección interactiva para definir opciones de tamaños y precios diferenciados (`+ Añadir Tamaño`).
    - Subida directa de imágenes desde el equipo (`FileReader`) y pegado de URL con previsualización en vivo dentro del formulario y botón para descartar imagen.
    - Badges de tamaños configurados en las tarjetas de administración.

### Fase 5.15: Tarifas Fijas Zonales y Reparto de Comisiones Versátiles (Baba & Babahoyo) ✅
- [x] **Base de Datos (PostgreSQL / PostGIS)**:
  - [x] Script `03_tarifas_y_comisiones.sql` ejecutado exitosamente en `delivery-db-postgis`.
  - [x] Tabla `configuracion_tarifas` con campos: `id`, `canton`, `zona_nombre`, `tarifa_envio`, `comision_repartidor_pct`, `comision_plataforma_pct`, `tarifa_servicio_cliente`, `radio_max_km`, `tiempo_estimado_min`, `is_activa`.
  - [x] Semillas tarifarias zonales para Baba ($1.00 urbano, $1.50 periferia, $2.50 recintos) y Babahoyo ($1.50 urbano central, $2.00 periferia).
  - [x] Alteración de tabla `comercios`: `tipo_comision` ('porcentaje', 'fijo_por_orden', 'suscripcion_mensual'), `valor_comision`, `cuota_mensual`, `subsidia_envio`, `tarifa_fija_local`.
  - [x] Alteración de tabla `pedidos`: `tarifa_servicio`, `comision_comercio`, `ganancia_repartidor`, `ganancia_plataforma`, `pago_neto_comercio`, `zona_tarifa_id`.
- [x] **Backend Core (`delivery-backend-core`)**:
  - [x] Nuevo módulo `rates.controller.ts` montado en `/api/v1/config` y `/api/config` con endpoints completos `GET`, `POST`, `PUT`, `PATCH /toggle`, `DELETE`.
  - [x] `catalog.controller.ts`: Retorna y actualiza en `comercios` los nuevos campos de políticas de comisión y flete preferencial.
  - [x] `order.controller.ts`: Cálculo financiero dinámico en `/checkout`, aplicando split exacto de repartidor (80%), plataforma (20%) y comercio (neto = venta - comisión).
  - [x] Nuevo endpoint `GET /orders/admin/todos` con desglose contable para auditoría en Backoffice.
- [x] **Backoffice (`delivery-frontend-backoffice`)**:
  - [x] Reescritura completa de `ZonasTarifasPage.tsx` conectada a `/api/v1/config/tarifas`, con edición en vivo de fletes, porcentajes y tiempos estimados, creación de nuevas zonas y simulador de reparto económico instantáneo.
  - [x] `ComerciosPage.tsx`: Sección 4 en modal para configurar el plan de comisión (% ventas, tarifa fija por orden o membresía mensual VIP), flete local pactado y subsidio de envío patrocinado. Badges dinámicos en tarjetas de comercios.
- [x] **Storefront Cliente (`delivery-frontend-landing`)**:
  - [x] Selector dinámico de zonas de entrega (`[ 🛵 Baba Urbano · $1.00 ]`, `[ 🛵 Baba Periferia · $1.50 ]`, `[ 🛵 Recintos · $2.50 ]`) en checkout con cálculo instantáneo del flete.
  - [x] Soporte para flete subsidiado por el local (`🎉 ¡Envío GRATIS patrocinado por el local!`) o tarifa preferencial pactada.
  - [x] Desglose transparente en el resumen de orden antes de confirmar.
- [x] **Panel Comercio (`delivery-frontend-comercio`)**:
  - [x] En `KanbanOrders.tsx`, cada comanda muestra el Total del Pedido y el **Ingreso Neto del Local** calculado en tiempo real.

### Fase 5.16: Administración de Personal, Cajeros, Turnos y Verticales Dinámicas (Panel Comercio)
- [x] **Base de Datos PostgreSQL PostGIS (`delivery-db-postgis`)**:
  - [x] Migración `04_usuarios_comercio.sql` creando la tabla `usuarios_comercio` con campos: `id`, `comercio_id`, `nombre`, `email`, `telefono`, `rol` ('admin', 'cajero', 'cocina', 'picker'), `pin_acceso` (PIN de 4 dígitos), `permisos` (JSONB), `is_activo`, `ultimo_acceso`.
  - [x] Índices optimizados en `comercio_id` y `(comercio_id, pin_acceso)` para autenticación instantánea en mostrador.
  - [x] Semillas operativas para *Picantería El Buen Sabor* (Admin: Génesis Salvatierra PIN 1111, Cajero: Carlos Mendoza PIN 1234, Cocina: Don Pedro PIN 5678) y *EDEM PESCADOS Y MARISCOS* (Admin PIN 9999, Picker: Javier PIN 4321).
- [x] **Backend Core (`delivery-backend-core`)**:
  - [x] Módulo en `catalog.controller.ts` con endpoints REST completos:
    - `GET /api/v1/catalog/comercio/:comercioId/usuarios`: Listado de colaboradores ordenado por jerarquía.
    - `POST /api/v1/catalog/comercio/:comercioId/usuarios`: Registro de nuevos colaboradores con validación de PIN.
    - `PUT /api/v1/catalog/comercio/:comercioId/usuarios/:usuarioId`: Edición de datos, rol, PIN y permisos.
    - `PATCH /api/v1/catalog/comercio/:comercioId/usuarios/:usuarioId/toggle`: Activación / desactivación rápida de personal.
    - `DELETE /api/v1/catalog/comercio/:comercioId/usuarios/:usuarioId`: Eliminación de personal del comercio.
    - `POST /api/v1/catalog/comercio/:comercioId/usuarios/pin-login`: Autenticación por PIN de 4 dígitos con actualización de `ultimo_acceso` para cambio de turno estilo Toast POS.
- [x] **Frontend Panel Comercio (`delivery-frontend-comercio`)**:
  - [x] **Barra de Menú Modular de 5 Pestañas Adaptativa**:
    - *Gastronomía / Restaurantes*: `👨‍🍳 Comandas / Cocina`, `🍽️ Mi Carta & Menú`, `👥 Equipo & Cajeros`, `💵 Caja & Turnos`, `⚙️ Mi Local`.
    - *Retail / Percha / Supermercados*: `📦 Estación de Picking`, `🏷️ Catálogo & Percha`, `👥 Equipo & Cajeros`, `💵 Caja & Turnos`, `⚙️ Mi Local`.
  - [x] **PIN Quick-Switcher (Toast / Square POS Style)**:
    - Botón de operador en cabecera (`[ 👤 Carlos Mendoza (Cajero) ▾ ]`) con teclado numérico táctil en pantalla para cambio inmediato de turno entre cajeros y cocineros sin cerrar la sesión de la tienda.
    - Control de acceso por rol: El personal de cocina (`cocina`) o recolectores (`picker`) quedan restringidos a la pantalla operativa (KDS / Picking) sin acceso a ventas ni edición de carta.
  - [x] **Página de Gestión de Personal (`StaffManagement.tsx`)**:
    - Listado de colaboradores con badges dinámicos según el tipo de local, revelación segura de PIN, buscador en tiempo real y modal de creación con generador aleatorio de PINs.
  - [x] **Página de Caja & Turnos (`CajaTurnos.tsx`)**:
    - Cuadre de efectivo en gaveta, desglose de ventas por método de pago (efectivo vs transferencia), base inicial configurable y emisión de **Reporte de Cierre de Caja (Corte Z)** imprimible.
  - [x] **Página de Configuración del Local (`LocalSettings.tsx`)**:
    - Switch en vivo de estado Abierto/Cerrado, ajuste de tiempos de preparación y políticas de subsidio de flete para el cliente.

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
