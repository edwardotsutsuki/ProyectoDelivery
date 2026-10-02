import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';
import { AuthTokens, UserPayload, UserRole } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_delivery_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_delivery_2026';

interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
}

// Usuarios de prueba predeterminados para desarrollo - Zona Baba & Babahoyo (Los Ríos, Ecuador)
const mockUsers: MockUser[] = [
  {
    id: 'usr-admin-01',
    name: 'Administrador General (Los Ríos)',
    email: 'admin@delivery.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin' as UserRole,
    phone: '+593991234567',
  },
  {
    id: 'usr-comercio-01',
    name: 'Picantería El Buen Sabor - Baba Centro',
    email: 'comercio@delivery.com',
    passwordHash: bcrypt.hashSync('comercio123', 10),
    role: 'comercio' as UserRole,
    phone: '+593987654321',
  },
  {
    id: 'usr-repartidor-01',
    name: 'Carlos Repartidor - Moto Baba 01',
    email: 'repartidor@delivery.com',
    passwordHash: bcrypt.hashSync('repartidor123', 10),
    role: 'repartidor' as UserRole,
    phone: '+593990011223',
  },
  {
    id: 'usr-cliente-01',
    name: 'Edward Otsutsuki (Baba, Los Ríos)',
    email: 'edward.otsutsuki@gmail.com',
    passwordHash: bcrypt.hashSync('cliente123', 10),
    role: 'cliente' as UserRole,
    phone: '+593995544332',
  },
];

export class AuthService {
  static generateTokens(payload: UserPayload): AuthTokens {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: payload.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  static async findUserByEmail(email: string) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
      if (res.rows && res.rows.length > 0) {
        const u = res.rows[0];
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.password_hash || u.password,
          role: u.role as UserRole,
          phone: u.phone,
        };
      }
    } catch (err) {
      console.warn('⚠️ Base de datos no disponible para consulta de usuarios, usando almacén mock');
    }

    return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  static async registerUser(data: { name: string; email: string; password: string; role: UserRole; phone?: string }) {
    const existing = await this.findUserByEmail(data.email);
    if (existing) {
      throw new Error('El correo electrónico ya se encuentra registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const newId = `usr-${Date.now()}`;

    try {
      const insertQuery = `
        INSERT INTO users (id, name, email, password_hash, role, phone, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, name, email, role, phone
      `;
      const res = await pool.query(insertQuery, [newId, data.name, data.email, passwordHash, data.role, data.phone || null]);
      if (res.rows && res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn('⚠️ Insert en DB falló o tabla no existe aún, registrando en mock');
    }

    const newUser: MockUser = {
      id: newId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone,
    };
    mockUsers.push(newUser);

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
    };
  }

  static verifyRefreshToken(refreshToken: string): { id: string } {
    return jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
  }
}
