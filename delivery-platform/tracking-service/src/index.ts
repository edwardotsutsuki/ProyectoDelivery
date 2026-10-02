import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const REDIS_HOST = process.env.REDIS_HOST || 'redis-cache';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const pub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
const sub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

const wss = new WebSocketServer({ port: PORT });

const orderSubscriptions = new Map<string, Set<WebSocket>>();
const merchantSubscriptions = new Map<string, Set<WebSocket>>();
const adminSockets = new Set<WebSocket>();

// Suscripción a tracking de posiciones
sub.subscribe('tracking:positions', (err) => {
  if (err) console.error('❌ Error suscribiendo a Redis tracking:positions:', err);
  else console.log('📡 Tracking Service suscrito a canal Redis "tracking:positions"');
});

// Suscripción a eventos de ciclo de vida de pedidos (Fase 3 & 4)
sub.subscribe('orders:events', (err) => {
  if (err) console.error('❌ Error suscribiendo a Redis orders:events:', err);
  else console.log('📡 Tracking Service suscrito a canal Redis "orders:events"');
});

sub.on('message', (channel, message) => {
  try {
    if (channel === 'tracking:positions') {
      const data = JSON.parse(message);
      const { pedidoId } = data;

      // Retransmitir a clientes suscritos a este pedido específico
      if (pedidoId && orderSubscriptions.has(pedidoId)) {
        const clients = orderSubscriptions.get(pedidoId)!;
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'DRIVER_LOCATION', payload: data }));
            client.send(JSON.stringify({ event: 'courier:location_update', data }));
          }
        }
      }

      // Retransmitir al Backoffice radar
      for (const admin of adminSockets) {
        if (admin.readyState === WebSocket.OPEN) {
          admin.send(JSON.stringify({ type: 'ADMIN_TRACKING_FEED', payload: data }));
        }
      }
    } else if (channel === 'orders:events') {
      const data = JSON.parse(message);
      const pedidoId = data.pedidoId || data.pedido?.id;
      const comercioId = data.comercioId || data.pedido?.comercioId;

      // 1. Notificar a panel de comercio si está suscrito
      if (comercioId && merchantSubscriptions.has(comercioId)) {
        const merchants = merchantSubscriptions.get(comercioId)!;
        for (const ws of merchants) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ORDER_EVENT', payload: data }));
          }
        }
      }

      // 2. Notificar a suscriptores de la orden (cliente)
      if (pedidoId && orderSubscriptions.has(pedidoId)) {
        const clients = orderSubscriptions.get(pedidoId)!;
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'ORDER_EVENT', payload: data }));
          }
        }
      }

      // 3. Notificar a directivos en Backoffice
      for (const admin of adminSockets) {
        if (admin.readyState === WebSocket.OPEN) {
          admin.send(JSON.stringify({ type: 'ORDER_EVENT', payload: data }));
        }
      }
    }
  } catch (err) {
    console.error('Error procesando mensaje de Redis Pub/Sub:', err);
  }
});

wss.on('connection', (ws: WebSocket) => {
  let subscribedOrderId: string | null = null;
  let subscribedComercioId: string | null = null;
  let isAdmin = false;

  ws.on('message', async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());

      switch (msg.type || msg.event) {
        case 'REPARTIDOR_LOCATION_UPDATE':
        case 'courier:location_update': {
          const payload = msg.payload || msg.data || msg;
          const { repartidorId, pedidoId, order_id, lat, lon, lng, heading, speed } = payload;
          const targetOrderId = pedidoId || order_id;

          const locationData = {
            repartidorId: repartidorId || 'rep-baba-01',
            pedidoId: targetOrderId,
            order_id: targetOrderId,
            lat: Number(lat),
            lon: Number(lon !== undefined ? lon : lng),
            lng: Number(lng !== undefined ? lng : lon),
            heading: heading || 0,
            speed: speed || 0,
            timestamp: new Date().toISOString(),
          };

          if (locationData.repartidorId) {
            await pub.setex(`driver:pos:${locationData.repartidorId}`, 120, JSON.stringify(locationData));
          }
          await pub.publish('tracking:positions', JSON.stringify(locationData));
          break;
        }

        case 'SUBSCRIBE_ORDER': {
          const orderId = msg.pedidoId || msg.orderId;
          if (orderId) {
            subscribedOrderId = orderId;
            if (!orderSubscriptions.has(orderId)) {
              orderSubscriptions.set(orderId, new Set());
            }
            orderSubscriptions.get(orderId)!.add(ws);
            ws.send(JSON.stringify({ type: 'SUBSCRIBED', pedidoId: orderId }));
          }
          break;
        }

        case 'SUBSCRIBE_MERCHANT': {
          const merchantId = msg.comercioId || msg.merchantId;
          if (merchantId) {
            subscribedComercioId = merchantId;
            if (!merchantSubscriptions.has(merchantId)) {
              merchantSubscriptions.set(merchantId, new Set());
            }
            merchantSubscriptions.get(merchantId)!.add(ws);
            ws.send(JSON.stringify({ type: 'SUBSCRIBED_MERCHANT', comercioId: merchantId }));
          }
          break;
        }

        case 'SUBSCRIBE_BACKOFFICE': {
          isAdmin = true;
          adminSockets.add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED_ADMIN', message: 'Conectado a radar global y flujo de órdenes' }));
          break;
        }
      }
    } catch (e) {
      console.error('Error parseando mensaje WebSocket:', e);
    }
  });

  ws.on('close', () => {
    if (subscribedOrderId && orderSubscriptions.has(subscribedOrderId)) {
      orderSubscriptions.get(subscribedOrderId)!.delete(ws);
      if (orderSubscriptions.get(subscribedOrderId)!.size === 0) {
        orderSubscriptions.delete(subscribedOrderId);
      }
    }
    if (subscribedComercioId && merchantSubscriptions.has(subscribedComercioId)) {
      merchantSubscriptions.get(subscribedComercioId)!.delete(ws);
      if (merchantSubscriptions.get(subscribedComercioId)!.size === 0) {
        merchantSubscriptions.delete(subscribedComercioId);
      }
    }
    if (isAdmin) {
      adminSockets.delete(ws);
    }
  });
});

console.log(`🛰️ Tracking WebSocket Service listo en puerto ${PORT}`);
