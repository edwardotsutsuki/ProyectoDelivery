import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';

export const ledgerRouter = Router();

// Helper para resolver alias de usuarios a UUIDs
function resolveUserId(id: string): string {
  const map: Record<string, string> = {
    'usr-admin-01': '11111111-1111-1111-1111-111111111111',
    'usr-comercio-01': '22222222-2222-2222-2222-222222222222',
    'usr-repartidor-01': '33333333-3333-3333-3333-333333333333',
    'usr-cliente-01': '44444444-4444-4444-4444-444444444444',
  };
  return map[id] || id;
}

// 1. Consultar saldo actual y extracto de movimientos (Billetera Repartidor / Comercio)
ledgerRouter.get('/billetera/:usuarioId', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.usuarioId;
    const targetUserId = resolveUserId(rawId);

    const balanceQuery = `
      SELECT COALESCE(SUM(monto), 0.00) as saldo_total
      FROM transacciones_ledger
      WHERE usuario_id::text = $1;
    `;

    let saldoTotal = 0.00;
    let movimientos: any[] = [];

    try {
      const balanceResult = await pgPool.query(balanceQuery, [targetUserId]);
      if (balanceResult.rows.length > 0) {
        saldoTotal = parseFloat(balanceResult.rows[0].saldo_total);
      }

      const historyQuery = `
        SELECT id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata, fecha_creacion
        FROM transacciones_ledger
        WHERE usuario_id::text = $1
        ORDER BY fecha_creacion DESC
        LIMIT 50;
      `;
      const historyResult = await pgPool.query(historyQuery, [targetUserId]);
      movimientos = historyResult.rows;
    } catch (dbErr) {
      console.warn('⚠️ No se pudo consultar transacciones en DB, entregando saldo cero mock');
    }

    res.json({
      success: true,
      data: {
        usuarioId: rawId,
        resolvedUserId: targetUserId,
        saldoActual: saldoTotal,
        moneda: 'USD',
        movimientos,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Asentar movimiento inmutable (Doble Entrada / Ledger Append-Only)
ledgerRouter.post('/movimiento', async (req: Request, res: Response) => {
  let client;
  try {
    const { usuarioId, pedidoId, tipoMovimiento, monto, descripcion, metadata = {} } = req.body;

    if (!usuarioId || !tipoMovimiento || monto === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Los campos usuarioId, tipoMovimiento y monto son obligatorios',
      });
    }

    const targetUserId = resolveUserId(usuarioId);

    client = await pgPool.connect();
    await client.query('BEGIN');

    // Bloquear fila de usuario para serializar transacciones concurrentes sin error de aggregate
    try {
      await client.query('SELECT id FROM usuarios WHERE id::text = $1 FOR UPDATE', [targetUserId]);
    } catch (lockErr) {
      // Ignorar si usuario no está en tabla usuarios
    }

    const currentBalanceQuery = `
      SELECT COALESCE(SUM(monto), 0.00) as saldo_actual
      FROM transacciones_ledger
      WHERE usuario_id::text = $1;
    `;
    const currentBalanceRes = await client.query(currentBalanceQuery, [targetUserId]);
    const saldoPrevio = parseFloat(currentBalanceRes.rows[0]?.saldo_actual || '0.00');
    const nuevoSaldo = saldoPrevio + parseFloat(monto);

    const insertQuery = `
      INSERT INTO transacciones_ledger (
        usuario_id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [
      targetUserId,
      pedidoId || null,
      tipoMovimiento,
      monto,
      nuevoSaldo,
      descripcion || `Movimiento ${tipoMovimiento}`,
      metadata,
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Transacción asentada en el ledger contable',
      data: result.rows[0],
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    if (client) client.release();
  }
});

// 3. Resumen financiero global (Para Backoffice y Auditoría)
ledgerRouter.get('/resumen-global', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        tipo_movimiento,
        COUNT(*) as total_operaciones,
        COALESCE(SUM(monto), 0.00) as balance_neto
      FROM transacciones_ledger
      GROUP BY tipo_movimiento;
    `;
    const result = await pgPool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. Liquidar caja de repartidor (Asentar depósito de efectivo en Backoffice)
ledgerRouter.post('/liquidar-caja', async (req: Request, res: Response) => {
  let client;
  try {
    const { repartidorId, monto, comprobante, notas } = req.body;
    if (!repartidorId || monto === undefined || parseFloat(monto) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'repartidorId y monto mayor a 0 son obligatorios',
      });
    }

    const targetUserId = resolveUserId(repartidorId);
    client = await pgPool.connect();
    await client.query('BEGIN');

    const currentBalanceQuery = `
      SELECT COALESCE(SUM(monto), 0.00) as saldo_actual
      FROM transacciones_ledger
      WHERE usuario_id::text = $1;
    `;
    const currentBalanceRes = await client.query(currentBalanceQuery, [targetUserId]);
    const saldoPrevio = parseFloat(currentBalanceRes.rows[0]?.saldo_actual || '0.00');
    const valorMonto = parseFloat(monto);
    const nuevoSaldo = saldoPrevio + valorMonto;

    const insertQuery = `
      INSERT INTO transacciones_ledger (
        usuario_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
      ) VALUES ($1, 'liquidacion', $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [
      targetUserId,
      valorMonto,
      nuevoSaldo,
      `Liquidación de caja física - Comprobante: ${comprobante || 'S/N'}`,
      { comprobante, notas, liquidadoPor: 'admin-backoffice' },
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Liquidación de caja asentada exitosamente en el ledger',
      data: result.rows[0],
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    if (client) client.release();
  }
});

// 5. Listar estado de flota y saldos de repartidores (Torre de Control Backoffice)
ledgerRouter.get('/repartidores-flota', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        u.id, u.nombre, u.email, u.telefono, u.estado_activo,
        ST_Y(u.ubicacion) as lat,
        ST_X(u.ubicacion) as lon,
        COALESCE(SUM(t.monto), 0.00) as saldo_ledger
      FROM usuarios u
      LEFT JOIN transacciones_ledger t ON t.usuario_id = u.id
      WHERE u.rol = 'repartidor'
      GROUP BY u.id, u.nombre, u.email, u.telefono, u.estado_activo, u.ubicacion
      ORDER BY u.nombre ASC;
    `;
    const result = await pgPool.query(query);

    const repartidores = result.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      activo: row.estado_activo,
      ubicacion: {
        lat: row.lat ? parseFloat(row.lat) : -1.7925,
        lon: row.lon ? parseFloat(row.lon) : -79.6790,
      },
      saldoLedger: parseFloat(row.saldo_ledger),
      deudaEfectivo: Math.max(0, -parseFloat(row.saldo_ledger)),
    }));

    res.json({
      success: true,
      total: repartidores.length,
      data: repartidores,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

