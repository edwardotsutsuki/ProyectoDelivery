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

