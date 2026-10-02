import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserRole } from './auth.types';

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

      const user = await AuthService.findUserByEmail(email);
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
      };

      if (user.role === 'comercio') {
        userPayload.comercioId = user.comercioId || '55555555-5555-5555-5555-555555555555';
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
}

