import { useAuth } from '../AuthProvider';
import { Alert, Button } from './ui';
export default function SessionStatus() {
  const { status, message, client } = useAuth();
  return <main className="login-screen flex min-h-screen items-center justify-center bg-stone-50 px-6 text-slate-900 dark:bg-slate-950 dark:text-white"><div className="w-full max-w-md space-y-5 rounded-3xl border border-solid border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
    <h1 className="text-2xl font-bold">{status === 'checking' ? 'Verificando tu sesión' : 'No pudimos verificar tu acceso'}</h1>
    {status === 'checking' ? <p role="status" className="text-sm text-slate-500">Un momento, estamos comprobando tu cuenta.</p> : <><Alert>{message}</Alert><Button onClick={() => void client.restore()} className="w-full">Reintentar</Button><button className="w-full rounded-lg border-0 bg-transparent p-3 text-sm text-rose-600 dark:text-rose-400" onClick={() => client.signOut()}>Volver al inicio de sesión</button></>}
  </div></main>;
}
