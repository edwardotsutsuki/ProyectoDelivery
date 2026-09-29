import { Router, Request, Response } from 'express';
import { pgPool } from '../../config/database';
import { redisClient } from '../../config/redis';

export const orderRouter = Router();

// Carrito temporal en Redis
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
      comercioId,
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

// Checkout transaccional en PostgreSQL
orderRouter.post('/checkout', async (req: Request, res: Response) => {
  const client = await pgPool.connect();
  try {
    const {
      clienteId,
      comercioId,
      metodoPago,
      direccionEntrega,
      lonEntrega,
      latEntrega,
      costoEnvio = 1.50,
      notas,
    } = req.body;

    const cartRaw = await redisClient.get(`cart:${clienteId}`);
    if (!cartRaw) {
      return res.status(400).json({ success: false, error: 'El carrito está vacío o ha expirado.' });
    }
    const cart = JSON.parse(cartRaw);
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay ítems en el carrito.' });
    }

    await client.query('BEGIN');

    const subtotal = cart.items.reduce(
      (acc: number, item: any) => acc + Number(item.precio) * Number(item.cantidad),
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
      clienteId,
      comercioId,
      metodoPago,
      subtotal,
      costoEnvio,
      total,
      direccionEntrega,
      lonEntrega,
      latEntrega,
      notas,
    ]);
    const pedidoCreado = orderResult.rows[0];

    for (const item of cart.items) {
      await client.query(
        `INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [pedidoCreado.id, item.productoId, item.cantidad, item.precio]
      );
    }

    await client.query('COMMIT');
    await redisClient.del(`cart:${clienteId}`);

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      pedido: pedidoCreado,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: (error as Error).message });
  } finally {
    client.release();
  }
});

// Listar pedidos para Kanban del comercio
orderRouter.get('/comercio/:comercioId', async (req: Request, res: Response) => {
  try {
    const { comercioId } = req.params;
    const query = `
      SELECT 
        p.id, p.estado, p.metodo_pago, p.subtotal, p.costo_envio, p.total,
        p.direccion_entrega, p.notas, p.fecha_creacion,
        u.nombre as cliente_nombre, u.telefono as cliente_telefono,
        r.nombre as repartidor_nombre,
        (
          SELECT json_agg(json_build_object(
            'producto', pr.nombre,
            'cantidad', pi.cantidad,
            'precio_unitario', pi.precio_unitario
          ))
          FROM pedidos_items pi
          JOIN productos pr ON pr.id = pi.producto_id
          WHERE pi.pedido_id = p.id
        ) as items
      FROM pedidos p
      JOIN usuarios u ON u.id = p.cliente_id
      LEFT JOIN usuarios r ON r.id = p.repartidor_id
      WHERE p.comercio_id = $1
      ORDER BY p.fecha_creacion DESC;
    `;
    const result = await pgPool.query(query, [comercioId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

orderRouter.patch('/:pedidoId/estado', async (req: Request, res: Response) => {
  try {
    const { pedidoId } = req.params;
    const { nuevoEstado, repartidorId } = req.body;

    let query = 'UPDATE pedidos SET estado = $1, fecha_actualizacion = NOW()';
    const params: any[] = [nuevoEstado];

    if (repartidorId) {
      query += ', repartidor_id = $2 WHERE id = $3';
      params.push(repartidorId, pedidoId);
    } else {
      query += ' WHERE id = $2';
      params.push(pedidoId);
    }

    await pgPool.query(query, params);
    res.json({ success: true, message: `Estado de pedido actualizado a ${nuevoEstado}` });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

