import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';

export const userRouter = Router();

// Obtener lista de comercios cercanos usando PostGIS
userRouter.get('/comercios-cercanos', async (req: Request, res: Response) => {
  try {
    const lon = parseFloat(req.query.lon as string) || -79.8891;
    const lat = parseFloat(req.query.lat as string) || -2.1894;
    const radioMetros = parseInt(req.query.radioMetros as string, 10) || 5000;

    const query = `
      SELECT 
        c.id, 
        c.nombre_comercial, 
        c.descripcion, 
        c.direccion, 
        c.is_abierto, 
        c.categoria,
        c.tiempo_entrega_promedio,
        c.calificacion,
        ST_X(c.ubicacion::geometry) as longitud,
        ST_Y(c.ubicacion::geometry) as latitud,
        ROUND(ST_Distance(c.ubicacion, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) as distancia_metros
      FROM comercios c
      WHERE ST_DWithin(c.ubicacion, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY c.is_abierto DESC, distancia_metros ASC;
    `;

    const result = await pgPool.query(query, [lon, lat, radioMetros]);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

userRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { rol } = req.query;
    let query = 'SELECT id, nombre, email, telefono, rol, estado_activo, fecha_creacion FROM usuarios';
    const params: any[] = [];

    if (rol) {
      query += ' WHERE rol = $1';
      params.push(rol);
    }

    const result = await pgPool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
