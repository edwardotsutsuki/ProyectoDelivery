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
    query += ' ORDER BY fecha_creacion DESC';

    const result = await pgPool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Crear nuevo usuario desde el Backoffice Admin
userRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, rol = 'cliente', telefono = '+593900000000', estado_activo = true } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, email y password son obligatorios.',
      });
    }

    const validRoles = ['cliente', 'repartidor', 'comercio', 'admin'];
    if (!validRoles.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: `Rol no válido. Permitidos: ${validRoles.join(', ')}`,
      });
    }

    // Verificar si ya existe el correo
    const existing = await pgPool.query('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado.',
      });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);

    const insertQuery = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, estado_activo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, email, telefono, rol, estado_activo, fecha_creacion;
    `;

    const result = await pgPool.query(insertQuery, [
      nombre,
      email.toLowerCase().trim(),
      passwordHash,
      rol,
      telefono,
      Boolean(estado_activo),
    ]);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Editar datos de usuario
userRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, rol, password, estado_activo } = req.body;

    let passwordHash = null;
    if (password && password.trim().length > 0) {
      const bcrypt = await import('bcryptjs');
      passwordHash = await bcrypt.default.hash(password.trim(), 10);
    }

    const updateQuery = `
      UPDATE usuarios
      SET
        nombre = COALESCE($1, nombre),
        email = COALESCE($2, email),
        telefono = COALESCE($3, telefono),
        rol = COALESCE($4, rol),
        password_hash = COALESCE($5, password_hash),
        estado_activo = COALESCE($6, estado_activo),
        fecha_actualizacion = NOW()
      WHERE id::text = $7
      RETURNING id, nombre, email, telefono, rol, estado_activo, fecha_creacion, fecha_actualizacion;
    `;

    const result = await pgPool.query(updateQuery, [
      nombre || null,
      email ? email.toLowerCase().trim() : null,
      telefono || null,
      rol || null,
      passwordHash,
      estado_activo !== undefined ? Boolean(estado_activo) : null,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Activar o suspender usuario
userRouter.patch('/:id/estado', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado_activo } = req.body;

    if (estado_activo === undefined) {
      return res.status(400).json({ success: false, message: 'Debe especificar estado_activo (booleano)' });
    }

    const query = `
      UPDATE usuarios
      SET estado_activo = $1, fecha_actualizacion = NOW()
      WHERE id::text = $2
      RETURNING id, nombre, email, rol, estado_activo;
    `;

    const result = await pgPool.query(query, [Boolean(estado_activo), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      message: `Usuario ${Boolean(estado_activo) ? 'activado' : 'suspendido'} exitosamente`,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Helper para resolver id de usuario
function resolveUserId(id: string): string {
  if (id === 'usr-cliente-01' || id === 'cliente-01') {
    return '44444444-4444-4444-4444-444444444444';
  }
  return id;
}

// 4. Listar direcciones guardadas del usuario
userRouter.get('/:id/direcciones', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetUserId = resolveUserId(id);

    const query = `
      SELECT id, usuario_id, alias, direccion, canton, referencia, lat, lon, es_principal, fecha_creacion
      FROM direcciones_usuario
      WHERE usuario_id::text = $1
      ORDER BY es_principal DESC, fecha_creacion DESC;
    `;
    const result = await pgPool.query(query, [targetUserId]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Registrar nueva dirección guardada
userRouter.post('/:id/direcciones', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetUserId = resolveUserId(id);
    const {
      alias = 'Casa',
      direccion,
      canton = 'Baba',
      referencia = '',
      lat = -1.7917,
      lon = -79.6783,
      es_principal = false,
    } = req.body;

    if (!direccion) {
      return res.status(400).json({ success: false, message: 'La dirección es obligatoria' });
    }

    // Si es principal, desmarcar las anteriores
    if (es_principal) {
      await pgPool.query('UPDATE direcciones_usuario SET es_principal = false WHERE usuario_id::text = $1', [targetUserId]);
    }

    const insertQuery = `
      INSERT INTO direcciones_usuario (
        usuario_id, alias, direccion, canton, referencia, lat, lon, es_principal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const result = await pgPool.query(insertQuery, [
      targetUserId,
      alias,
      direccion,
      canton,
      referencia,
      lat,
      lon,
      Boolean(es_principal),
    ]);

    res.status(201).json({
      success: true,
      message: 'Dirección guardada exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 6. Eliminar dirección guardada
userRouter.delete('/:id/direcciones/:dirId', async (req: Request, res: Response) => {
  try {
    const { id, dirId } = req.params;
    const targetUserId = resolveUserId(id);

    const result = await pgPool.query(
      'DELETE FROM direcciones_usuario WHERE id::text = $1 AND usuario_id::text = $2 RETURNING id',
      [dirId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dirección no encontrada' });
    }

    res.json({ success: true, message: 'Dirección eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 7. Establecer dirección como principal
userRouter.patch('/:id/direcciones/:dirId/principal', async (req: Request, res: Response) => {
  try {
    const { id, dirId } = req.params;
    const targetUserId = resolveUserId(id);

    await pgPool.query('UPDATE direcciones_usuario SET es_principal = false WHERE usuario_id::text = $1', [targetUserId]);
    const result = await pgPool.query(
      'UPDATE direcciones_usuario SET es_principal = true, fecha_actualizacion = NOW() WHERE id::text = $1 AND usuario_id::text = $2 RETURNING *',
      [dirId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dirección no encontrada' });
    }

    res.json({ success: true, message: 'Dirección marcada como principal', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 8. Recarga directa de saldo en Billetera Virtual (Ledger)
userRouter.post('/:id/recargar-billetera', async (req: Request, res: Response) => {
  let client;
  try {
    const { id } = req.params;
    const targetUserId = resolveUserId(id);
    const { monto, metodo = 'transferencia', referencia = '' } = req.body;

    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) {
      return res.status(400).json({ success: false, message: 'Monto de recarga inválido (debe ser mayor a 0)' });
    }

    client = await pgPool.connect();
    await client.query('BEGIN');

    // Consultar saldo actual
    const balanceRes = await client.query(
      'SELECT COALESCE(SUM(monto), 0.00) as saldo FROM transacciones_ledger WHERE usuario_id::text = $1',
      [targetUserId]
    );
    const saldoActual = parseFloat(balanceRes.rows[0]?.saldo || '0.00');
    const nuevoSaldo = saldoActual + montoNum;

    const insertLedger = `
      INSERT INTO transacciones_ledger (
        usuario_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
      ) VALUES ($1, 'recarga', $2, $3, $4, $5)
      RETURNING *;
    `;

    const desc = `Recarga Virtual (${metodo.toUpperCase()}) - Billetera Baba Delivery`;
    const metadata = { canal: metodo, referencia, fecha: new Date().toISOString() };

    const ledgerRes = await client.query(insertLedger, [
      targetUserId,
      montoNum,
      nuevoSaldo,
      desc,
      JSON.stringify(metadata),
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Recarga de $${montoNum.toFixed(2)} aplicada exitosamente. Nuevo saldo: $${nuevoSaldo.toFixed(2)}`,
      data: {
        transaccion: ledgerRes.rows[0],
        saldoAnterior: saldoActual,
        nuevoSaldo: nuevoSaldo,
      },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    if (client) client.release();
  }
});


