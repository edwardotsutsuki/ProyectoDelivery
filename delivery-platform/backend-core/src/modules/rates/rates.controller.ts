import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';

export const ratesRouter = Router();

// ============================================================================
// 1. OBTENER TARIFAS DE ENVÍO Y COMISIONES POR ZONA
// ============================================================================
ratesRouter.get('/tarifas', async (req: Request, res: Response) => {
  try {
    const { all, canton } = req.query;
    let query = `
      SELECT 
        id, canton, zona_nombre, descripcion, radio_max_km,
        tarifa_envio, comision_repartidor_pct, comision_plataforma_pct,
        tarifa_servicio_cliente, tiempo_estimado_min, is_activa, orden,
        fecha_creacion, fecha_actualizacion
      FROM configuracion_tarifas
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (all !== 'true') {
      conditions.push('is_activa = true');
    }

    if (canton) {
      params.push(canton);
      conditions.push(`LOWER(canton) = LOWER($${params.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY orden ASC, canton ASC, tarifa_envio ASC;`;

    const result = await pgPool.query(query, params);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 2. CREAR NUEVA ZONA TARIFARIA
// ============================================================================
ratesRouter.post('/tarifas', async (req: Request, res: Response) => {
  try {
    const {
      canton = 'Baba',
      zonaNombre,
      descripcion = '',
      radioMaxKm = 3.0,
      tarifaEnvio = 1.00,
      comisionRepartidorPct = 80.00,
      comisionPlataformaPct = 20.00,
      tarifaServicioCliente = 0.00,
      tiempoEstimadoMin = 25,
      isActiva = true,
      orden = 0,
    } = req.body;

    if (!zonaNombre || !zonaNombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la zona es obligatorio' });
    }

    const query = `
      INSERT INTO configuracion_tarifas (
        canton, zona_nombre, descripcion, radio_max_km, tarifa_envio,
        comision_repartidor_pct, comision_plataforma_pct, tarifa_servicio_cliente,
        tiempo_estimado_min, is_activa, orden
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const result = await pgPool.query(query, [
      canton.trim(),
      zonaNombre.trim(),
      descripcion.trim(),
      Number(radioMaxKm),
      Number(tarifaEnvio),
      Number(comisionRepartidorPct),
      Number(comisionPlataformaPct),
      Number(tarifaServicioCliente),
      Number(tiempoEstimadoMin),
      Boolean(isActiva),
      Number(orden),
    ]);

    res.status(201).json({
      success: true,
      message: 'Zona tarifaria creada exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 3. ACTUALIZAR ZONA TARIFARIA
// ============================================================================
ratesRouter.put('/tarifas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      canton,
      zonaNombre,
      descripcion,
      radioMaxKm,
      tarifaEnvio,
      comisionRepartidorPct,
      comisionPlataformaPct,
      tarifaServicioCliente,
      tiempoEstimadoMin,
      isActiva,
      orden,
    } = req.body;

    const query = `
      UPDATE configuracion_tarifas
      SET
        canton = COALESCE($1, canton),
        zona_nombre = COALESCE($2, zona_nombre),
        descripcion = COALESCE($3, descripcion),
        radio_max_km = COALESCE($4, radio_max_km),
        tarifa_envio = COALESCE($5, tarifa_envio),
        comision_repartidor_pct = COALESCE($6, comision_repartidor_pct),
        comision_plataforma_pct = COALESCE($7, comision_plataforma_pct),
        tarifa_servicio_cliente = COALESCE($8, tarifa_servicio_cliente),
        tiempo_estimado_min = COALESCE($9, tiempo_estimado_min),
        is_activa = COALESCE($10, is_activa),
        orden = COALESCE($11, orden),
        fecha_actualizacion = NOW()
      WHERE id::text = $12
      RETURNING *;
    `;

    const result = await pgPool.query(query, [
      canton !== undefined ? canton : null,
      zonaNombre !== undefined ? zonaNombre : null,
      descripcion !== undefined ? descripcion : null,
      radioMaxKm !== undefined ? Number(radioMaxKm) : null,
      tarifaEnvio !== undefined ? Number(tarifaEnvio) : null,
      comisionRepartidorPct !== undefined ? Number(comisionRepartidorPct) : null,
      comisionPlataformaPct !== undefined ? Number(comisionPlataformaPct) : null,
      tarifaServicioCliente !== undefined ? Number(tarifaServicioCliente) : null,
      tiempoEstimadoMin !== undefined ? Number(tiempoEstimadoMin) : null,
      isActiva !== undefined ? Boolean(isActiva) : null,
      orden !== undefined ? Number(orden) : null,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarifa no encontrada' });
    }

    res.json({
      success: true,
      message: 'Tarifa actualizada exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 4. ALTERNAR ESTADO (Activo / Inactivo)
// ============================================================================
ratesRouter.patch('/tarifas/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE configuracion_tarifas
      SET is_activa = NOT is_activa, fecha_actualizacion = NOW()
      WHERE id::text = $1
      RETURNING id, zona_nombre, is_activa;
    `;
    const result = await pgPool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarifa no encontrada' });
    }

    res.json({
      success: true,
      message: `Tarifa ${result.rows[0].is_activa ? 'activada' : 'desactivada'}`,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 5. ELIMINAR ZONA TARIFARIA
// ============================================================================
ratesRouter.delete('/tarifas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pgPool.query('DELETE FROM configuracion_tarifas WHERE id::text = $1 RETURNING id, zona_nombre', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarifa no encontrada' });
    }
    res.json({
      success: true,
      message: `Zona tarifaria "${result.rows[0].zona_nombre}" eliminada`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
