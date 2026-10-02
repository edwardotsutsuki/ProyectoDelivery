import { Router, Request, Response } from 'express';
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

// 1. Listar comercios abiertos con cálculo de distancia espacial PostGIS
catalogRouter.get('/comercios', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const ciudad = (req.query.ciudad as string || '').toLowerCase();

    const query = `
      SELECT 
        c.id, c.nombre_comercial, c.descripcion, c.direccion,
        ST_X(c.ubicacion) as lon, ST_Y(c.ubicacion) as lat,
        c.is_abierto, c.telefono, c.categoria, c.tiempo_entrega_promedio,
        c.calificacion, c.costo_base_envio,
        CASE 
          WHEN $1::numeric IS NOT NULL AND $2::numeric IS NOT NULL THEN
            ROUND((ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint($2, $1), 4326)) / 1000.0)::numeric, 2)
          ELSE NULL
        END as distancia_km
      FROM comercios c
      WHERE c.is_abierto = true
      ORDER BY distancia_km ASC NULLS LAST, c.calificacion DESC;
    `;

    const result = await pgPool.query(query, [lat, lng]);
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
        c.calificacion, c.costo_base_envio
      FROM comercios c
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

// 3. Catálogo de productos con disponibilidad en tiempo real (Redis + Postgres)
catalogRouter.get('/comercio/:comercioId/productos', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);

    const query = `
      SELECT id, comercio_id, nombre, descripcion, precio, imagen_url, is_disponible, categoria
      FROM productos
      WHERE comercio_id::text = $1 OR comercio_id::text = $2
      ORDER BY categoria, nombre;
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
        productos = mockBabaProducts;
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

// 5. Crear nuevo local comercial en PostgreSQL + PostGIS (Baba o Babahoyo)
catalogRouter.post('/comercios', async (req: Request, res: Response) => {
  try {
    const {
      usuarioId = '22222222-2222-2222-2222-222222222222',
      nombreComercial,
      descripcion = '',
      direccion,
      lat = -1.7917, // Baba Centro por defecto
      lon = -79.6783,
      categoria = 'Restaurante',
      telefono = '+593900000000',
      tiempoEntregaPromedio = 30,
      costoBaseEnvio = 1.50,
      isAbierto = true,
    } = req.body;

    if (!nombreComercial || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'nombreComercial y direccion son campos obligatorios.',
      });
    }

    const insertQuery = `
      INSERT INTO comercios (
        usuario_id, nombre_comercial, descripcion, direccion,
        ubicacion, is_abierto, telefono, categoria,
        tiempo_entrega_promedio, costo_base_envio
      ) VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11
      )
      RETURNING id, nombre_comercial, descripcion, direccion, is_abierto, categoria, telefono,
                costo_base_envio, tiempo_entrega_promedio, ST_X(ubicacion) as lon, ST_Y(ubicacion) as lat;
    `;

    const result = await pgPool.query(insertQuery, [
      usuarioId,
      nombreComercial,
      descripcion,
      direccion,
      Number(lon),
      Number(lat),
      Boolean(isAbierto),
      telefono,
      categoria,
      Number(tiempoEntregaPromedio),
      Number(costoBaseEnvio),
    ]);

    res.status(201).json({
      success: true,
      message: 'Comercio registrado exitosamente con punto espacial PostGIS',
      data: result.rows[0],
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
      telefono,
      tiempoEntregaPromedio,
      costoBaseEnvio,
      isAbierto,
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
        telefono = COALESCE($7, telefono),
        tiempo_entrega_promedio = COALESCE($8, tiempo_entrega_promedio),
        costo_base_envio = COALESCE($9, costo_base_envio),
        is_abierto = COALESCE($10, is_abierto),
        fecha_actualizacion = NOW()
      WHERE id::text = $11 OR id::text = $12
      RETURNING id, nombre_comercial, descripcion, direccion, is_abierto, categoria, telefono,
                costo_base_envio, tiempo_entrega_promedio, ST_X(ubicacion) as lon, ST_Y(ubicacion) as lat;
    `;

    const result = await pgPool.query(query, [
      nombreComercial,
      descripcion,
      direccion,
      lat !== undefined ? Number(lat) : null,
      lon !== undefined ? Number(lon) : null,
      categoria,
      telefono,
      tiempoEntregaPromedio !== undefined ? Number(tiempoEntregaPromedio) : null,
      costoBaseEnvio !== undefined ? Number(costoBaseEnvio) : null,
      isAbierto !== undefined ? Boolean(isAbierto) : null,
      rawId,
      targetId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
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

// 8. Crear un nuevo plato/producto para un comercio
catalogRouter.post('/comercio/:comercioId/productos', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.comercioId;
    const targetId = resolveMerchantId(rawId);
    const {
      nombre,
      descripcion = '',
      precio,
      categoria = 'Platos Fuertes',
      imagenUrl = null,
      isDisponible = true,
    } = req.body;

    if (!nombre || precio === undefined) {
      return res.status(400).json({ success: false, message: 'nombre y precio son campos requeridos.' });
    }

    const query = `
      INSERT INTO productos (
        comercio_id, nombre, descripcion, precio, categoria, imagen_url, is_disponible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, comercio_id, nombre, descripcion, precio, categoria, imagen_url, is_disponible;
    `;

    const result = await pgPool.query(query, [
      targetId,
      nombre,
      descripcion,
      Number(precio),
      categoria,
      imagenUrl,
      Boolean(isDisponible),
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
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      imagenUrl,
      isDisponible,
    } = req.body;

    const query = `
      UPDATE productos
      SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        precio = COALESCE($3, precio),
        categoria = COALESCE($4, categoria),
        imagen_url = COALESCE($5, imagen_url),
        is_disponible = COALESCE($6, is_disponible),
        fecha_actualizacion = NOW()
      WHERE id::text = $7
      RETURNING id, comercio_id, nombre, descripcion, precio, categoria, imagen_url, is_disponible;
    `;

    const result = await pgPool.query(query, [
      nombre,
      descripcion,
      precio !== undefined ? Number(precio) : null,
      categoria,
      imagenUrl,
      isDisponible !== undefined ? Boolean(isDisponible) : null,
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

