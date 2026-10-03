import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';
import { redisClient } from '../../config/redis';

export const orderRouter = Router();

// Cache en memoria para órdenes mock en caso de desarrollo / fallback
const mockBabaOrders = [
  {
    id: 'ORD-BABA-004',
    cliente_nombre: 'María Fernanda Vera',
    cliente_telefono: '+593987112233',
    direccion_entrega: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba',
    estado: 'creado',
    metodo_pago: 'efectivo',
    subtotal: 12.00,
    costo_envio: 1.50,
    total: 13.50,
    notas: 'La ensalada aparte, por favor.',
    fecha_creacion: new Date(Date.now() - 3 * 60000).toISOString(),
    comercio_id: '55555555-5555-5555-5555-555555555555',
    items: [
      { producto: 'Seco de gallina criolla Baba', cantidad: 2, precio_unitario: 4.50 },
      { producto: 'Jugo natural de maracuyá', cantidad: 2, precio_unitario: 1.50 },
    ],
  },
  {
    id: 'ORD-BABA-003',
    cliente_nombre: 'Andrés Zambrano',
    cliente_telefono: '+593987223344',
    direccion_entrega: 'Frente al Parque Central de Baba',
    estado: 'creado',
    metodo_pago: 'transferencia',
    subtotal: 9.00,
    costo_envio: 1.50,
    total: 10.50,
    notas: '',
    fecha_creacion: new Date(Date.now() - 7 * 60000).toISOString(),
    comercio_id: '55555555-5555-5555-5555-555555555555',
    items: [
      { producto: 'Bolón mixto con queso y chicharrón', cantidad: 2, precio_unitario: 3.75 },
      { producto: 'Café pasado tradicional', cantidad: 1, precio_unitario: 1.50 },
    ],
  },
  {
    id: 'ORD-BABA-002',
    cliente_nombre: 'Daniela Cedeño',
    cliente_telefono: '+593987334455',
    direccion_entrega: 'Calle Sucre y Rocafuerte, Baba',
    estado: 'en_preparacion',
    metodo_pago: 'efectivo',
    subtotal: 12.50,
    costo_envio: 1.50,
    total: 14.00,
    notas: 'Sin cubiertos desechables.',
    fecha_creacion: new Date(Date.now() - 14 * 60000).toISOString(),
    comercio_id: '55555555-5555-5555-5555-555555555555',
    items: [
      { producto: 'Seco de pollo de campo', cantidad: 2, precio_unitario: 5.25 },
      { producto: 'Agua mineral sin gas', cantidad: 2, precio_unitario: 1.00 },
    ],
  },
  {
    id: 'ORD-BABA-001',
    cliente_nombre: 'José Luis Moreira',
    cliente_telefono: '+593987445566',
    direccion_entrega: 'Calle Bolívar, sector Barrio San Antonio, Baba',
    estado: 'listo',
    metodo_pago: 'efectivo',
    subtotal: 8.50,
    costo_envio: 1.50,
    total: 10.00,
    notas: '',
    fecha_creacion: new Date(Date.now() - 22 * 60000).toISOString(),
    comercio_id: '55555555-5555-5555-5555-555555555555',
    items: [
      { producto: 'Arroz con menestra y carne asada', cantidad: 1, precio_unitario: 6.50 },
      { producto: 'Patacones con queso criollo', cantidad: 1, precio_unitario: 2.00 },
    ],
  },
];

// Helper para normalizar el ID del comercio (alias vs UUID)
function resolveMerchantId(merchantId: string): string {
  if (merchantId === 'merch-baba-01' || merchantId === 'usr-comercio-01') {
    return '55555555-5555-5555-5555-555555555555';
  }
  return merchantId;
}

function resolveClientId(id?: string): string {
  if (!id || id === 'usr-cliente-01' || id === 'cliente-01') {
    return '44444444-4444-4444-4444-444444444444';
  }
  return id;
}

const PRODUCT_SLUG_MAP: Record<string, string> = {
  'seco-gallina': '66666666-6666-6666-6666-666666666601',
  'bolon-mixto': '66666666-6666-6666-6666-666666666602',
  'seco-pollo': '66666666-6666-6666-6666-666666666603',
  'menestra': '66666666-6666-6666-6666-666666666604',
  'maracuya': '66666666-6666-6666-6666-666666666605',
  'cafe': '66666666-6666-6666-6666-666666666606',
  'patacones': '66666666-6666-6666-6666-666666666606',
};

function resolveProductId(id?: string): string {
  if (id && PRODUCT_SLUG_MAP[id]) return PRODUCT_SLUG_MAP[id];
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
  return '66666666-6666-6666-6666-666666666601';
}


// Helper para normalizar estado a formato estándar
function normalizeStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'creado',
    creado: 'creado',
    ACCEPTED: 'confirmado',
    confirmado: 'confirmado',
    PREPARING: 'en_preparacion',
    en_preparacion: 'en_preparacion',
    en_cocina: 'en_preparacion',
    READY_FOR_PICKUP: 'listo',
    listo: 'listo',
    listo_para_entrega: 'listo',
    ON_THE_WAY: 'en_camino',
    en_camino: 'en_camino',
    DELIVERED: 'entregado',
    entregado: 'entregado',
    CANCELLED: 'cancelado',
    cancelado: 'cancelado',
  };
  return map[status] || status;
}

// 1. Carrito temporal en Redis
orderRouter.get('/carrito/:clienteId', async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params;
    const cartRaw = await redisClient.get(`cart:${clienteId}`);
    const cart = cartRaw ? JSON.parse(cartRaw) : { items: [], comercioId: null };

    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

orderRouter.post('/carrito/:clienteId', async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params;
    const { comercioId, items } = req.body;

    const cartPayload = {
      comercioId: resolveMerchantId(comercioId),
      items,
      actualizado_en: new Date().toISOString(),
    };

    await redisClient.setex(`cart:${clienteId}`, 86400, JSON.stringify(cartPayload));

    res.json({ success: true, message: 'Carrito sincronizado en Redis', data: cartPayload });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

orderRouter.delete('/carrito/:clienteId', async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params;
    await redisClient.del(`cart:${clienteId}`);
    res.json({ success: true, message: 'Carrito vaciado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Checkout transaccional en PostgreSQL + PostGIS
orderRouter.post('/checkout', async (req: Request, res: Response) => {
  let client;
  try {
    const {
      clienteId,
      comercioId,
      metodoPago = 'efectivo',
      direccionEntrega,
      lonEntrega = -79.6783, // Coordenadas Baba por defecto
      latEntrega = -1.7917,
      costoEnvio = 1.50,
      notas = '',
      items: directItems,
    } = req.body;

    const targetMerchantId = resolveMerchantId(comercioId);
    const targetClientId = resolveClientId(clienteId);

    // Obtener ítems: del carrito en Redis o directamente del body
    let cartItems = directItems;
    if (!cartItems || cartItems.length === 0) {
      const cartRaw = await redisClient.get(`cart:${clienteId || targetClientId}`);
      if (cartRaw) {
        const cart = JSON.parse(cartRaw);
        cartItems = cart.items;
      }
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay ítems para procesar el pedido.' });
    }

    client = await pgPool.connect();
    await client.query('BEGIN');

    const subtotal = cartItems.reduce(
      (acc: number, item: any) => acc + Number(item.precio || item.unitPrice || 0) * Number(item.cantidad || item.quantity || 1),
      0
    );
    const total = subtotal + Number(costoEnvio);

    const orderInsertQuery = `
      INSERT INTO pedidos (
        cliente_id, comercio_id, estado, metodo_pago, subtotal, costo_envio, total, 
        direccion_entrega, ubicacion_entrega, notas
      ) VALUES (
        $1, $2, 'creado', $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326), $10
      ) RETURNING id, estado, total, fecha_creacion;
    `;
    const orderResult = await client.query(orderInsertQuery, [
      targetClientId,
      targetMerchantId,
      metodoPago,
      subtotal,
      costoEnvio,
      total,
      direccionEntrega || 'Barrio San Antonio, Calle Bolívar y Sucre, Baba',
      lonEntrega,
      latEntrega,
      notas,
    ]);
    const pedidoCreado = orderResult.rows[0];

    for (const item of cartItems) {
      const targetProductId = resolveProductId(item.productoId || item.id);
      await client.query(
        `INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [
          pedidoCreado.id,
          targetProductId,
          item.cantidad || item.quantity || 1,
          item.precio || item.unitPrice || 0,
        ]
      );
    }

    // Si el pago es con saldo virtual de la billetera, verificar y asentar egreso en ledger
    if (metodoPago === 'saldo_virtual') {
      const balanceRes = await client.query(
        'SELECT COALESCE(SUM(monto), 0.00) as saldo FROM transacciones_ledger WHERE usuario_id::text = $1',
        [targetClientId]
      );
      const saldoActual = parseFloat(balanceRes.rows[0]?.saldo || '0.00');
      if (saldoActual < total) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Saldo insuficiente en tu Billetera Virtual (Disponible: $${saldoActual.toFixed(2)}, Total del pedido: $${total.toFixed(2)}). Recarga saldo o elige Efectivo/Transferencia.`,
        });
      }

      const nuevoSaldo = saldoActual - total;
      await client.query(
        `INSERT INTO transacciones_ledger (
           usuario_id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
         ) VALUES ($1, $2, 'egreso', $3, $4, $5, $6)`,
        [
          targetClientId,
          pedidoCreado.id,
          -total,
          nuevoSaldo,
          `Pago de Pedido #${pedidoCreado.id.slice(0, 8)} con Billetera Virtual`,
          JSON.stringify({ canal: 'billetera_virtual', total }),
        ]
      );
    }

    await client.query('COMMIT');

    // Limpiar carrito si existía
    if (clienteId) {
      await redisClient.del(`cart:${clienteId}`);
    }

    // Publicar evento en Redis Pub/Sub para tiempo real
    const eventPayload = {
      event: 'order:created',
      type: 'ORDER_CREATED',
      pedido: {
        id: pedidoCreado.id,
        estado: pedidoCreado.estado,
        total: pedidoCreado.total,
        comercioId: targetMerchantId,
        fechaCreacion: pedidoCreado.fecha_creacion,
      },
      timestamp: new Date().toISOString(),
    };
    await redisClient.publish('orders:events', JSON.stringify(eventPayload));

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      pedido: pedidoCreado,
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    if (client) client.release();
  }
});

// 3. Listar pedidos para Kanban del comercio (Baba / Babahoyo)
orderRouter.get('/comercio/:comercioId', async (req: Request, res: Response) => {
  try {
    const { comercioId } = req.params;
    const targetComercioId = resolveMerchantId(comercioId);

    const query = `
      SELECT 
        p.id, p.estado, p.metodo_pago, p.subtotal, p.costo_envio, p.total,
        p.direccion_entrega, p.notas, p.fecha_creacion,
        u.nombre as cliente_nombre, u.telefono as cliente_telefono,
        r.nombre as repartidor_nombre,
        (
          SELECT json_agg(json_build_object(
            'producto', COALESCE(pr.nombre, 'Plato especial'),
            'cantidad', pi.cantidad,
            'precio_unitario', pi.precio_unitario
          ))
          FROM pedidos_items pi
          LEFT JOIN productos pr ON pr.id = pi.producto_id
          WHERE pi.pedido_id = p.id
        ) as items
      FROM pedidos p
      JOIN usuarios u ON u.id = p.cliente_id
      LEFT JOIN usuarios r ON r.id = p.repartidor_id
      WHERE p.comercio_id::text = $1 OR p.comercio_id::text = $2
      ORDER BY p.fecha_creacion DESC;
    `;

    let rows: any[] = [];
    try {
      const result = await pgPool.query(query, [comercioId, targetComercioId]);
      rows = result.rows;
    } catch (dbErr) {
      console.warn('⚠️ No se pudo consultar la BD para pedidos, usando fallback Baba:', dbErr);
    }

    // Entregar únicamente órdenes reales registradas en la base de datos
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3.1. Listar pedidos del cliente autenticado
orderRouter.get('/cliente/:clienteId', async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params;
    const targetClientId = resolveClientId(clienteId);

    const query = `
      SELECT 
        p.id, p.estado, p.metodo_pago, p.subtotal, p.costo_envio, p.total,
        p.direccion_entrega, p.notas, p.fecha_creacion,
        c.nombre_comercial, c.telefono as comercio_telefono,
        r.nombre as repartidor_nombre, r.telefono as repartidor_telefono,
        (
          SELECT json_agg(json_build_object(
            'producto', COALESCE(pr.nombre, 'Plato especial'),
            'cantidad', pi.cantidad,
            'precio_unitario', pi.precio_unitario
          ))
          FROM pedidos_items pi
          LEFT JOIN productos pr ON pr.id = pi.producto_id
          WHERE pi.pedido_id = p.id
        ) as items
      FROM pedidos p
      JOIN comercios c ON c.id = p.comercio_id
      LEFT JOIN usuarios r ON r.id = p.repartidor_id
      WHERE p.cliente_id::text = $1 OR p.cliente_id::text = $2
      ORDER BY p.fecha_creacion DESC
      LIMIT 30;
    `;
    const result = await pgPool.query(query, [clienteId, targetClientId]);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. Detalle de un pedido específico
orderRouter.get('/:pedidoId', async (req: Request, res: Response) => {
  try {
    const { pedidoId } = req.params;

    const mockFound = mockBabaOrders.find((o) => o.id === pedidoId);
    if (mockFound) {
      return res.json({ success: true, data: mockFound });
    }

    const query = `
      SELECT p.*, u.nombre as cliente_nombre, u.telefono as cliente_telefono
      FROM pedidos p
      JOIN usuarios u ON u.id = p.cliente_id
      WHERE p.id::text = $1 LIMIT 1;
    `;
    const result = await pgPool.query(query, [pedidoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Actualizar estado del pedido (Kanban y Repartidor)
const handleStatusUpdate = async (req: Request, res: Response) => {
  try {
    const { pedidoId } = req.params;
    const rawEstado = req.body.nuevoEstado || req.body.status || req.body.estado;

    if (!rawEstado) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar nuevoEstado o status en el cuerpo de la solicitud',
      });
    }

    const nuevoEstado = normalizeStatus(rawEstado);
    const { repartidorId } = req.body;
    let targetMerchantId = '55555555-5555-5555-5555-555555555555';

    // Si es un pedido de mock
    const mockOrder = mockBabaOrders.find((o) => o.id === pedidoId);
    if (mockOrder) {
      mockOrder.estado = nuevoEstado;
      targetMerchantId = mockOrder.comercio_id || targetMerchantId;
    }

    // Actualizar en base de datos si existe
    try {
      let query = 'UPDATE pedidos SET estado = $1, fecha_actualizacion = NOW()';
      const params: any[] = [nuevoEstado];

      if (repartidorId) {
        query += ', repartidor_id = $2 WHERE id::text = $3 RETURNING comercio_id';
        params.push(repartidorId, pedidoId);
      } else {
        query += ' WHERE id::text = $2 RETURNING comercio_id';
        params.push(pedidoId);
      }

      const dbRes = await pgPool.query(query, params);
      if (dbRes.rows.length > 0 && dbRes.rows[0].comercio_id) {
        targetMerchantId = dbRes.rows[0].comercio_id;
      }
    } catch (dbErr) {
      console.warn(`⚠️ Actualización en DB falló o id es mock (${pedidoId}), estado actualizado en memoria.`);
    }

    // Publicar evento en Redis Pub/Sub para que Tracking Service / WebSockets alerte al frontend
    const eventPayload = {
      event: 'order:status_updated',
      type: 'ORDER_STATUS_CHANGED',
      pedidoId,
      nuevoEstado,
      status: nuevoEstado,
      comercioId: targetMerchantId,
      merchant_id: targetMerchantId,
      timestamp: new Date().toISOString(),
    };
    try {
      await redisClient.publish('orders:events', JSON.stringify(eventPayload));
    } catch (redisErr) {
      console.warn('⚠️ No se pudo publicar evento a Redis:', redisErr);
    }

    res.json({
      success: true,
      message: `Estado de pedido actualizado a ${nuevoEstado}`,
      data: { pedidoId, nuevoEstado, comercioId: targetMerchantId },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

orderRouter.patch('/:pedidoId/estado', handleStatusUpdate);
orderRouter.patch('/:pedidoId/status', handleStatusUpdate);

// 5.1. Rechazar pedido con motivo y reembolso automático (Ledger)
orderRouter.patch('/:pedidoId/rechazar', async (req: Request, res: Response) => {
  let client;
  try {
    const { pedidoId } = req.params;
    const { motivo = 'No especificado por el comercio', pausarProductoId } = req.body;

    client = await pgPool.connect();
    await client.query('BEGIN');

    const updateQuery = `
      UPDATE pedidos
      SET estado = 'cancelado', motivo_rechazo = $1, fecha_rechazo = NOW(), fecha_actualizacion = NOW()
      WHERE id::text = $2
      RETURNING id, cliente_id, comercio_id, total, metodo_pago;
    `;
    const result = await client.query(updateQuery, [motivo, pedidoId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const pedido = result.rows[0];

    // Reembolso inmediato si el pago fue con saldo virtual
    if (pedido.metodo_pago === 'saldo_virtual' && Number(pedido.total) > 0) {
      const balanceRes = await client.query(
        'SELECT COALESCE(SUM(monto), 0.00) as saldo FROM transacciones_ledger WHERE usuario_id::text = $1',
        [pedido.cliente_id]
      );
      const saldoActual = parseFloat(balanceRes.rows[0]?.saldo || '0.00');
      const montoReembolso = parseFloat(pedido.total);
      const nuevoSaldo = saldoActual + montoReembolso;

      await client.query(
        `INSERT INTO transacciones_ledger (
           usuario_id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
         ) VALUES ($1, $2, 'ingreso', $3, $4, $5, $6)`,
        [
          pedido.cliente_id,
          pedido.id,
          montoReembolso,
          nuevoSaldo,
          `Reembolso automático por pedido rechazado: ${motivo}`,
          JSON.stringify({ canal: 'reembolso_cancelacion', motivo }),
        ]
      );
    }

    // Si el local seleccionó un producto para pausar por falta de stock
    if (pausarProductoId) {
      await client.query('UPDATE productos SET is_disponible = false WHERE id::text = $1', [pausarProductoId]);
      await redisClient.set(`catalog:disponibilidad:${pausarProductoId}`, '0');
    }

    await client.query('COMMIT');

    // Notificar en tiempo real por Redis Pub/Sub
    const eventPayload = {
      event: 'order:status_updated',
      type: 'ORDER_CANCELLED',
      pedido: {
        id: pedido.id,
        estado: 'cancelado',
        motivoRechazo: motivo,
        comercioId: pedido.comercio_id,
        clienteId: pedido.cliente_id,
      },
      timestamp: new Date().toISOString(),
    };
    await redisClient.publish('orders:events', JSON.stringify(eventPayload));

    res.json({
      success: true,
      message: 'Pedido rechazado y cancelado correctamente',
      data: { id: pedido.id, estado: 'cancelado', motivoRechazo: motivo },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    if (client) client.release();
  }
});

// 6. Listar pedidos listos para despacho (para la App del Repartidor en Baba)
orderRouter.get('/disponibles/reparto', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        p.id, p.estado, p.metodo_pago, p.subtotal, p.costo_envio, p.total,
        p.direccion_entrega, p.notas, p.fecha_creacion,
        ST_Y(p.ubicacion_entrega) as lat_entrega,
        ST_X(p.ubicacion_entrega) as lon_entrega,
        u.nombre as cliente_nombre, u.telefono as cliente_telefono,
        c.nombre_comercial as comercio_nombre, c.direccion as comercio_direccion,
        ST_Y(c.ubicacion) as comercio_lat, ST_X(c.ubicacion) as comercio_lon,
        (
          SELECT json_agg(json_build_object(
            'producto', COALESCE(pr.nombre, 'Plato especial'),
            'cantidad', pi.cantidad,
            'precio_unitario', pi.precio_unitario
          ))
          FROM pedidos_items pi
          LEFT JOIN productos pr ON pr.id = pi.producto_id
          WHERE pi.pedido_id = p.id
        ) as items
      FROM pedidos p
      JOIN usuarios u ON u.id = p.cliente_id
      JOIN comercios c ON c.id = p.comercio_id
      WHERE p.estado::text IN ('listo', 'READY_FOR_PICKUP') AND p.repartidor_id IS NULL
      ORDER BY p.fecha_creacion ASC;
    `;
    const result = await pgPool.query(query);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Helper para resolver ID de repartidor
function resolveDriverId(id: string): string {
  if (id === 'usr-repartidor-01' || id === 'rep-baba-01') {
    return '33333333-3333-3333-3333-333333333333';
  }
  return id;
}

// 7. Repartidor toma el pedido e inicia ruta (en_camino)
orderRouter.patch('/:pedidoId/tomar', async (req: Request, res: Response) => {
  try {
    const { pedidoId } = req.params;
    const rawRepartidorId = req.body.repartidorId || '33333333-3333-3333-3333-333333333333';
    const repartidorId = resolveDriverId(rawRepartidorId);

    const updateQuery = `
      UPDATE pedidos 
      SET estado = 'en_camino', repartidor_id = $1, fecha_actualizacion = NOW()
      WHERE id::text = $2
      RETURNING id, estado, comercio_id, cliente_id;
    `;
    const result = await pgPool.query(updateQuery, [repartidorId, pedidoId]);

    // Publicar evento en Redis Pub/Sub
    const eventPayload = {
      event: 'order:status_updated',
      type: 'ORDER_STATUS_CHANGED',
      pedidoId,
      nuevoEstado: 'en_camino',
      status: 'en_camino',
      repartidorId,
      comercioId: result.rows[0]?.comercio_id || '55555555-5555-5555-5555-555555555555',
      merchant_id: result.rows[0]?.comercio_id || '55555555-5555-5555-5555-555555555555',
      timestamp: new Date().toISOString(),
    };
    await redisClient.publish('orders:events', JSON.stringify(eventPayload));

    res.json({
      success: true,
      message: 'Pedido tomado por el repartidor. Ahora en camino a entrega.',
      data: { pedidoId, estado: 'en_camino', repartidorId },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 8. Repartidor marca pedido como entregado (Liquida automáticamente en Ledger Contable)
orderRouter.patch('/:pedidoId/entregar', async (req: Request, res: Response) => {
  let client;
  try {
    const { pedidoId } = req.params;

    client = await pgPool.connect();
    await client.query('BEGIN');

    // 1. Obtener detalles del pedido
    const orderRes = await client.query('SELECT * FROM pedidos WHERE id::text = $1 FOR UPDATE', [pedidoId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }
    const order = orderRes.rows[0];

    // 2. Marcar pedido como entregado
    await client.query("UPDATE pedidos SET estado = 'entregado', fecha_actualizacion = NOW() WHERE id = $1", [order.id]);

    // 3. Asentar movimiento en transacciones_ledger (Doble Entrada Inmutable)
    const repartidorId = order.repartidor_id || '33333333-3333-3333-3333-333333333333';
    const subtotal = parseFloat(order.subtotal);
    const costoEnvio = parseFloat(order.costo_envio);
    const comisionPlataforma = 0.50; // Tarifa fija plataforma por orden

    if (order.metodo_pago === 'efectivo') {
      // Repartidor cobró total en efectivo (subtotal + costoEnvio)
      // Debe pagar a la plataforma el subtotal + comisionPlataforma
      const deudaRepartidor = -(subtotal + comisionPlataforma);

      const balRes = await client.query('SELECT COALESCE(SUM(monto), 0) as s FROM transacciones_ledger WHERE usuario_id = $1', [repartidorId]);
      const prevBal = parseFloat(balRes.rows[0]?.s || '0');
      const newBal = prevBal + deudaRepartidor;

      await client.query(`
        INSERT INTO transacciones_ledger (
          usuario_id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
        ) VALUES ($1, $2, 'pago_efectivo', $3, $4, $5, $6)
      `, [
        repartidorId,
        order.id,
        deudaRepartidor,
        newBal,
        `Cobro en efectivo pedido #${order.id} (Deuda plataforma)`,
        JSON.stringify({ subtotal, costoEnvio, comisionPlataforma, metodoPago: 'efectivo' }),
      ]);
    } else {
      // Transferencia / Digital: la plataforma ya cobró
      // Acredita ganancia al repartidor
      const gananciaRepartidor = costoEnvio - comisionPlataforma;
      const balRes = await client.query('SELECT COALESCE(SUM(monto), 0) as s FROM transacciones_ledger WHERE usuario_id = $1', [repartidorId]);
      const prevBal = parseFloat(balRes.rows[0]?.s || '0');
      const newBal = prevBal + gananciaRepartidor;

      await client.query(`
        INSERT INTO transacciones_ledger (
          usuario_id, pedido_id, tipo_movimiento, monto, saldo_resultante, descripcion, metadata
        ) VALUES ($1, $2, 'ingreso', $3, $4, $5, $6)
      `, [
        repartidorId,
        order.id,
        gananciaRepartidor,
        newBal,
        `Ganancia por entrega pedido #${order.id}`,
        JSON.stringify({ costoEnvio, comisionPlataforma, metodoPago: order.metodo_pago }),
      ]);
    }

    await client.query('COMMIT');

    // 4. Publicar evento en Redis Pub/Sub
    const eventPayload = {
      event: 'order:status_updated',
      type: 'ORDER_STATUS_CHANGED',
      pedidoId: order.id,
      nuevoEstado: 'entregado',
      status: 'entregado',
      comercioId: order.comercio_id,
      merchant_id: order.comercio_id,
      repartidorId,
      timestamp: new Date().toISOString(),
    };
    await redisClient.publish('orders:events', JSON.stringify(eventPayload));

    res.json({
      success: true,
      message: 'Pedido marcado como entregado y asentado en el ledger contable',
      data: {
        pedidoId: order.id,
        estado: 'entregado',
        repartidorId,
      },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    if (client) client.release();
  }
});
