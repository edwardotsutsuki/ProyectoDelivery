# 🚀 Especificación Técnica y Arquitectura del Proyecto Delivery (PedidosYa Clone)

> **Documento de Sincronización Multi-Agente (Antigravity + ChatGPT Codex)**  
> **Repositorio Oficial:** https://github.com/edwardotsutsuki/ProyectoDelivery  
> **Zona Geográfica Piloto:** Baba y Babahoyo (Provincia de Los Ríos, Ecuador)

---

## 📍 1. Configuración Geográfica y Ciudades Operativas (Los Ríos, Ecuador)

Toda la plataforma, base de datos PostGIS, ruteo OSRM, mocks y pruebas de frontend/mobile están configurados para operar en:

### 🏙️ Ciudad Piloto 1: Baba (Operación Principal y Pruebas Iniciales)
- **Cantón / Provincia:** Baba, Provincia de Los Ríos, Ecuador.
- **Coordenadas Centro:** `Lat: -1.7917, Lng: -79.6783`
- **Puntos de Interés y Comercios Semilla:**
  * *Comercio 1 (Restaurante Central):* "Picantería El Buen Sabor - Baba Centro" -> `(-1.7925, -79.6790)`
  * *Comercio 2 (Comida Rápida):* "Burger & Wings Baba - Av. Guayaquil" -> `(-1.7910, -79.6775)`
  * *Punto de Entrega Cliente 1:* "Barrio San Antonio, Calle Bolívar y Sucre" -> `(-1.7940, -79.6810)`
  * *Repartidor Piloto:* "Moto 01 - Zona Parque Central de Baba" -> `(-1.7915, -79.6780)`
- **Radio de cobertura inicial:** 5 km a 8 km (cubriendo casco urbano y recintos aledaños).

### 🏙️ Ciudad Piloto 2: Babahoyo (Segunda Ciudad / Expansión)
- **Cantón / Provincia:** Babahoyo (Capital), Provincia de Los Ríos, Ecuador.
- **Coordenadas Centro:** `Lat: -1.8022, Lng: -79.5344`
- **Puntos de Interés y Comercios Semilla:**
  * *Comercio 3 (Comercio Babahoyo):* "Asadero La Esquina del Sabor - Malecón de Babahoyo" -> `(-1.8015, -79.5350)`
  * *Punto de Entrega Cliente 2:* "Av. 6 de Octubre y General Barona" -> `(-1.8040, -79.5320)`
- **Corredor Intercantonal:** Vía Baba - Babahoyo (E484, distancia ~21 km) para pruebas de entregas interurbanas.

> [!IMPORTANT]
> **REGLA DE DESARROLLO OBLIGATORIA:**  
> Cualquier mock de datos, cálculo geoespacial en PostGIS (`ST_DWithin`, `ST_Distance`), ruta en OSRM o marcador de Leaflet/Google Maps en Flutter/React **DEBE** usar coordenadas dentro de **Baba** o **Babahoyo**. Queda prohibido usar coordenadas genéricas (como San Francisco o New York).

---

## 🔌 2. Mapeo de Puertos e Infraestructura Docker

Para evitar colisiones con puertos reservados del host y contenedores preexistentes:

| Servicio | Puerto Interno | Puerto Externo (Host) | Protocolo |
| :--- | :--- | :--- | :--- |
| **API Gateway (Nginx)** | 80 / 443 | **8080 / 8443** | HTTP / HTTPS |
| **Backend Core (Express + TS)** | 3000 | **3001** | REST API |
| **Tracking Service (WebSocket)** | 4000 | **4001** | WS + Redis Pub/Sub |
| **Landing Web** | 3000 | **3002** | HTTP |
| **Comercio Web (Kanban)** | 3000 | **3003** | HTTP |
| **Backoffice Web (Admin)** | 3000 | **3004** | HTTP |
| **OSRM Engine (Routing)** | 5000 | **5001** | HTTP Routing API |
| **PostgreSQL + PostGIS** | 5432 | **5433** | SQL |
| **Redis 7 (Pub/Sub & Cache)**| 6379 | **6380** | Redis Protocol |

---

## 📡 3. Contratos de Comunicación WebSocket y Redis

### Canales Redis:
- `orders:events`: Notificaciones de creación y cambio de estado de pedidos.
- `tracking:courier:{courier_id}`: Posiciones GPS en tiempo real enviadas por repartidores (lat, lng en Baba/Babahoyo).

### Eventos WebSocket (Socket.io / WS):
- `order:created` -> Payload:
  ```json
  {
    "order_id": "ORD-BABA-001",
    "merchant_id": "merch-baba-01",
    "customer_id": "usr-cliente-01",
    "items": [{"name": "Seco de Gallina", "qty": 2, "price": 4.50}],
    "total": 9.00,
    "delivery_address": "Calle Sucre y Rocafuerte, Baba",
    "delivery_location": {"lat": -1.7940, "lng": -79.6810}
  }
  ```
- `order:status_updated` -> Payload:
  ```json
  {
    "order_id": "ORD-BABA-001",
    "status": "PENDING" | "ACCEPTED" | "PREPARING" | "READY_FOR_PICKUP" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED"
  }
  ```
- `courier:location_update` -> Payload:
  ```json
  {
    "courier_id": "courier-01",
    "order_id": "ORD-BABA-001",
    "lat": -1.7920,
    "lng": -79.6785,
    "speed": 28.5,
    "heading": 145.0,
    "timestamp": 1727635200000
  }
  ```

---

## 🤝 4. Protocolo de Trabajo Colaborativo (Multi-Agent Protocol)

### Reglas para ChatGPT Codex y Antigravity:
1. **Respetar los puertos asignados:** No cambiar los puertos expuestos en `docker-compose.yml`.
2. **Contexto Geográfico Obligatorio:** Todos los tests, mocks y vistas de mapa deben centrarse en **Baba (`-1.7917, -79.6783`)** y **Babahoyo (`-1.8022, -79.5344`)**.
3. **Persistencia y Base de Datos:**
   - Coordenadas geográficas usan tipo `GEOGRAPHY(Point, 4326)` o `GEOMETRY(Point, 4326)`.
   - Distancias medidas en metros usando `ST_Distance(location, ST_MakePoint(lng, lat)::geography)`.

---

## 5. Integración frontend — corte Codex 2026-09-29

Esta sección registra lo implementado por el cliente y lo que falta confirmar;
no convierte propuestas en endpoints operativos. No modifica los puertos ni las
decisiones geográficas anteriores. El comercio desplegado es `frontend/panel-comercio`;
`frontend/comercio` contiene reexportaciones compatibles con los prompts iniciales.

| Operación | Contrato consumido por Comercio | Confirmación requerida de Antigravity |
| :--- | :--- | :--- |
| Login | POST `/api/v1/auth/login`, `{email,password}` → `{accessToken,refreshToken}` (directo o dentro de `data`) | Shape real, vigencia, usuario/comercio y errores 401/403/429 |
| Acceso al comercio | GET `/api/v1/auth/comercio/check`, bearer → 2xx permitido, 401/403 denegado | Firma, rol/permiso cocina y asociación al comercio verificados en servidor |
| Refresh opcional | POST `/api/v1/auth/refresh`, `{refreshToken}` → ambos tokens rotados | Contrato JSON probado con fixtures; desactivado por defecto hasta validar servidor |
| Logout | Limpieza local; sin endpoint remoto acordado | Ruta de revocación, cookie y rotación entre pestañas |
| Cookies seguras | Pendiente de implementación cliente/servidor | HttpOnly/Secure/SameSite, CORS específico, CSRF y política Recordarme |
| Pedidos | Cliente Kanban con modos mock/API. Base `/api/v1/orders`; GET `/comercio/:comercioId`, PATCH `/:pedidoId/estado`, según controlador existente. Polling 5 s. | Montar router bajo `/api/v1/orders`, autorizar comercio/transiciones y validar operación real; Gateway devuelve 502 en el corte Kanban Baba |
| Tracking | WebSocket nativo, `SUBSCRIBE_ORDER`; adaptador `DRIVER_LOCATION/lon` y `courier:location_update/lng` | Unificación del evento, autorización de suscripción y unidades m/s, grados, epoch ms o ISO |

Configuración pública Vite: `VITE_API_BASE_URL`, `VITE_TRACKING_URL`,
`VITE_TRACKING_DIRECT_URL`, `VITE_OSRM_URL`, `VITE_AUTH_REFRESH_ENABLED`,
`VITE_ENABLE_DEMOS`. Valores por defecto conservan los puertos actuales.
No incluir secretos en estas variables. Los mapas ya consumen esta configuración.

Verificación de este corte: Gateway devuelve 502 en salud y login; archivos auth
y middleware vacíos al inspeccionarlos. La bitácora reportaba backend listo,
por lo que se requiere reconciliar ese estado con el servicio y el código local.
Detalles del cliente y sus límites: [`frontend/panel-comercio/AUTH.md`](./frontend/panel-comercio/AUTH.md).

### Reutilización del mapa web (continuación P3 de Codex)

Fuente única `frontend/shared-tracking`, paquete privado `@delivery/tracking-web`.
Se empaqueta localmente y se distribuye en `vendor/*.tgz` de Comercio y Backoffice,
con lockfiles. Cada contexto Docker sigue siendo independiente; se copia `vendor`
antes de npm install. No requiere un registro npm externo ni modificar Compose.

Backoffice integra seguimiento **por pedido** en `/#tracking`, con puntos de
prueba del piloto Baba/Babahoyo. No equivale al feed global admin; permisos y
lista real de pedidos siguen pendientes. El renderer Leaflet usa DOM y no es
apto para React Native; el subpath `/geo` expone helpers independientes del DOM.

### Kanban Baba — cliente de pedidos (Codex)

El usuario confirmó Baba como piloto y Babahoyo como expansión. Los mocks del
Kanban usan IDs `ORD-BABA-*`, Picantería El Buen Sabor y entregas en San Antonio,
Bolívar/Sucre y Parque Central de Baba. La demo no envía cambios a la API.

`/pedidos` usa la sesión y `VITE_MERCHANT_ID` para consultar la base efectiva
`http://localhost:8080/api/v1/orders` (derivada de `VITE_API_BASE_URL`). El servidor
debe autorizar ese ID; no se utiliza el ID de prueba como identidad productiva.
GET `/orders/comercio/:comercioId` y PATCH `/orders/:pedidoId/estado` siguen el
controlador existente. PATCH envía `{nuevoEstado:"en_preparacion"|"listo"}`.

El adaptador acepta estados del contrato y estados existentes de BD:
`creado/confirmado` → PENDING, `en_preparacion` → PREPARING, `listo` → READY_FOR_PICKUP.
Estados posteriores/cancelados quedan fuera del tablero operativo. Listado con
`{success:true,data:[...]}` o array; se preserva el total del servidor. Es necesario
incluir fecha de creación y cliente/nombre legible para las tarjetas.

Las nuevas llegadas se detectan en consultas cada 5 s; no se inventa suscripción
WS de comercio mientras el servicio solo implemente tracking. La primera carga
es silenciosa y cada nuevo ID PENDING alerta una vez. Ver `KANBAN.md` para pruebas,
esquemas aceptados, variables y manejo de fallos. El cliente está probado con
fixtures; eso no declara que el router o la autorización backend estén listos.
