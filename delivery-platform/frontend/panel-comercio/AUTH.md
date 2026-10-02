# Login y sesión del comercio — entrega Codex 2026-09-29

Aplicación: `frontend/panel-comercio`. La ruta solicitada
`frontend/comercio/src/pages/Login.tsx` reexporta la implementación.
Docker sigue publicando 3003:3000. Desarrollo fuera de Docker:
`npm run dev -- --port 3003`. Abrir `/login`.

## Configuración pública

`src/config.ts` centraliza valores inyectados por Vite desde `.env.local`.
Consultar `.env.example`. No guardar secretos ni credenciales en variables VITE.

- `VITE_API_BASE_URL`: por defecto `http://localhost:8080/api/v1`.
- `VITE_TRACKING_URL`: `ws://localhost:8080/ws/`.
- `VITE_TRACKING_DIRECT_URL`: `ws://localhost:4001`.
- `VITE_OSRM_URL`: `http://localhost:5001`.
- `VITE_AUTH_REFRESH_ENABLED`: `false` hasta validar el contrato de refresh.
- `VITE_ENABLE_DEMOS`: en ausencia de valor, true en desarrollo y false en build
  de producción. Un valor explícito prevalece. `.env.example` propone false.

Reiniciar Vite/reconstruir después de cambiar variables. Las demos públicas
`/demo/pedidos` y `/demo/tracking` solo se registran cuando están habilitadas.
`/pedidos` monta ahora el Kanban en modo API con `VITE_MERCHANT_ID` (o ID pasado
al componente). `/demo/pedidos` conserva exclusivamente los mocks de Baba.
Ver `KANBAN.md` para rutas, polling y límites de integración del backend.

## Contrato implementado por el cliente (pendiente de validar con Antigravity)

1. `POST /auth/login`: JSON `{ email, password }`.
2. Respuesta 200: `{ accessToken, refreshToken }`, o esos campos dentro de `data`.
   Access token JWT con `exp` futuro en segundos. Refresh token no vacío; puede
   ser opaco. No se exige decodificar un refresh token como JWT.
3. Antes de persistir y abrir `/pedidos`, `GET /auth/comercio/check` con
   `Authorization: Bearer <accessToken>` debe responder 2xx. El servidor debe
   rechazar con 401/403 usuarios sin acceso al comercio. También se consulta
   al restaurar una sesión guardada. No se inventan roles de cocina en frontend.
4. Opcional, solo al activar `VITE_AUTH_REFRESH_ENABLED=true`:
   `POST /auth/refresh` con `{ refreshToken }` devuelve ambos tokens, incluida
   la rotación. El cliente verifica nuevamente `/auth/comercio/check`.
5. No existe logout remoto acordado: **Cerrar sesión borra solo la sesión local**.
   La revocación del token en el servidor permanece pendiente.

Los paths están declarados en el ROADMAP recibido, pero aún no hay una respuesta
real validada: en esta entrega salud/login del Gateway devolvieron HTTP 502;
los archivos auth y el middleware inspeccionados estaban vacíos. La implementación
del cliente no demuestra disponibilidad ni seguridad del servicio.

## Comportamiento

`AuthProvider` expone un estado de sesión reactivo. Login y rutas consumen el
mismo estado. Una caída de red durante la restauración muestra Reintentar en
lugar de abrir el panel o destruir las credenciales guardadas. Un 401/403 cierra
la sesión. Al expirar, se renueva si está habilitado; en otro caso vuelve a Login.

El refresh es único por pestaña para solicitudes concurrentes. Una generación
de sesión impide que un refresh/login tardío restaure una sesión cerrada o
reemplazada. Los cambios de LocalStorage en otras pestañas disparan una nueva
verificación, sin recargar la pantalla. La coordinación de rotación simultánea
entre pestañas aún requiere definir la política del backend.

`authorizedRequest` adjunta el bearer y reintenta una lectura una vez tras 401.
No vuelve a enviar automáticamente mutaciones. El cliente HTTP limita cada
solicitud a 15 s, incluyendo lectura del body, y no expone errores internos.

Tema claro/oscuro persistente, validación con foco en el campo incorrecto,
errores de servidor enfocados, advertencia Bloq Mayús, mostrar/ocultar contraseña
y controles de teclado/táctiles. Los permisos reales siguen a cargo del servidor.

## Persistencia y límite de seguridad

`delivery.comercio.session`: ambos tokens en LocalStorage con Recordarme o
SessionStorage sin marcar. No se guarda la contraseña. El tema se almacena por
separado en `delivery.comercio.theme`; el audio en `delivery.comercio.sound`.

Web Storage es accesible por JavaScript: **no protege frente a XSS**. La siguiente
integración de producción requiere que Antigravity emita el refresh token en
cookie HttpOnly/Secure/SameSite, implemente rotación y revocación, configure CORS
con origen concreto y acuerde CSRF. Esa migración no está implementada ni se
simula con una cookie creada desde JavaScript.

## Verificación

`npm test` ejecuta lógica y pruebas de interacción de Login/Kanban en JSDOM.
`npm run build` exige TypeScript estricto antes de compilar Vite.
Las pruebas de UI simulan las respuestas API; no sustituyen prueba E2E ni
inspección visual en navegador real, tablet o dispositivo móvil.
