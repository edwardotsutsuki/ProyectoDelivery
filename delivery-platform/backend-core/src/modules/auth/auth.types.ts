export type UserRole = 'admin' | 'comercio' | 'repartidor' | 'cliente';

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserPayload;
  tokens: AuthTokens;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
