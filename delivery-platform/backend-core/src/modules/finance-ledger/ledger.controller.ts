import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';

export const ledgerRouter = Router();

// Consultar saldo actual y extracto de movimientos
ledgerRouter.get('/billetera/:usuarioId', async (req: Request, res: Response) => {
  try {
    const { usuarioId } = req.params;

    const balanceQuery = `
      SELECT COALESCE(SUM(monto), 0.00) as saldo_total
      FROM transacciones_ledger
      WHERE usuario_id = $1;
    `;
    const balanceResult = await pgPool.query(balanceQuery, [usuarioId]);
    const saldoTotal = parseFloat(balanceResult.rows[0].saldo_total);

    const historyQuery = `
      SELECT id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata, fecha_creacion
      FROM transacciones_ledger
      WHERE usuario_id = $1
      ORDER BY fecha_creacion DESC
      LIMIT 50;
    `;
    const historyResult = await pgPool.query(historyQuery, [usuarioId]);

    res.json({
      success: true,
      data: {
        usuarioId,
        saldoActual: saldoTotal,
        movimientos: historyResult.rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Asentar movimiento inmutable
ledgerRouter.post('/movimiento', async (req: Request, res: Response) => {
  const client = await pgPool.connect();
  try {
    const { usuarioId, pedidoId, tipoMovimiento, monto, descripcion, metadata = {} } = req.body;

    await client.query('BEGIN');

    const currentBalanceQuery = `
      SELECT COALESCE(SUM(monto), 0.00) as saldo_actual
      FROM transacciones_ledger
      WHERE usuario_id = $1
      FOR UPDATE;
    `;
    const currentBalanceRes = await client.query(currentBalanceQuery, [usuarioId]);
    const saldoPrevio = parseFloat(currentBalanceRes.rows[0]?.saldo_actual || '0.00');
    const nuevoSaldo = saldoPrevio + parseFloat(monto);

    const insertQuery = `
      INSERT INTO transacciones_ledger (
        usuario_id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [
      usuarioId,
      pedidoId || null,
      tipoMovimiento,
      monto,
      nuevoSaldo,
      descripcion,
      metadata,
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Transacción asentada en el ledger contable',
      data: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    client.release();
  }
});

// Resumen financiero global
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
