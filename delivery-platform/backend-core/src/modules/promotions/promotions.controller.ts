import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';

export const promotionsRouter = Router();

// ============================================================================
// 1. Validar Cupón de Descuento (Checkout de Cliente)
// ============================================================================
promotionsRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const { codigo, subtotal = 0, costoEnvio = 1.00, comercioId } = req.body;

    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Debes ingresar un código de cupón válido.'
      });
    }

    const cleanCode = codigo.trim().toUpperCase();
    const numSubtotal = Math.max(0, parseFloat(subtotal) || 0);
    const numEnvio = Math.max(0, parseFloat(costoEnvio) || 0);

    const query = `
      SELECT id, codigo, titulo, descripcion, tipo, valor, tope_descuento_maximo,
             compra_minima, limite_usos_total, usos_actuales, comercio_id,
             financiado_por, fecha_inicio, fecha_fin, is_activo
      FROM promociones_cupones
      WHERE UPPER(codigo) = $1
    `;
    const result = await pgPool.query(query, [cleanCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: `El cupón "${cleanCode}" no existe o ya caducó.`
      });
    }

    const cupon = result.rows[0];

    // Verificar si está activo
    if (!cupon.is_activo) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `El cupón "${cleanCode}" se encuentra temporalmente inactivo.`
      });
    }

    // Verificar vigencia de fechas
    const now = new Date();
    if (new Date(cupon.fecha_inicio) > now || new Date(cupon.fecha_fin) < now) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `El cupón "${cleanCode}" ha expirado.`
      });
    }

    // Verificar límite de usos totales
    if (cupon.limite_usos_total !== null && cupon.usos_actuales >= cupon.limite_usos_total) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `El cupón "${cleanCode}" alcanzó el límite máximo de canjes disponibles.`
      });
    }

    // Verificar si aplica a un comercio específico
    if (cupon.comercio_id && comercioId && cupon.comercio_id !== comercioId) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Este cupón solo es válido para el comercio asignado.`
      });
    }

    // Verificar compra mínima
    const compraMinima = parseFloat(cupon.compra_minima) || 0;
    if (numSubtotal < compraMinima) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Para aplicar este cupón, el pedido mínimo en productos debe ser de $${compraMinima.toFixed(2)}. Te faltan $${(compraMinima - numSubtotal).toFixed(2)}.`
      });
    }

    // Calcular descuento exacto según tipo
    let descuento = 0;
    const valor = parseFloat(cupon.valor) || 0;
    const tope = cupon.tope_descuento_maximo ? parseFloat(cupon.tope_descuento_maximo) : null;

    if (cupon.tipo === 'monto_fijo') {
      descuento = Math.min(valor, numSubtotal);
    } else if (cupon.tipo === 'porcentaje') {
      const descCalculado = (numSubtotal * valor) / 100;
      descuento = tope ? Math.min(descCalculado, tope) : descCalculado;
      descuento = Math.min(descuento, numSubtotal);
    } else if (cupon.tipo === 'envio_gratis') {
      descuento = numEnvio;
    }

    // Redondear a 2 decimales
    descuento = Math.round(descuento * 100) / 100;

    res.json({
      success: true,
      valid: true,
      message: `¡Cupón "${cleanCode}" aplicado con éxito!`,
      descuento,
      tipo: cupon.tipo,
      financiado_por: cupon.financiado_por,
      cupon: {
        id: cupon.id,
        codigo: cupon.codigo,
        titulo: cupon.titulo,
        descripcion: cupon.descripcion,
        tipo: cupon.tipo,
        valor: parseFloat(cupon.valor),
        tope_descuento_maximo: tope,
        compra_minima: compraMinima,
        financiado_por: cupon.financiado_por
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 2. Listar Todos los Cupones (Backoffice Admin)
// ============================================================================
promotionsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT p.*, COALESCE(c.nombre_comercial, 'Todos los Locales (Global)') as comercio_nombre
      FROM promociones_cupones p
      LEFT JOIN comercios c ON c.id = p.comercio_id
      ORDER BY p.is_activo DESC, p.created_at DESC;
    `;
    const result = await pgPool.query(query);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 3. Crear Nuevo Cupón de Descuento (Backoffice Admin)
// ============================================================================
promotionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      codigo,
      titulo,
      descripcion,
      tipo = 'porcentaje',
      valor,
      tope_descuento_maximo = null,
      compra_minima = 0.00,
      limite_usos_total = null,
      comercio_id = null,
      financiado_por = 'plataforma',
      fecha_inicio = new Date(),
      fecha_fin,
      is_activo = true
    } = req.body;

    if (!codigo || !titulo || valor === undefined || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'Código, título, valor y fecha de finalización son requeridos.'
      });
    }

    const cleanCode = codigo.trim().toUpperCase();

    const insertQuery = `
      INSERT INTO promociones_cupones (
        codigo, titulo, descripcion, tipo, valor, tope_descuento_maximo,
        compra_minima, limite_usos_total, comercio_id, financiado_por,
        fecha_inicio, fecha_fin, is_activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const result = await pgPool.query(insertQuery, [
      cleanCode,
      titulo.trim(),
      descripcion ? descripcion.trim() : null,
      tipo,
      parseFloat(valor),
      tope_descuento_maximo ? parseFloat(tope_descuento_maximo) : null,
      parseFloat(compra_minima) || 0.00,
      limite_usos_total ? parseInt(limite_usos_total, 10) : null,
      comercio_id || null,
      financiado_por,
      fecha_inicio,
      fecha_fin,
      Boolean(is_activo)
    ]);

    res.status(201).json({
      success: true,
      message: `Cupón "${cleanCode}" creado exitosamente`,
      data: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe un cupón con este código.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 4. Actualizar Cupón (Backoffice Admin)
// ============================================================================
promotionsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descripcion,
      tipo,
      valor,
      tope_descuento_maximo,
      compra_minima,
      limite_usos_total,
      comercio_id,
      financiado_por,
      fecha_inicio,
      fecha_fin,
      is_activo
    } = req.body;

    const updateQuery = `
      UPDATE promociones_cupones
      SET
        titulo = COALESCE($1, titulo),
        descripcion = COALESCE($2, descripcion),
        tipo = COALESCE($3, tipo),
        valor = COALESCE($4, valor),
        tope_descuento_maximo = $5,
        compra_minima = COALESCE($6, compra_minima),
        limite_usos_total = $7,
        comercio_id = $8,
        financiado_por = COALESCE($9, financiado_por),
        fecha_inicio = COALESCE($10, fecha_inicio),
        fecha_fin = COALESCE($11, fecha_fin),
        is_activo = COALESCE($12, is_activo),
        updated_at = NOW()
      WHERE id::text = $13
      RETURNING *;
    `;

    const result = await pgPool.query(updateQuery, [
      titulo || null,
      descripcion || null,
      tipo || null,
      valor !== undefined ? parseFloat(valor) : null,
      tope_descuento_maximo !== undefined ? (tope_descuento_maximo ? parseFloat(tope_descuento_maximo) : null) : null,
      compra_minima !== undefined ? parseFloat(compra_minima) : null,
      limite_usos_total !== undefined ? (limite_usos_total ? parseInt(limite_usos_total, 10) : null) : null,
      comercio_id !== undefined ? (comercio_id || null) : null,
      financiado_por || null,
      fecha_inicio || null,
      fecha_fin || null,
      is_activo !== undefined ? Boolean(is_activo) : null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
    }

    res.json({
      success: true,
      message: 'Cupón actualizado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 5. Toggle Activar / Desactivar Cupón
// ============================================================================
promotionsRouter.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE promociones_cupones
      SET is_activo = NOT is_activo, updated_at = NOW()
      WHERE id::text = $1
      RETURNING id, codigo, is_activo;
    `;
    const result = await pgPool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
    }
    res.json({
      success: true,
      message: `Cupón ${result.rows[0].is_activo ? 'ACTIVADO' : 'DESACTIVADO'}`,
      is_activo: result.rows[0].is_activo
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 6. Eliminar Cupón
// ============================================================================
promotionsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pgPool.query('DELETE FROM promociones_cupones WHERE id::text = $1 RETURNING id, codigo;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
    }
    res.json({
      success: true,
      message: `Cupón "${result.rows[0].codigo}" eliminado exitosamente`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
