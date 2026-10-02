import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Rutas protegidas
router.get('/me', requireAuth, AuthController.getProfile);

// Ruta protegida de prueba para panel de comercio
router.get('/comercio/check', requireAuth, requireRole(['comercio', 'admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Acceso autorizado al panel del restaurante / cocina en Baba',
    user: req.user,
  });
});

export default router;

