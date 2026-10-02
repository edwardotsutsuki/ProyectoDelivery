import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
const THEME_KEY = 'delivery.comercio.theme';
type Theme = 'light' | 'dark';
const ThemeContext = createContext({ dark: false, toggle: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(() => {
    try { const saved = localStorage.getItem(THEME_KEY); return saved === 'light' || saved === 'dark' ? saved : null; } catch { return null; }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = preference ? preference === 'dark' : systemDark;
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  function toggle() {
    const next = dark ? 'light' : 'dark';
    setPreference(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* Theme still works without persistence. */ }
  }
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
