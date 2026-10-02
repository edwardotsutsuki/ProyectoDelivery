import { config } from './config';
export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'ApiError'; }
}
export async function apiRequest(path: string, options: RequestInit = {}, baseUrl = config.apiBaseUrl): Promise<Response> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Ruta API inválida');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(cancel, 15000);
  try {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { ...options, signal: controller.signal, cache: 'no-store', headers });
    if (!response.ok) {
      const message = response.status === 401 ? 'Correo o contraseña incorrectos, o sesión expirada.'
        : response.status === 403 ? 'Tu cuenta no tiene acceso al panel del comercio.'
        : response.status === 429 ? 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'
        : response.status === 404 ? 'Este servicio todavía no está disponible. Contacta al administrador.'
        : 'No pudimos conectar con el servicio. Inténtalo más tarde.';
      throw new ApiError(message, response.status);
    }
    const body = await response.text(); // Timeout covers response body too.
    return new Response(body || null, { status: response.status, headers: response.headers });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'La solicitud tardó demasiado o fue cancelada. Inténtalo de nuevo.' : 'No pudimos conectar con el servidor. Revisa tu conexión.');
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel); }
}
