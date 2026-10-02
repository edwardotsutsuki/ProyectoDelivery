import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
  apiBaseUrl: string;
}

export default function LoginPage({ onLoginSuccess, apiBaseUrl }: LoginPageProps) {
  const [email, setEmail] = useState('admin@delivery.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Credenciales de administrador inválidas');
      }

      const user = data.data.user;
      const token = data.data.tokens?.accessToken;

      if (user.role !== 'admin') {
        throw new Error('Acceso denegado: El usuario autenticado no posee rol de Administrador.');
      }

      localStorage.setItem('delivery_admin_token', token);
      localStorage.setItem('delivery_admin_user', JSON.stringify(user));
      onLoginSuccess(user, token);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor central');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e293b, #0f172a, #020617)',
      fontFamily: 'sans-serif',
      padding: '20px',
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '24px',
        padding: '36px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 16px auto',
            boxShadow: '0 4px 16px rgba(225, 29, 72, 0.4)',
          }}>
            <ShieldCheck size={30} />
          </div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '900', color: '#fff' }}>
            Backoffice Central
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Panel de Operaciones y Control · Baba & Babahoyo
          </p>
        </div>

        {error && (
          <div style={{
            background: '#450a0a',
            border: '1px solid #7f1d1d',
            color: '#fca5a5',
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
              Correo de Administrador
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@delivery.com"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              background: '#e11d48',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Ingresar al Backoffice'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Credencial demo: <strong>admin@delivery.com</strong> / <strong>admin123</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
