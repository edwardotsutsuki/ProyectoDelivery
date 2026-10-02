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
  comercioId?: string;
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
    comercioId: '55555555-5555-5555-5555-555555555555',
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
    const refreshToken = jwt.sign({ id: payload.id, role: payload.role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  static async findUserByEmail(email: string) {
    try {
      const res = await pool.query(`
        SELECT u.id, u.nombre, u.email, u.password_hash, u.rol, u.telefono, u.estado_activo,
               COALESCE(u.comercio_id, c.id) as comercio_id, c.nombre_comercial, c.estado_aprobacion
        FROM usuarios u
        LEFT JOIN comercios c ON (c.id = u.comercio_id OR c.usuario_id = u.id)
        WHERE LOWER(u.email) = LOWER($1) LIMIT 1
      `, [email]);
      if (res.rows && res.rows.length > 0) {
        const u = res.rows[0];
        return {
          id: u.id,
          name: u.nombre,
          email: u.email,
          passwordHash: u.password_hash,
          role: u.rol as UserRole,
          phone: u.telefono,
          estadoActivo: u.estado_activo,
          comercioId: u.comercio_id,
          nombreComercial: u.nombre_comercial,
          estadoAprobacion: u.estado_aprobacion || 'aprobado',
        };
      }
    } catch (err) {
      console.warn('⚠️ Base de datos no disponible para consulta de usuarios, usando almacén mock');
    }

    return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  static async findUserById(id: string): Promise<UserPayload | null> {
    try {
      const res = await pool.query(`
        SELECT u.id, u.nombre, u.email, u.rol, u.telefono, c.id as comercio_id
        FROM usuarios u
        LEFT JOIN comercios c ON c.usuario_id = u.id
        WHERE u.id::text = $1 LIMIT 1
      `, [id]);
      if (res.rows && res.rows.length > 0) {
        const u = res.rows[0];
        return {
          id: u.id,
          name: u.nombre,
          email: u.email,
          role: u.rol as UserRole,
          phone: u.telefono,
          comercioId: u.comercio_id,
        };
      }
    } catch (err) {
      // Fallback a mock
    }

    const mock = mockUsers.find((u) => u.id === id);
    if (mock) {
      return {
        id: mock.id,
        name: mock.name,
        email: mock.email,
        role: mock.role,
        phone: mock.phone,
        comercioId: mock.comercioId,
      };
    }
    return null;
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
        INSERT INTO usuarios (id, nombre, email, password_hash, rol, telefono, fecha_creacion)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, nombre as name, email, rol as role, telefono as phone
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

  static verifyRefreshToken(refreshToken: string): { id: string; role?: UserRole } {
    return jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; role?: UserRole };
  }
}

