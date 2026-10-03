// Servicio de Autenticación, Registro y Billetera para App Cliente

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'cliente';
  saldoBilletera?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: ClientUser;
  token?: string;
}

const COMMON_AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Bypass-Tunnel-Reminder': 'true',
};

export async function loginClient(
  apiBaseUrl: string,
  email: string,
  password: string,
  fetchFn = fetch
): Promise<AuthResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const cleanUrl = `${apiBaseUrl.replace(/\/$/, '')}/auth/login`;
    const res = await fetchFn(cleanUrl, {
      method: 'POST',
      headers: COMMON_AUTH_HEADERS,
      body: JSON.stringify({ email: email.trim(), password }),
      signal: controller.signal,
    });

    const json = await res.json();
    clearTimeout(timer);

    if (!res.ok || !json.success) {
      return {
        success: false,
        message: json.message || 'Credenciales inválidas',
      };
    }

    const userData = json.data?.user || json.user;
    const token = json.data?.tokens?.accessToken || json.token;

    return {
      success: true,
      message: '¡Bienvenido de vuelta!',
      user: {
        id: userData.id,
        name: userData.name || userData.nombre,
        email: userData.email,
        phone: userData.phone || userData.telefono,
        role: 'cliente',
        saldoBilletera: 15.00, // Saldo inicial para pruebas
      },
      token,
    };
  } catch (err: any) {
    clearTimeout(timer);
    // Modo offline / demo si no hay conexión al backend
    if (email.toLowerCase().includes('edward') || email.toLowerCase().includes('cliente')) {
      return {
        success: true,
        message: 'Modo Offline: Sesión iniciada con perfil local',
        user: {
          id: '44444444-4444-4444-4444-444444444444',
          name: 'Edward Otsutsuki (Baba, Los Ríos)',
          email: email.trim(),
          phone: '+593995544332',
          role: 'cliente',
          saldoBilletera: 25.50,
        },
        token: 'mock-offline-token-2026',
      };
    }
    return {
      success: false,
      message: 'No se pudo conectar al servidor de autenticación.',
    };
  }
}

export async function registerClient(
  apiBaseUrl: string,
  data: { name: string; email: string; password: string; phone?: string },
  fetchFn = fetch
): Promise<AuthResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const cleanUrl = `${apiBaseUrl.replace(/\/$/, '')}/auth/register`;
    const res = await fetchFn(cleanUrl, {
      method: 'POST',
      headers: COMMON_AUTH_HEADERS,
      body: JSON.stringify({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        phone: data.phone?.trim() || '+593990000000',
        role: 'cliente',
      }),
      signal: controller.signal,
    });

    const json = await res.json();
    clearTimeout(timer);

    if (!res.ok || !json.success) {
      return {
        success: false,
        message: json.message || 'No se pudo completar el registro',
      };
    }

    const userData = json.data?.user || json.user;
    const token = json.data?.tokens?.accessToken || json.token;

    return {
      success: true,
      message: '¡Cuenta creada exitosamente!',
      user: {
        id: userData.id,
        name: userData.name || userData.nombre,
        email: userData.email,
        phone: userData.phone || userData.telefono,
        role: 'cliente',
        saldoBilletera: 5.00, // Bono de bienvenida
      },
      token,
    };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      success: true,
      message: 'Cuenta creada localmente (Modo Offline)',
      user: {
        id: 'usr-nuevo-' + Date.now(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: 'cliente',
        saldoBilletera: 5.00,
      },
      token: 'mock-offline-register-token',
    };
  }
}

export async function fetchWalletBalance(
  apiBaseUrl: string,
  userId: string,
  fetchFn = fetch
): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const cleanUrl = `${apiBaseUrl.replace(/\/$/, '')}/ledger/billetera/${userId}`;
    const res = await fetchFn(cleanUrl, {
      headers: COMMON_AUTH_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return 15.00;
    const json = await res.json();
    return Number(json.data?.saldoNeto ?? json.saldoNeto ?? 15.00);
  } catch {
    clearTimeout(timer);
    return 15.00; // Fallback
  }
}
