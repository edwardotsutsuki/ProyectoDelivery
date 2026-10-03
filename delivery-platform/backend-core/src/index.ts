import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import { orderRouter } from './modules/orders/order.controller';
import { catalogRouter } from './modules/catalog/catalog.controller';
import { ledgerRouter } from './modules/finance-ledger/ledger.controller';
import { trackingRouter } from './modules/tracking/tracking.controller';
import { userRouter } from './modules/users/user.controller';
import { ratesRouter } from './modules/rates/rates.controller';
import { promotionsRouter } from './modules/promotions/promotions.controller';
import { pool } from './config/database';
import { redisClient } from './config/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de Verificación de Salud
app.get('/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    const dbRes = await pool.query('SELECT 1 as connected, NOW() as server_time');
    if (dbRes.rows.length > 0) dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  try {
    const ping = await redisClient.ping();
    if (ping === 'PONG') redisStatus = 'connected';
  } catch (err) {
    redisStatus = 'error';
  }

  res.status(200).json({
    status: 'online',
    service: 'delivery-backend-core',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
});

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.redirect('/health');
});

// Rutas de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', orderRouter);
app.use('/api/orders', orderRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/v1/ledger', ledgerRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/v1/tracking', trackingRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/users', userRouter);
app.use('/api/v1/config', ratesRouter);
app.use('/api/config', ratesRouter);
app.use('/api/v1/promotions', promotionsRouter);
app.use('/api/promotions', promotionsRouter);

// Manejador de 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Manejador global de errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error capturado en Backend Core:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Delivery Backend Core escuchando en puerto ${PORT}`);
  console.log(`👉 Auth Endpoints disponibles en /api/v1/auth`);
});

export default app;
