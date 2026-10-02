# Seguimiento de pedidos — Codex

Abrir `http://localhost:3004/#tracking` o **Seguimiento de pedidos** en el menú.

1. Seleccionar escenario Baba/Babahoyo (puntos de prueba tomados de SPEC.md).
2. Introducir el ID del pedido que transmite el Tracking Service y, opcionalmente,
   ID de repartidor. El formulario no consulta un catálogo real de pedidos.
3. Iniciar seguimiento. Se dibujan restaurante/entrega; la moto aparece solo al
   recibir GPS. El badge refleja la consulta OSRM, no valores inventados.
4. Cambiar selección y pulsar Actualizar cierra la suscripción anterior. Detener
   seguimiento desmonta el mapa, aborta rutas y cierra el socket.

Este es seguimiento **por pedido**, no radar global. No se conecta a
`SUBSCRIBE_BACKOFFICE` ni se inventa autorización admin. El control de acceso del
Backoffice y de suscripciones sigue pendiente del backend; este entorno piloto
no debe usarse para exponer posiciones reales sin dicha integración.

Configuración pública en `.env.local`: `VITE_TRACKING_URL` y `VITE_OSRM_URL`.
Valores por defecto `ws://localhost:8080/ws/` y `http://localhost:5001`.
Se requiere reiniciar Vite al cambiarlos. No incluir secretos en VITE.

Implementación compartida: `@delivery/tracking-web`, fuente en
`frontend/shared-tracking`, distribuida en tarballs locales dentro de `vendor`.
Dockerfile agrega solamente `COPY vendor ./vendor` antes de npm install; no se
cambiaron puertos, volúmenes ni contexto de build. Desarrollo local:
`npm run dev -- --port 3004`. Validación: `npm run build` exige TypeScript estricto.

Limitaciones: mapa/ETA dependen de servicios y tiles disponibles; OSRM necesita
grafo compilado. No es evidencia de un recorrido real validado. El Dashboard
restante conserva sus cifras de ejemplo, ahora identificadas como demo.
