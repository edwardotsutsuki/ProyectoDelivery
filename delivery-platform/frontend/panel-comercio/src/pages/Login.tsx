import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, ChefHat, Eye, EyeOff, LockKeyhole, Moon, Sun, UtensilsCrossed, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { useTheme } from '../ThemeProvider';
import { config } from '../config';
import { Alert, Button, TextField } from '../components/ui';
import SessionStatus from '../components/SessionStatus';

export default function Login() {
  const { status, message, client } = useAuth();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const next = {
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Ingresa un correo electrónico válido.' : undefined,
      password: !password ? 'Ingresa tu contraseña.' : undefined,
    };
    setErrors(next); setError('');
    if (next.email || next.password) { (next.email ? emailRef : passwordRef).current?.focus(); return; }
    const controller = new AbortController(); pending.current = controller; setLoading(true);
    try {
      await client.signIn(email, password, remember, controller.signal);
      if (pending.current === controller) setPassword('');
    } catch (cause) {
      if (pending.current === controller) setError(cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.');
    } finally {
      if (pending.current === controller) { pending.current = null; setLoading(false); }
    }
  }
  if (status === 'authenticated') return <Navigate to="/pedidos" replace />;
  if (status === 'checking' || status === 'unavailable') return <SessionStatus />;
  return <div className="login-screen min-h-screen bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <a href="#login-form" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-white focus:p-3 focus:text-rose-700">Ir al formulario de acceso</a>
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-12">
      <div className="flex items-center gap-3"><span className="flex rounded-xl bg-rose-600 p-2.5 text-white"><UtensilsCrossed aria-hidden="true" /></span><div className="text-xl font-extrabold">Delivery<span className="text-rose-600 dark:text-rose-400">Ya</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Portal de comercios</span></div></div>
      <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} className="flex min-h-12 min-w-12 items-center justify-center rounded-full border border-solid border-slate-200 bg-white text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
    </header>
    <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-10 sm:px-12 lg:grid-cols-2 lg:gap-20 lg:py-16">
      <section className="hidden lg:block" aria-label="Tu operación en un solo lugar">
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-rose-800 dark:bg-rose-950 dark:text-rose-300"><ChefHat size={16} aria-hidden="true" />Hecho para tu cocina</span>
        <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight">Más sabor.<br /><span className="text-rose-600 dark:text-rose-400">Menos complicaciones.</span></h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-400">Tu equipo, tus pedidos y cada entrega. Un espacio pensado para el ritmo de tu restaurante.</p>
        <div className="mt-8 space-y-4">{['Cada comanda, clara y a tiempo', 'Administración y cocina conectadas', 'El control de tu operación, a mano'].map(text => <p key={text} className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300"><CheckCircle2 size={19} className="text-rose-500" aria-hidden="true" />{text}</p>)}</div>
        <div className="mt-10 rounded-2xl border border-solid border-rose-200 bg-rose-50 p-6 dark:border-slate-700 dark:bg-slate-900"><p className="font-bold">Listos para un nuevo turno.</p><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Ingresa con la cuenta asignada por tu administrador y reúne a tu equipo alrededor de cada pedido.</p></div>
      </section>
      <section className="w-full max-w-md justify-self-center rounded-3xl border border-solid border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="login-title">
        <span className="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Bienvenido a tu comercio</span>
        <h2 id="login-title" className="mt-3 text-3xl font-extrabold tracking-tight">Inicia tu turno</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ingresa tus datos para continuar al panel.</p>
        <form id="login-form" onSubmit={submit} noValidate className="mt-7 space-y-5" aria-busy={loading}>
          {message && !error && <Alert kind="info">{message}</Alert>}
          {error && <div ref={errorRef} tabIndex={-1} className="rounded-xl focus:outline-none"><Alert>{error}</Alert></div>}
          <TextField ref={emailRef} id="email" name="email" label="Correo electrónico" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="nombre@restaurante.com" value={email} onChange={event => { setEmail(event.target.value); setErrors(previous => ({ ...previous, email: undefined })); }} disabled={loading} error={errors.email} />
          <TextField ref={passwordRef} id="password" name="password" label="Contraseña" type={visible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => { setPassword(event.target.value); setErrors(previous => ({ ...previous, password: undefined })); }} onKeyUp={event => setCapsLock(event.getModifierState('CapsLock'))} onKeyDown={event => setCapsLock(event.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} disabled={loading} error={errors.password} aria-describedby={capsLock ? 'caps-lock' : undefined} trailing={<button type="button" disabled={loading} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-xl border-0 bg-transparent text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button>} />
          {capsLock && <p id="caps-lock" role="status" className="text-xs text-amber-700 dark:text-amber-300">Bloq Mayús está activado.</p>}
          <div><label className="flex min-h-8 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} disabled={loading} className="h-4 w-4 accent-rose-600" />Recordarme en este dispositivo</label><p className="mt-1 pl-7 text-xs text-slate-500 dark:text-slate-400">Úsalo solo en un dispositivo personal.</p></div>
          <Button type="submit" busy={loading} className="w-full"><span aria-live="polite">{loading ? 'Verificando acceso…' : 'Ingresar al panel'}</span>{!loading && <ArrowRight size={18} aria-hidden="true" />}</Button>
          <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">¿Necesitas una cuenta o recuperar tu acceso?<br />Contacta al administrador de tu restaurante.</p>
        </form>
        <div className="mt-6 flex items-center justify-center gap-2 border-0 border-t border-solid border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"><LockKeyhole size={14} aria-hidden="true" />Acceso para administración y cocina</div>
        {config.demosEnabled && <p className="mt-5 text-center text-xs"><Link to="/demo/pedidos" className="rounded text-rose-700 underline underline-offset-4 dark:text-rose-300">Explorar tablero de demostración</Link><span className="mt-1 block text-slate-500">Datos ficticios · sin iniciar sesión</span></p>}
      </section>
    </main>
    <footer className="px-6 py-7 text-center text-xs text-slate-500">DeliveryYa Comercios · Cada pedido cuenta.</footer>
  </div>;
}
