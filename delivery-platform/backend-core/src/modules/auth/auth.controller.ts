import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserRole } from './auth.types';
import { pool } from '../../config/database';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role, phone } = req.body;

      if (!name || !email || !password || !role) {
        res.status(400).json({
          success: false,
          message: 'Los campos name, email, password y role son obligatorios',
        });
        return;
      }

      const validRoles: UserRole[] = ['admin', 'comercio', 'repartidor', 'cliente'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          message: `El rol '${role}' no es válido. Roles permitidos: ${validRoles.join(', ')}`,
        });
        return;
      }

      const user = await AuthService.registerUser({ name, email, password, role, phone });
      const tokens = AuthService.generateTokens(user);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: { user, tokens },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al registrar usuario',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Debe ingresar email y contraseña',
        });
        return;
      }

      const user: any = await AuthService.findUserByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas (usuario no encontrado)',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas (contraseña incorrecta)',
        });
        return;
      }

      const userPayload: any = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        estadoActivo: user.estadoActivo,
      };

      if (user.role === 'comercio') {
        userPayload.comercioId = user.comercioId || '55555555-5555-5555-5555-555555555555';
        userPayload.nombreComercial = user.nombreComercial;
        userPayload.estadoAprobacion = user.estadoAprobacion || 'aprobado';
      }

      const tokens = AuthService.generateTokens(userPayload);

      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: userPayload,
          tokens,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
      });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Debe proporcionar refreshToken',
        });
        return;
      }

      const decoded = AuthService.verifyRefreshToken(refreshToken);
      const user = await AuthService.findUserById(decoded.id);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no encontrado para este token de renovación',
        });
        return;
      }

      const newTokens = AuthService.generateTokens(user);

      res.status(200).json({
        success: true,
        message: 'Token refrescado correctamente',
        data: {
          user,
          tokens: newTokens,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado',
      });
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Perfil recuperado correctamente',
      data: req.user,
    });
  }

  static async afiliarComercio(req: Request, res: Response): Promise<void> {
    try {
      const {
        nombreComercial,
        categoria = 'Restaurante',
        descripcion = '',
        direccion,
        canton = 'baba',
        telefonoComercio,
        ruc,
        razonSocial,
        banco,
        tipoCuenta = 'ahorros',
        numeroCuenta,
        titularCuenta,
        nombreEncargado,
        email,
        password,
        telefonoEncargado,
        lat,
        lon,
      } = req.body;

      if (!nombreComercial || !direccion || !email || !password || !nombreEncargado) {
        res.status(400).json({
          success: false,
          message: 'Nombre comercial, dirección, nombre del encargado, correo y contraseña son obligatorios.',
        });
        return;
      }

      // Validar si el email ya existe
      const existing = await pool.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [email]);
      if (existing.rows && existing.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: 'El correo electrónico ya se encuentra registrado.',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Coordenadas predeterminadas por cantón
      const isBabahoyo = (canton || '').toLowerCase() === 'babahoyo' || (direccion || '').toLowerCase().includes('babahoyo');
      const defaultLat = isBabahoyo ? -1.8022 : -1.7917;
      const defaultLon = isBabahoyo ? -79.5344 : -79.6783;
      const finalLat = lat !== undefined && lat !== null ? Number(lat) : defaultLat;
      const finalLon = lon !== undefined && lon !== null ? Number(lon) : defaultLon;
      const costoEnvio = isBabahoyo ? 1.50 : 1.25;

      // 1. Crear usuario con rol comercio (pendiente de aprobación, inactivo por defecto)
      const userRes = await pool.query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, estado_activo)
        VALUES ($1, $2, $3, 'comercio', $4, false)
        RETURNING id, nombre, email, rol;
      `, [nombreEncargado, email.toLowerCase().trim(), passwordHash, telefonoEncargado || telefonoComercio || '+593900000000']);

      const nuevoUsuario = userRes.rows[0];

      // 2. Crear comercio con estado_aprobacion = 'pendiente' y is_abierto = false
      const comRes = await pool.query(`
        INSERT INTO comercios (
          usuario_id, nombre_comercial, descripcion, direccion,
          ubicacion, is_abierto, telefono, categoria,
          tiempo_entrega_promedio, costo_base_envio,
          ruc, razon_social, banco, tipo_cuenta, numero_cuenta, titular_cuenta,
          estado_aprobacion, fecha_solicitud
        ) VALUES (
          $1, $2, $3, $4,
          ST_SetSRID(ST_MakePoint($5, $6), 4326), false, $7, $8,
          30, $9,
          $10, $11, $12, $13, $14, $15,
          'pendiente', NOW()
        )
        RETURNING id, nombre_comercial, estado_aprobacion, direccion, ruc, banco;
      `, [
        nuevoUsuario.id,
        nombreComercial,
        descripcion,
        direccion,
        finalLon,
        finalLat,
        telefonoComercio || telefonoEncargado,
        categoria,
        costoEnvio,
        ruc || null,
        razonSocial || null,
        banco || null,
        tipoCuenta || 'ahorros',
        numeroCuenta || null,
        titularCuenta || nombreEncargado,
      ]);

      const nuevoComercio = comRes.rows[0];

      // 3. Vincular comercio_id en el registro del usuario
      await pool.query('UPDATE usuarios SET comercio_id = $1 WHERE id = $2', [nuevoComercio.id, nuevoUsuario.id]);

      res.status(201).json({
        success: true,
        message: '¡Solicitud de afiliación registrada con éxito! Tu restaurante será evaluado por nuestro equipo administrativo para su activación.',
        data: {
          comercioId: nuevoComercio.id,
          nombreComercial: nuevoComercio.nombre_comercial,
          estadoAprobacion: nuevoComercio.estado_aprobacion,
          usuario: nuevoUsuario.email,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al procesar solicitud de afiliación',
      });
    }
  }
}

