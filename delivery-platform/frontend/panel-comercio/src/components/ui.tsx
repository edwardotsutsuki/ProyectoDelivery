import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
export function Button({ busy, children, className = '', disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return <button {...props} disabled={disabled || busy} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-0 bg-rose-600 px-5 py-3 font-bold text-white transition-colors hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
    {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{children}
  </button>;
}
export function Alert({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'info' }) {
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border border-solid p-4 text-sm leading-relaxed ${kind === 'error' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200' : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200'}`}><AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{children}</span></div>;
}
export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; trailing?: ReactNode }>(function TextField({ label, error, trailing, className = '', id, ...props }, ref) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label><div className="relative">
    <input {...props} ref={ref} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : props['aria-describedby']} className={`min-h-12 w-full rounded-xl border border-solid bg-white px-4 py-3 text-base text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/25 dark:bg-slate-950 dark:text-white disabled:opacity-60 ${error ? 'border-red-500' : 'border-slate-300 focus:border-rose-500 dark:border-slate-600'} ${trailing ? 'pr-14' : ''} ${className}`} />{trailing}</div>
    {error && <p id={`${id}-error`} className="pt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>;
});
