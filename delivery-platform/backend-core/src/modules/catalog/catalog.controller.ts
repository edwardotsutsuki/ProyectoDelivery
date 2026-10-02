import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pgPool } from '../../config/database';
import { redisClient } from '../../config/redis';

export const catalogRouter = Router();

// Fallback de productos típicos de Baba para pruebas de desarrollo
const mockBabaProducts = [
  {
    id: '66666666-6666-6666-6666-666666666601',
    comercio_id: '55555555-5555-5555-5555-555555555555',
    nombre: 'Seco de gallina criolla Baba',
    descripcion: 'Preparado con chicha tradicional y hierbitas frescas, acompañado de arroz y maduro',
    precio: 4.50,
    imagen_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
    is_disponible: true,
    categoria: 'Platos Fuertes',
  },
  {
    id: '66666666-6666-6666-6666-666666666602',
    comercio_id: '55555555-5555-5555-5555-555555555555',
    nombre: 'Bolón mixto con queso y chicharrón',
    descripcion: 'Plátano verde majado con queso manaba y chicharrón crocante',
    precio: 3.75,
    imagen_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
    is_disponible: true,
    categoria: 'Desayunos y Tradicional',
  },
  {
    id: '66666666-6666-6666-6666-666666666603',
    comercio_id: '55555555-5555-5555-5555-555555555555',
    nombre: 'Seco de pollo de campo',
    descripcion: 'Guiso tierno con arroz amarillo, ensalada criolla y plátano maduro',
    precio: 5.25,
    imagen_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500',
    is_disponible: true,
    categoria: 'Platos Fuertes',
  },
  {
    id: '66666666-6666-6666-6666-666666666604',
    comercio_id: '55555555-5555-5555-5555-555555555555',
    nombre: 'Arroz con menestra y carne asada',
    descripcion: 'Carne de res asada al carbón con menestra de lenteja casera',
    precio: 6.50,
    imagen_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
    is_disponible: true,
    categoria: 'Platos Fuertes',
  },
  {
    id: '66666666-6666-6666-6666-666666666605',
    comercio_id: '55555555-5555-5555-5555-555555555555',
    nombre: 'Jugo natural de maracuyá',
    descripcion: 'Jugo natural refrescante de fruta fresca de Los Ríos',
    precio: 1.50,
    imagen_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500',
    is_disponible: true,
    categoria: 'Bebidas',
  },
  {
    id: '66666666-6666-6666-6666-666666666606',
    comercio_id: '55555555-5555-5555-5555-555555555555',
    nombre: 'Patacones con queso criollo',
    descripcion: 'Porción de patacones crocantes con queso fresco de la zona',
    precio: 2.00,
    imagen_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500',
    is_disponible: true,
    categoria: 'Acompañamientos',
  },
];

// Helper para resolver aliases de comercios
function resolveMerchantId(id: string): string {
  if (id === 'merch-baba-01' || id === 'usr-comercio-01') {
    return '55555555-5555-5555-5555-555555555555';
  }
  return id;
}

// ============================================================================
// 0. VERTICALES DE NEGOCIO (Tipos de Comercio: Restaurantes, Super, Farmacia, etc.)
// ============================================================================
catalogRouter.get('/tipos-comercio', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, nombre, descripcion, icono, tipo_layout, requiere_cocina, permite_recetas, control_edad_18, orden, is_activo
      FROM tipos_comercio
      WHERE is_activo = true
      ORDER BY orden ASC;
    `;
    const result = await pgPool.query(query);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

catalogRouter.post('/tipos-comercio', async (req: Request, res: Response) => {
  try {
    const { id, nombre, descripcion, icono, tipoLayout = 'restaurante', requiereCocina = true, permiteRecetas = false, controlEdad18 = false, orden = 0 } = req.body;
    if (!id || !nombre || !icono) {
      return res.status(400).json({ success: false, message: 'id, nombre e icono son requeridos' });
    }
    const query = `
      INSERT INTO tipos_comercio (id, nombre, descripcion, icono, tipo_layout, requiere_cocina, permite_recetas, control_edad_18, orden)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        icono = EXCLUDED.icono,
        tipo_layout = EXCLUDED.tipo_layout,
        requiere_cocina = EXCLUDED.requiere_cocina,
        permite_recetas = EXCLUDED.permite_recetas,
        control_edad_18 = EXCLUDED.control_edad_18,
        orden = EXCLUDED.orden
      RETURNING *;
    `;
    const result = await pgPool.query(query, [id.toLowerCase().trim(), nombre, descripcion, icono, tipoLayout, requiereCocina, permiteRecetas, controlEdad18, orden]);
    res.status(201).json({ success: true, message: 'Tipo de comercio guardado exitosamente', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 1. LISTAR COMERCIOS (Storefront público con filtro de vertical y PostGIS)
// ============================================================================
catalogRouter.get('/comercios', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const ciudad = (req.query.ciudad as string || '').toLowerCase();
    const tipo = (req.query.tipo as string || req.query.vertical as string || '').toLowerCase();

    let query = `
      SELECT 
        c.id, c.nombre_comercial, c.descripcion, c.direccion,
        ST_X(c.ubicacion) as lon, ST_Y(c.ubicacion) as lat,
        c.is_abierto, c.telefono, c.categoria, c.tiempo_entrega_promedio,
        c.calificacion, c.costo_base_envio, c.estado_aprobacion,
        c.tipo_comercio_id,
        COALESCE(tc.nombre, 'Restaurantes') as tipo_comercio_nombre,
        COALESCE(tc.icono, '🍔') as tipo_comercio_icono,
        COALESCE(tc.tipo_layout, 'restaurante') as tipo_layout,
        COALESCE(tc.requiere_cocina, true) as requiere_cocina,
        COALESCE(c.maneja_inventario_general, false) as maneja_inventario_general,
        CASE 
          WHEN $1::numeric IS NOT NULL AND $2::numeric IS NOT NULL THEN
            ROUND((ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint($2, $1), 4326)) / 1000.0)::numeric, 2)
          ELSE NULL
        END as distancia_km
      FROM comercios c
      LEFT JOIN tipos_comercio tc ON c.tipo_comercio_id = tc.id
      WHERE c.is_abierto = true AND (c.estado_aprobacion IS NULL OR c.estado_aprobacion = 'aprobado')
    `;

    const params: any[] = [lat, lng];

    if (tipo && tipo !== 'todos') {
      params.push(tipo);
      query += ` AND (c.tipo_comercio_id = $${params.length} OR LOWER(c.categoria) = $${params.length})`;
    }

    query += ` ORDER BY distancia_km ASC NULLS LAST, c.calificacion DESC;`;

    const result = await pgPool.query(query, params);
    let comercios = result.rows;

    if (ciudad) {
      comercios = comercios.filter((c) =>
        c.direccion.toLowerCase().includes(ciudad) ||
        c.nombre_comercial.toLowerCase().includes(ciudad)
      );
    }

    res.json({
      success: true,
      count: comercios.length,
      data: comercios,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 1.b Listar todos los comercios para Backoffice (incluyendo cerrados y pendientes)
catalogRouter.get('/comercios/admin', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        c.id, c.nombre_comercial, c.descripcion, c.direccion,
        ST_X(c.ubicacion) as lon, ST_Y(c.ubicacion) as lat,
        c.is_abierto, c.telefono, c.categoria, c.tiempo_entrega_promedio,
        c.calificacion, c.costo_base_envio,
        c.tipo_comercio_id,
        COALESCE(tc.nombre, 'Restaurantes') as tipo_comercio_nombre,
        COALESCE(tc.icono, '🍔') as tipo_comercio_icono,
        COALESCE(tc.tipo_layout, 'restaurante') as tipo_layout,
        COALESCE(c.maneja_inventario_general, false) as maneja_inventario_general,
        c.ruc, c.razon_social, c.banco, c.tipo_cuenta, c.numero_cuenta, c.titular_cuenta,
        c.estado_aprobacion, c.motivo_rechazo, c.fecha_solicitud, c.fecha_aprobacion,
        u.id as usuario_id, u.email as usuario_email, u.nombre as usuario_nombre, u.telefono as usuario_telefono
      FROM comercios c
      LEFT JOIN tipos_comercio tc ON c.tipo_comercio_id = tc.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.fecha_creacion DESC;
    `;
    const result = await pgPool.query(query);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 1.c Listar comercios pendientes de aprobación (Bandeja de Afiliaciones)
catalogRouter.get('/comercios/solicitudes', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        c.id, c.nombre_comercial, c.descripcion, c.direccion,
        ST_X(c.ubicacion) as lon, ST_Y(c.ubicacion) as lat,
        c.is_abierto, c.telefono, c.categoria, c.tiempo_entrega_promedio,
        c.tipo_comercio_id,
        COALESCE(tc.nombre, 'Restaurantes') as tipo_comercio_nombre,
        COALESCE(tc.icono, '🍔') as tipo_comercio_icono,
        c.costo_base_envio, c.ruc, c.razon_social, c.banco, c.tipo_cuenta, c.numero_cuenta, c.titular_cuenta,
        c.estado_aprobacion, c.motivo_rechazo, c.fecha_solicitud,
        u.id as usuario_id, u.email as usuario_email, u.nombre as usuario_nombre, u.telefono as usuario_telefono
      FROM comercios c
      LEFT JOIN tipos_comercio tc ON c.tipo_comercio_id = tc.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.estado_aprobacion = 'pendiente'
      ORDER BY c.fecha_solicitud ASC;
    `;
    const result = await pgPool.query(query);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 1.d Aprobar solicitud de comercio
catalogRouter.patch('/comercio/:comercioId/aprobar', async (req: Request, res: Response) => {
  try {
    const { comercioId } = req.params;
    const query = `
      UPDATE comercios
      SET estado_aprobacion = 'aprobado', fecha_aprobacion = NOW(), is_abierto = true, fecha_actualizacion = NOW()
      WHERE id::text = $1
      RETURNING id, nombre_comercial, estado_aprobacion, usuario_id;
    `;
    const result = await pgPool.query(query, [comercioId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
    }

    const comercio = result.rows[0];
    if (comercio.usuario_id) {
      await pgPool.query(
        'UPDATE usuarios SET estado_activo = true, fecha_actualizacion = NOW() WHERE id = $1',
        [comercio.usuario_id]
      );
    }

    res.json({
      success: true,
      message: `Comercio "${comercio.nombre_comercial}" aprobado exitosamente`,
      data: comercio,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 1.e Rechazar solicitud de comercio
catalogRouter.patch('/comercio/:comercioId/rechazar', async (req: Request, res: Response) => {
  try {
    const { comercioId } = req.params;
    const { motivoRechazo } = req.body;
    const query = `
      UPDATE comercios
      SET estado_aprobacion = 'rechazado', motivo_rechazo = $2, is_abierto = false, fecha_actualizacion = NOW()
      WHERE id::text = $1
      RETURNING id, nombre_comercial, estado_aprobacion, motivo_rechazo;
    `;
    const result = await pgPool.query(query, [comercioId, motivoRechazo || 'No cumple con los requisitos mínimos de operación']);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
    }

    res.json({
      success: true,
      message: `Solicitud del comercio rechazada`,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Obtener detalle de un comercio específico
catalogRouter.get('/comercio/:comercioId', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);

    const query = `
      SELECT 
        c.id, c.nombre_comercial, c.descripcion, c.direccion,
        ST_X(c.ubicacion) as lon, ST_Y(c.ubicacion) as lat,
        c.is_abierto, c.telefono, c.categoria, c.tiempo_entrega_promedio,
        c.calificacion, c.costo_base_envio,
        c.tipo_comercio_id,
        COALESCE(tc.nombre, 'Restaurantes') as tipo_comercio_nombre,
        COALESCE(tc.icono, '🍔') as tipo_comercio_icono,
        COALESCE(tc.tipo_layout, 'restaurante') as tipo_layout,
        COALESCE(tc.requiere_cocina, true) as requiere_cocina,
        COALESCE(tc.permite_recetas, false) as permite_recetas,
        COALESCE(tc.control_edad_18, false) as control_edad_18,
        COALESCE(c.maneja_inventario_general, false) as maneja_inventario_general
      FROM comercios c
      LEFT JOIN tipos_comercio tc ON c.tipo_comercio_id = tc.id
      WHERE c.id::text = $1 OR c.id::text = $2
      LIMIT 1;
    `;
    const result = await pgPool.query(query, [rawId, targetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// 2.b CRUD DE CATEGORÍAS DE PRODUCTOS POR COMERCIO (categorias_productos)
// ============================================================================
catalogRouter.get('/comercio/:comercioId/categorias', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);

    const query = `
      SELECT id, comercio_id, nombre, descripcion, icono, orden, is_activo,
             (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = cp.id) as total_productos
      FROM categorias_productos cp
      WHERE cp.comercio_id::text = $1 OR cp.comercio_id::text = $2
      ORDER BY cp.orden ASC, cp.nombre ASC;
    `;
    const result = await pgPool.query(query, [rawId, targetId]);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

catalogRouter.post('/comercio/:comercioId/categorias', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);
    const { nombre, descripcion = '', icono = '🏷️', orden = 0 } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la categoría es requerido' });
    }

    const query = `
      INSERT INTO categorias_productos (comercio_id, nombre, descripcion, icono, orden)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await pgPool.query(query, [targetId, nombre.trim(), descripcion, icono, Number(orden)]);

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

catalogRouter.put('/categoria/:categoriaId', async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;
    const { nombre, descripcion, icono, orden, is_activo } = req.body;

    const query = `
      UPDATE categorias_productos
      SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        icono = COALESCE($3, icono),
        orden = COALESCE($4, orden),
        is_activo = COALESCE($5, is_activo),
        fecha_actualizacion = NOW()
      WHERE id::text = $6
      RETURNING *;
    `;
    const result = await pgPool.query(query, [
      nombre !== undefined ? nombre.trim() : null,
      descripcion !== undefined ? descripcion : null,
      icono !== undefined ? icono : null,
      orden !== undefined ? Number(orden) : null,
      is_activo !== undefined ? Boolean(is_activo) : null,
      categoriaId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    res.json({
      success: true,
      message: 'Categoría actualizada correctamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

catalogRouter.delete('/categoria/:categoriaId', async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;

    // Desvincular productos antes de borrar categoría
    await pgPool.query('UPDATE productos SET categoria_id = NULL WHERE categoria_id::text = $1', [categoriaId]);

    const query = 'DELETE FROM categorias_productos WHERE id::text = $1 RETURNING id, nombre';
    const result = await pgPool.query(query, [categoriaId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    res.json({
      success: true,
      message: `Categoría "${result.rows[0].nombre}" eliminada exitosamente`,
      id: categoriaId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Catálogo de productos con disponibilidad en tiempo real y soporte de inventario
catalogRouter.get('/comercio/:comercioId/productos', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);

    const query = `
      SELECT 
        p.id, p.comercio_id, p.nombre, p.descripcion, p.precio, p.imagen_url, p.is_disponible,
        p.categoria, p.categoria_id,
        COALESCE(cp.nombre, p.categoria, 'General') as categoria_nombre,
        COALESCE(cp.icono, '🏷️') as categoria_icono,
        COALESCE(p.unidad_medida, 'unidad') as unidad_medida,
        COALESCE(p.maneja_stock, false) as maneja_stock,
        p.stock_disponible,
        COALESCE(p.requiere_receta, false) as requiere_receta
      FROM productos p
      LEFT JOIN categorias_productos cp ON p.categoria_id = cp.id
      WHERE p.comercio_id::text = $1 OR p.comercio_id::text = $2
      ORDER BY COALESCE(cp.orden, 999) ASC, COALESCE(cp.nombre, p.categoria) ASC, p.nombre ASC;
    `;

    let productos: any[] = [];
    try {
      const result = await pgPool.query(query, [rawId, targetId]);
      productos = result.rows;
    } catch (dbErr) {
      console.warn('⚠️ Consulta a BD falló, usando catálogo mock');
    }

    if (!productos || productos.length === 0) {
      if (targetId === '55555555-5555-5555-5555-555555555555') {
        productos = mockBabaProducts.map((p) => ({
          ...p,
          categoria_nombre: p.categoria,
          unidad_medida: 'unidad',
          maneja_stock: false,
          stock_disponible: null,
          requiere_receta: false,
        }));
      }
    }

    // Verificar interruptores rápidos de disponibilidad en Redis
    try {
      const pipeline = redisClient.pipeline();
      productos.forEach((p) => {
        pipeline.get(`catalog:disponibilidad:${p.id}`);
      });
      const redisResults = await pipeline.exec();

      productos = productos.map((p, index) => {
        const redisVal = redisResults?.[index]?.[1];
        if (redisVal !== null && redisVal !== undefined) {
          return { ...p, is_disponible: redisVal === '1' };
        }
        return p;
      });
    } catch (redisErr) {
      // Ignorar si Redis no responde para el interruptor
    }

    // Normalizar precio numérico para evitar errores en frontend
    productos = productos.map((p) => ({
      ...p,
      precio: parseFloat(p.precio) || 0,
    }));

    res.json({ success: true, count: productos.length, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. Interruptor rápido On/Off de disponibilidad (Redis + PostgreSQL)
catalogRouter.patch('/producto/:productoId/toggle-disponibilidad', async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    const { is_disponible } = req.body;

    if (is_disponible === undefined) {
      return res.status(400).json({ success: false, message: 'Debe especificar is_disponible (booleano)' });
    }

    // Actualizar Redis para interruptor ultra-rápido
    await redisClient.set(`catalog:disponibilidad:${productoId}`, is_disponible ? '1' : '0');

    // Persistir en PostgreSQL
    try {
      await pgPool.query('UPDATE productos SET is_disponible = $1, fecha_actualizacion = NOW() WHERE id::text = $2', [
        Boolean(is_disponible),
        productoId,
      ]);
    } catch (dbErr) {
      console.warn(`⚠️ No se pudo persistir en DB para producto ${productoId}, guardado en Redis`);
    }

    res.json({
      success: true,
      message: `Producto ${productoId} ahora está ${is_disponible ? 'DISPONIBLE' : 'AGOTADO'}`,
      is_disponible: Boolean(is_disponible),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Crear nuevo local comercial en PostgreSQL + PostGIS (Baba o Babahoyo) con soporte de credenciales y vertical
catalogRouter.post('/comercios', async (req: Request, res: Response) => {
  try {
    const {
      usuarioId,
      crearUsuario = false,
      usuarioNombre,
      usuarioEmail,
      usuarioPassword,
      usuarioTelefono,
      nombreComercial,
      descripcion = '',
      direccion,
      lat = -1.7917, // Baba Centro por defecto
      lon = -79.6783,
      categoria = 'Restaurante',
      tipoComercioId = 'restaurante',
      manejaInventarioGeneral = false,
      telefono = '+593900000000',
      tiempoEntregaPromedio = 30,
      costoBaseEnvio = 1.50,
      isAbierto = true,
      ruc = null,
      razonSocial = null,
      banco = null,
      tipoCuenta = 'ahorros',
      numeroCuenta = null,
      titularCuenta = null,
      estadoAprobacion = 'aprobado',
    } = req.body;

    if (!nombreComercial || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'nombreComercial y direccion son campos obligatorios.',
      });
    }

    let finalUsuarioId = usuarioId;

    // Si se solicitó crear usuario y contraseña para este comercio
    if (crearUsuario && usuarioEmail && usuarioPassword) {
      const emailLower = usuarioEmail.toLowerCase().trim();
      const existingUser = await pgPool.query('SELECT id FROM usuarios WHERE LOWER(email) = $1', [emailLower]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `El correo "${emailLower}" ya está registrado para otro usuario.`,
        });
      }

      const passwordHash = await bcrypt.hash(usuarioPassword, 10);
      const userRes = await pgPool.query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, estado_activo)
        VALUES ($1, $2, $3, 'comercio', $4, true)
        RETURNING id, nombre, email;
      `, [
        usuarioNombre || nombreComercial,
        emailLower,
        passwordHash,
        usuarioTelefono || telefono,
      ]);
      finalUsuarioId = userRes.rows[0].id;
    }

    if (!finalUsuarioId) {
      finalUsuarioId = '22222222-2222-2222-2222-222222222222';
    }

    const insertQuery = `
      INSERT INTO comercios (
        usuario_id, nombre_comercial, descripcion, direccion,
        ubicacion, is_abierto, telefono, categoria, tipo_comercio_id, maneja_inventario_general,
        tiempo_entrega_promedio, costo_base_envio,
        ruc, razon_social, banco, tipo_cuenta, numero_cuenta, titular_cuenta,
        estado_aprobacion, fecha_aprobacion
      ) VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19,
        $20, ${estadoAprobacion === 'aprobado' ? 'NOW()' : 'NULL'}
      )
      RETURNING id, usuario_id, nombre_comercial, descripcion, direccion, is_abierto, categoria, tipo_comercio_id,
                maneja_inventario_general, telefono, costo_base_envio, tiempo_entrega_promedio, ruc, razon_social,
                banco, tipo_cuenta, numero_cuenta, titular_cuenta, estado_aprobacion, ST_X(ubicacion) as lon, ST_Y(ubicacion) as lat;
    `;

    const result = await pgPool.query(insertQuery, [
      finalUsuarioId,
      nombreComercial,
      descripcion,
      direccion,
      Number(lon),
      Number(lat),
      Boolean(isAbierto),
      telefono,
      categoria,
      tipoComercioId || 'restaurante',
      Boolean(manejaInventarioGeneral),
      Number(tiempoEntregaPromedio),
      Number(costoBaseEnvio),
      ruc || null,
      razonSocial || null,
      banco || null,
      tipoCuenta || 'ahorros',
      numeroCuenta || null,
      titularCuenta || usuarioNombre || nombreComercial,
      estadoAprobacion || 'aprobado',
    ]);

    const createdComercio = result.rows[0];

    // Enlazar comercio_id en el usuario
    if (finalUsuarioId) {
      await pgPool.query('UPDATE usuarios SET comercio_id = $1 WHERE id = $2', [createdComercio.id, finalUsuarioId]);
    }

    res.status(201).json({
      success: true,
      message: 'Comercio registrado exitosamente',
      data: createdComercio,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 6. Actualizar datos de un local comercial existente
catalogRouter.put('/comercio/:comercioId', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);
    const {
      nombreComercial,
      descripcion,
      direccion,
      lat,
      lon,
      categoria,
      tipoComercioId,
      manejaInventarioGeneral,
      telefono,
      tiempoEntregaPromedio,
      costoBaseEnvio,
      isAbierto,
      ruc,
      razonSocial,
      banco,
      tipoCuenta,
      numeroCuenta,
      titularCuenta,
      estadoAprobacion,
      usuarioId,
    } = req.body;

    const query = `
      UPDATE comercios
      SET
        nombre_comercial = COALESCE($1, nombre_comercial),
        descripcion = COALESCE($2, descripcion),
        direccion = COALESCE($3, direccion),
        ubicacion = CASE WHEN $4::numeric IS NOT NULL AND $5::numeric IS NOT NULL 
                         THEN ST_SetSRID(ST_MakePoint($5, $4), 4326) 
                         ELSE ubicacion END,
        categoria = COALESCE($6, categoria),
        tipo_comercio_id = COALESCE($7, tipo_comercio_id),
        maneja_inventario_general = COALESCE($8, maneja_inventario_general),
        telefono = COALESCE($9, telefono),
        tiempo_entrega_promedio = COALESCE($10, tiempo_entrega_promedio),
        costo_base_envio = COALESCE($11, costo_base_envio),
        is_abierto = COALESCE($12, is_abierto),
        ruc = COALESCE($13, ruc),
        razon_social = COALESCE($14, razon_social),
        banco = COALESCE($15, banco),
        tipo_cuenta = COALESCE($16, tipo_cuenta),
        numero_cuenta = COALESCE($17, numero_cuenta),
        titular_cuenta = COALESCE($18, titular_cuenta),
        estado_aprobacion = COALESCE($19, estado_aprobacion),
        usuario_id = COALESCE($20, usuario_id),
        fecha_actualizacion = NOW()
      WHERE id::text = $21 OR id::text = $22
      RETURNING id, usuario_id, nombre_comercial, descripcion, direccion, is_abierto, categoria, tipo_comercio_id,
                maneja_inventario_general, telefono, costo_base_envio, tiempo_entrega_promedio, ruc, razon_social,
                banco, tipo_cuenta, numero_cuenta, titular_cuenta, estado_aprobacion, ST_X(ubicacion) as lon, ST_Y(ubicacion) as lat;
    `;

    const result = await pgPool.query(query, [
      nombreComercial,
      descripcion,
      direccion,
      lat !== undefined ? Number(lat) : null,
      lon !== undefined ? Number(lon) : null,
      categoria,
      tipoComercioId,
      manejaInventarioGeneral !== undefined ? Boolean(manejaInventarioGeneral) : null,
      telefono,
      tiempoEntregaPromedio !== undefined ? Number(tiempoEntregaPromedio) : null,
      costoBaseEnvio !== undefined ? Number(costoBaseEnvio) : null,
      isAbierto !== undefined ? Boolean(isAbierto) : null,
      ruc !== undefined ? ruc : null,
      razonSocial !== undefined ? razonSocial : null,
      banco !== undefined ? banco : null,
      tipoCuenta !== undefined ? tipoCuenta : null,
      numeroCuenta !== undefined ? numeroCuenta : null,
      titularCuenta !== undefined ? titularCuenta : null,
      estadoAprobacion !== undefined ? estadoAprobacion : null,
      usuarioId !== undefined ? usuarioId : null,
      rawId,
      targetId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
    }

    if (usuarioId) {
      await pgPool.query('UPDATE usuarios SET comercio_id = $1 WHERE id = $2', [result.rows[0].id, usuarioId]);
    }

    res.json({
      success: true,
      message: 'Comercio actualizado exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 7. Interruptor rápido de apertura de local
catalogRouter.patch('/comercio/:comercioId/estado', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);
    const { isAbierto, is_abierto } = req.body;
    const finalState = isAbierto !== undefined ? isAbierto : is_abierto;

    if (finalState === undefined) {
      return res.status(400).json({ success: false, message: 'Debe especificar isAbierto (booleano)' });
    }

    const query = `
      UPDATE comercios
      SET is_abierto = $1, fecha_actualizacion = NOW()
      WHERE id::text = $2 OR id::text = $3
      RETURNING id, nombre_comercial, is_abierto;
    `;
    const result = await pgPool.query(query, [Boolean(finalState), rawId, targetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
    }

    res.json({
      success: true,
      message: `Comercio ahora está ${finalState ? 'ABIERTO' : 'CERRADO'}`,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 8. Crear un nuevo producto para un comercio con categoría y stock opcional
catalogRouter.post('/comercio/:comercioId/productos', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);
    let {
      nombre,
      descripcion = '',
      precio,
      categoriaId = null,
      nuevaCategoriaNombre = null,
      categoria = 'General',
      imagenUrl = null,
      isDisponible = true,
      unidadMedida = 'unidad',
      manejaStock = false,
      stockDisponible = null,
      requiereReceta = false,
    } = req.body;

    if (!nombre || precio === undefined) {
      return res.status(400).json({ success: false, message: 'nombre y precio son campos requeridos.' });
    }

    // Creación rápida de categoría si se proporcionó nuevaCategoriaNombre
    if (nuevaCategoriaNombre && nuevaCategoriaNombre.trim()) {
      const catTrim = nuevaCategoriaNombre.trim();
      const existingCat = await pgPool.query(
        'SELECT id FROM categorias_productos WHERE comercio_id = $1 AND LOWER(nombre) = LOWER($2)',
        [targetId, catTrim]
      );
      if (existingCat.rows.length > 0) {
        categoriaId = existingCat.rows[0].id;
        categoria = catTrim;
      } else {
        const catRes = await pgPool.query(
          'INSERT INTO categorias_productos (comercio_id, nombre, orden) VALUES ($1, $2, 1) RETURNING id, nombre',
          [targetId, catTrim]
        );
        categoriaId = catRes.rows[0].id;
        categoria = catTrim;
      }
    } else if (categoriaId) {
      const catCheck = await pgPool.query('SELECT nombre FROM categorias_productos WHERE id = $1', [categoriaId]);
      if (catCheck.rows.length > 0) {
        categoria = catCheck.rows[0].nombre;
      }
    }

    const query = `
      INSERT INTO productos (
        comercio_id, categoria_id, nombre, descripcion, precio, categoria,
        imagen_url, is_disponible, unidad_medida, maneja_stock, stock_disponible, requiere_receta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, comercio_id, categoria_id, nombre, descripcion, precio, categoria,
                imagen_url, is_disponible, unidad_medida, maneja_stock, stock_disponible, requiere_receta;
    `;

    const result = await pgPool.query(query, [
      targetId,
      categoriaId,
      nombre.trim(),
      descripcion,
      Number(precio),
      categoria,
      imagenUrl,
      Boolean(isDisponible),
      unidadMedida || 'unidad',
      Boolean(manejaStock),
      manejaStock && stockDisponible !== null && stockDisponible !== undefined ? Number(stockDisponible) : null,
      Boolean(requiereReceta),
    ]);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente en el catálogo',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 9. Editar un producto existente
catalogRouter.put('/producto/:productoId', async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    let {
      nombre,
      descripcion,
      precio,
      categoriaId,
      nuevaCategoriaNombre,
      categoria,
      imagenUrl,
      isDisponible,
      unidadMedida,
      manejaStock,
      stockDisponible,
      requiereReceta,
    } = req.body;

    // Si se pasa nuevaCategoriaNombre, crearla
    if (nuevaCategoriaNombre && nuevaCategoriaNombre.trim()) {
      const prodCheck = await pgPool.query('SELECT comercio_id FROM productos WHERE id::text = $1', [productoId]);
      if (prodCheck.rows.length > 0) {
        const comId = prodCheck.rows[0].comercio_id;
        const catTrim = nuevaCategoriaNombre.trim();
        const existingCat = await pgPool.query(
          'SELECT id FROM categorias_productos WHERE comercio_id = $1 AND LOWER(nombre) = LOWER($2)',
          [comId, catTrim]
        );
        if (existingCat.rows.length > 0) {
          categoriaId = existingCat.rows[0].id;
          categoria = catTrim;
        } else {
          const catRes = await pgPool.query(
            'INSERT INTO categorias_productos (comercio_id, nombre, orden) VALUES ($1, $2, 1) RETURNING id, nombre',
            [comId, catTrim]
          );
          categoriaId = catRes.rows[0].id;
          categoria = catTrim;
        }
      }
    } else if (categoriaId) {
      const catCheck = await pgPool.query('SELECT nombre FROM categorias_productos WHERE id = $1', [categoriaId]);
      if (catCheck.rows.length > 0) {
        categoria = catCheck.rows[0].nombre;
      }
    }

    const query = `
      UPDATE productos
      SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        precio = COALESCE($3, precio),
        categoria_id = COALESCE($4, categoria_id),
        categoria = COALESCE($5, categoria),
        imagen_url = COALESCE($6, imagen_url),
        is_disponible = COALESCE($7, is_disponible),
        unidad_medida = COALESCE($8, unidad_medida),
        maneja_stock = COALESCE($9, maneja_stock),
        stock_disponible = CASE 
          WHEN $9::boolean = false THEN NULL 
          WHEN $10::int IS NOT NULL THEN $10 
          ELSE stock_disponible END,
        requiere_receta = COALESCE($11, requiere_receta),
        fecha_actualizacion = NOW()
      WHERE id::text = $12
      RETURNING id, comercio_id, categoria_id, nombre, descripcion, precio, categoria,
                imagen_url, is_disponible, unidad_medida, maneja_stock, stock_disponible, requiere_receta;
    `;

    const result = await pgPool.query(query, [
      nombre !== undefined ? nombre.trim() : null,
      descripcion !== undefined ? descripcion : null,
      precio !== undefined ? Number(precio) : null,
      categoriaId !== undefined ? categoriaId : null,
      categoria !== undefined ? categoria : null,
      imagenUrl !== undefined ? imagenUrl : null,
      isDisponible !== undefined ? Boolean(isDisponible) : null,
      unidadMedida !== undefined ? unidadMedida : null,
      manejaStock !== undefined ? Boolean(manejaStock) : null,
      stockDisponible !== undefined ? (stockDisponible !== null ? Number(stockDisponible) : null) : null,
      requiereReceta !== undefined ? Boolean(requiereReceta) : null,
      productoId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 10. Eliminar un producto
catalogRouter.delete('/producto/:productoId', async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    const query = 'DELETE FROM productos WHERE id::text = $1 RETURNING id, nombre';
    const result = await pgPool.query(query, [productoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    await redisClient.del(`catalog:disponibilidad:${productoId}`);

    res.json({
      success: true,
      message: `Producto "${result.rows[0].nombre}" eliminado correctamente`,
      id: productoId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

