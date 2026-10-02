import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
  apiBaseUrl?: string;
}

export default function LoginPage({
  onLoginSuccess,
  apiBaseUrl = 'http://localhost:8080/api/v1',
}: LoginPageProps) {
  const [email, setEmail] = useState('admin@delivery.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Credenciales inválidas o acceso no autorizado.');
      }

      const user = data.data?.user;
      const tokens = data.data?.tokens;

      if (user?.role !== 'admin') {
        throw new Error('Acceso restringido: Esta cuenta no tiene permisos de Administrador.');
      }

      const token = tokens?.accessToken || '';
      localStorage.setItem('delivery_admin_token', token);
      localStorage.setItem('delivery_admin_user', JSON.stringify(user));

      onLoginSuccess(user, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión con el Gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofillDemo = () => {
    setEmail('admin@delivery.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 80%)',
      padding: '20px',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#0f172a',
        borderRadius: '24px',
        border: '1px solid #1e293b',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(225, 29, 72, 0.3)',
          }}>
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#fff' }}>Backoffice Admin</h1>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Torre de Control Operativa · Los Ríos</div>
          </div>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5, margin: '16px 0 24px 0' }}>
          Ingreso autorizado para supervisión de comandas, locales y tarifas en <strong>Baba</strong> y <strong>Babahoyo</strong>.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>
              Correo Corporativo
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@delivery.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>
              Contraseña de Acceso
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }}>
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
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
              padding: '14px',
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Verificando Credenciales...
              </>
            ) : (
              <>
                Ingresar al Mando Central <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#64748b',
        }}>
          <span>Piloto Los Ríos (Baba - Babahoyo)</span>
          <button
            type="button"
            onClick={handleAutofillDemo}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: '700',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Autocompletar Demo
          </button>
        </div>
      </div>
    </div>
  );
}
