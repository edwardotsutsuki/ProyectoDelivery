import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { authClient, SESSION_KEY, tokenExpiresAt } from './auth';
const AuthContext = createContext(authClient);
export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(authClient.subscribe, authClient.getSnapshot);
  useEffect(() => {
    void authClient.restore();
    const sync = (event: StorageEvent) => { if (event.key === SESSION_KEY || event.key === null) void authClient.syncFromStorage(); };
    const focus = () => {
      const current = authClient.getSnapshot();
      if (current.session && tokenExpiresAt(current.session.accessToken) <= Date.now()) void authClient.refresh().catch(() => undefined);
    };
    window.addEventListener('storage', sync); window.addEventListener('focus', focus);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', focus); };
  }, []);
  useEffect(() => {
    if (!snapshot.session) return;
    const timer = setTimeout(() => { void authClient.refresh().catch(() => undefined); }, Math.max(0, Math.min(tokenExpiresAt(snapshot.session.accessToken) - Date.now(), 2147483647)));
    return () => clearTimeout(timer);
  }, [snapshot.session]);
  return <AuthContext.Provider value={authClient}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const client = useContext(AuthContext);
  return { ...useSyncExternalStore(client.subscribe, client.getSnapshot), client };
}
