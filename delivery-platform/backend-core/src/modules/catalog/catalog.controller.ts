import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';
import { redisClient } from '../../config/redis';

export const catalogRouter = Router();

// Catálogo con disponibilidad en tiempo real (Redis + Postgres)
catalogRouter.get('/comercio/:comercioId/productos', async (req: Request, res: Response) => {
  try {
    const { comercioId } = req.params;

    const query = `
      SELECT id, comercio_id, nombre, descripcion, precio, imagen_url, is_disponible, categoria
      FROM productos
      WHERE comercio_id = $1
      ORDER BY categoria, nombre;
    `;
    const result = await pgPool.query(query, [comercioId]);
    const productos = result.rows;

    const pipeline = redisClient.pipeline();
    productos.forEach((p) => {
      pipeline.get(`catalog:disponibilidad:${p.id}`);
    });
    const redisResults = await pipeline.exec();

    const productosConEstadoActualizado = productos.map((p, index) => {
      const redisVal = redisResults?.[index]?.[1];
      if (redisVal !== null && redisVal !== undefined) {
        return { ...p, is_disponible: redisVal === '1' };
      }
      return p;
    });

    res.json({ success: true, data: productosConEstadoActualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Interruptor rápido On/Off de disponibilidad (Redis)
catalogRouter.patch('/producto/:productoId/toggle-disponibilidad', async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    const { is_disponible } = req.body;

    await redisClient.set(`catalog:disponibilidad:${productoId}`, is_disponible ? '1' : '0');
    await pgPool.query('UPDATE productos SET is_disponible = $1, fecha_actualizacion = NOW() WHERE id = $2', [
      is_disponible,
      productoId,
    ]);

    res.json({
      success: true,
      message: `Producto ${productoId} ahora está ${is_disponible ? 'DISPONIBLE' : 'AGOTADO'}`,
      is_disponible,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
