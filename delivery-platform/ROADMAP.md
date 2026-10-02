# 🗺️ Hoja de Ruta y Bitácora del Proyecto Delivery (PedidosYa Clone)

> **Documento Vivo de Progreso y Sincronización Multi-Agente (Antigravity + ChatGPT Codex)**  
> **Repositorio Oficial:** https://github.com/edwardotsutsuki/ProyectoDelivery  
> **Contrato de Arquitectura:** [`SPEC.md`](./SPEC.md)

---

## 📊 Resumen General de Fases

| Fase | Título | Estado | Responsables |
| :--- | :--- | :---: | :--- |
| **Fase 1** | Infraestructura y Entorno Local | **Completada ✅** | Antigravity |
| **Fase 2** | Autenticación y Perfiles de Usuario | **En Progreso 🔄** | Antigravity (Backend/DB) + ChatGPT (Front/Mobile) |
| **Fase 3** | Ciclo de Vida del Pedido en Tiempo Real | **Pendiente ⏳** | Antigravity (WS/Redis) + ChatGPT (Kanban/Carrito) |
| **Fase 4** | Geodesia y Tracking en Vivo | **Pendiente ⏳** | Antigravity (OSRM/Gateway) + ChatGPT (Mapas/Mobile) |
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
- [x] Base de datos PostgreSQL + PostGIS con tablas y datos semilla de Guayaquil/Ecuador (`init.sql`).
- [x] Redis 7 para estado en memoria, pub/sub y caché.
- [x] API Gateway Nginx con enrutamiento de `/api/` y WebSockets `/ws/` y DNS dinámico Docker.
- [x] Estructura modular de los 3 portales web y las 2 apps móviles.
- [x] Contrato técnico inicial `SPEC.md` y repositorio Git sincronizado en GitHub.

---

### 🔄 Fase 2: Autenticación y Perfiles de Usuario (En Progreso)
- [ ] **Backend Core (`backend-core/src/modules/users`)**:
  - [ ] Implementación de JWT con Access Token (15m) y Refresh Token (7d).
  - [ ] Hashing seguro de contraseñas con `bcrypt`.
  - [ ] Middlewares de autorización:
    - `requireAuth`: Verifica firma de token y extrae datos del usuario.
    - `requireRole(['comercio', 'admin', 'repartidor', 'cliente'])`: Control de acceso basado en roles (RBAC).
- [ ] **Frontend Comercio (`frontend/comercio`)**:
  - [ ] Pantalla de Login para administradores y cocineros del restaurante.
  - [ ] Almacenamiento seguro del token y redirección al panel Kanban.
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
  - [ ] Tablero interactivo con 3 columnas operativas:
    1. *Nuevos / Pendientes* (`PENDING`).
    2. *En Cocina / Preparación* (`PREPARING`).
    3. *Listo para Despacho* (`READY_FOR_PICKUP`).
  - [ ] Alerta sonora automática mediante Web Audio API al entrar un nuevo pedido.
  - [ ] Transición de estados con actualización en tiempo real por WebSocket.
- [ ] **Backend Core & Tracking**:
  - [ ] Eventos Redis Pub/Sub: `order:created`, `order:status_updated`.

---

### ⏳ Fase 4: Geodesia y Tracking en Vivo
- [ ] **App del Repartidor**:
  - [ ] Foreground Service en segundo plano que transmite GPS cada 5 segundos a `ws://localhost:4001`.
  - [ ] Botones de integración profunda de navegación:
    - Waze: `waze://?ll={lat},{lng}&navigate=yes`
    - Google Maps: `google.navigation:q={lat},{lng}`
- [ ] **Tracking Service + OSRM**:
  - [ ] Cálculo de distancia real y tiempo estimado (ETA) consultando `http://osrm-backend:5000/route/v1/driving/...`.
- [ ] **App del Cliente y Backoffice**:
  - [ ] Canal WebSocket `SUBSCRIBE_ORDER` para pintar el icono del repartidor moviéndose suavemente en el mapa en tiempo real.

---

### ⏳ Fase 5: Billetera Virtual y Ledger Inmutable
- [ ] **Ledger Contable Inmutable (PostgreSQL)**:
  - [ ] Tabla de transacciones de doble entrada (Debe / Haber).
  - [ ] Regla de efectivo: Si el cliente paga en efectivo, el repartidor acumula saldo deudor ante la plataforma.
  - [ ] Regla digital: Pagos digitales acreditan saldo a favor del comercio y comisión al repartidor.
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
