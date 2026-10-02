import { config } from './config';
import { ApiError, apiRequest } from './http';
export const SESSION_KEY = 'delivery.comercio.session';
export interface SessionUser { id: string; name: string; role: string; comercioId?: string }
export interface Session { accessToken: string; refreshToken: string; user?: SessionUser }
function readUser(value: unknown): SessionUser | undefined {
  if (!value || typeof value !== 'object') return;
  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'string' || typeof user.role !== 'string') return;
  return { id: user.id, role: user.role, name: typeof user.name === 'string' ? user.name : '',
    ...(typeof user.comercioId === 'string' && user.comercioId.trim() ? { comercioId: user.comercioId.trim() } : {}) };
}
export interface AuthSnapshot { status: 'checking' | 'anonymous' | 'authenticated' | 'unavailable'; message: string; session: Session | null }
// Expiry hint only. The API must verify signature and permissions.
export function tokenExpiresAt(token: string): number {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch { return 0; }
}
async function decodeSession(response: Response): Promise<Session> {
  try {
    const body = await response.json();
    if (body?.success === false) throw new Error();
    const data = body?.data?.tokens ?? body?.data ?? body;
    if (typeof data?.accessToken !== 'string' || typeof data?.refreshToken !== 'string'
      || !data.refreshToken.trim() || tokenExpiresAt(data.accessToken) <= Date.now()) throw new Error();
    const user = readUser(body?.data?.user ?? body?.user);
    return { accessToken: data.accessToken, refreshToken: data.refreshToken, ...(user ? { user } : {}) };
  } catch { throw new ApiError('El servidor no devolvió una sesión válida.'); }
}
export function createAuthClient(settings = { apiBaseUrl: config.apiBaseUrl, refreshEnabled: config.refreshEnabled }) {
  let state: AuthSnapshot = { status: 'checking', message: '', session: null };
  let generation = 0;
  let pendingRefresh: Promise<Session> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: AuthSnapshot) => { state = next; listeners.forEach(listener => listener()); };
  function removeStored() {
    for (const name of ['sessionStorage', 'localStorage'] as const) {
      try { window[name].removeItem(SESSION_KEY); } catch { /* Storage disabled. */ }
    }
  }
  function readStored(): { session: Session; remember: boolean } | null {
    try {
      for (const [index, name] of (['sessionStorage', 'localStorage'] as const).entries()) {
        const raw = window[name].getItem(SESSION_KEY);
        if (!raw) continue;
        const session = JSON.parse(raw);
        if (typeof session?.accessToken === 'string' && typeof session?.refreshToken === 'string' && session.refreshToken.trim()) return { session: { accessToken: session.accessToken, refreshToken: session.refreshToken }, remember: index === 1 };
        throw new Error();
      }
    } catch { removeStored(); }
    return null;
  }
  function writeStored(session: Session, remember: boolean) {
    removeStored();
    try { (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(session)); }
    catch { removeStored(); throw new ApiError('Permite el almacenamiento del navegador para iniciar sesión.'); }
  }
  function signOut(message = '') {
    generation++; pendingRefresh = null; removeStored();
    publish({ status: 'anonymous', session: null, message });
  }
  const request = (path: string, options?: RequestInit) => apiRequest(path, options, settings.apiBaseUrl);
  async function checkAccess(session: Session, signal?: AbortSignal) {
    const response = await request('/auth/comercio/check', { headers: { Authorization: `Bearer ${session.accessToken}` }, signal });
    const body = await response.json();
    if (body?.success === false) throw new ApiError('Tu cuenta no tiene acceso al comercio.', 403);
    const user = readUser(body?.user ?? body?.data?.user ?? body?.data);
    if (user) session.user = user;
  }
  async function signIn(email: string, password: string, remember: boolean, signal: AbortSignal) {
    const version = ++generation;
    const session = await decodeSession(await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }), signal }));
    await checkAccess(session, signal);
    if (version !== generation || signal.aborted) return;
    writeStored(session, remember);
    publish({ status: 'authenticated', session, message: '' });
  }
  function refresh(): Promise<Session> {
    if (pendingRefresh) return pendingRefresh;
    const stored = readStored();
    if (!stored || !settings.refreshEnabled) {
      signOut('Tu sesión terminó. Ingresa de nuevo.');
      return Promise.reject(new ApiError('Tu sesión terminó. Ingresa de nuevo.', 401));
    }
    const version = generation;
    const operation = (async () => {
      const session = await decodeSession(await request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: stored.session.refreshToken }) }));
      await checkAccess(session);
      if (version !== generation) throw new ApiError('La sesión cambió durante la renovación.', 401);
      writeStored(session, stored.remember);
      publish({ status: 'authenticated', session, message: '' });
      return session;
    })().catch(error => {
      if (version === generation) {
        if (error instanceof ApiError && [401, 403].includes(error.status)) signOut('Tu sesión terminó o ya no tiene acceso. Ingresa de nuevo.');
        else publish({ status: 'unavailable', session: null, message: 'No pudimos verificar tu sesión. Revisa la conexión y vuelve a intentar.' });
      }
      throw error;
    }).finally(() => { if (pendingRefresh === operation) pendingRefresh = null; });
    pendingRefresh = operation;
    return operation;
  }
  async function restore() {
    const version = generation;
    const stored = readStored();
    if (!stored) { publish({ status: 'anonymous', session: null, message: state.message }); return; }
    publish({ status: 'checking', session: null, message: '' });
    if (tokenExpiresAt(stored.session.accessToken) <= Date.now()) { await refresh().catch(() => undefined); return; }
    try {
      await checkAccess(stored.session);
      if (generation === version) publish({ status: 'authenticated', session: stored.session, message: '' });
    } catch (error) {
      if (version !== generation) return;
      if (error instanceof ApiError && error.status === 401 && settings.refreshEnabled) await refresh().catch(() => undefined);
      else if (error instanceof ApiError && [401, 403].includes(error.status)) signOut('Tu sesión terminó o ya no tiene acceso. Ingresa de nuevo.');
      else publish({ status: 'unavailable', session: null, message: 'No pudimos verificar tu sesión. Revisa la conexión y vuelve a intentar.' });
    }
  }
  function syncFromStorage() { generation++; pendingRefresh = null; return restore(); }
  async function authorizedRequest(path: string, options: RequestInit = {}) {
    let session = state.session;
    const version = generation;
    if (!session || tokenExpiresAt(session.accessToken) <= Date.now()) session = await refresh();
    const send = (token: string) => {
      const headers = new Headers(options.headers); headers.set('Authorization', `Bearer ${token}`);
      return request(path, { ...options, headers });
    };
    try { return await send(session.accessToken); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || version !== generation) throw error;
      const renewed = state.session && state.session.accessToken !== session.accessToken ? state.session : await refresh();
      // A failed mutation is never automatically replayed.
      if (!['GET', 'HEAD'].includes((options.method ?? 'GET').toUpperCase())) throw new ApiError('Sesión renovada. Reintenta la operación.', 401);
      return send(renewed.accessToken);
    }
  }
  return { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, signIn, signOut, restore, syncFromStorage, refresh, authorizedRequest };
}
export const authClient = createAuthClient();
