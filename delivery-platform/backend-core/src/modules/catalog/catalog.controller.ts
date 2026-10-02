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
      productos = mockBabaProducts;
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
