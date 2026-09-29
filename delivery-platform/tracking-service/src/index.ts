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
const adminSockets = new Set<WebSocket>();

sub.subscribe('tracking:positions', (err) => {
  if (err) console.error('Error suscribiendo a Redis tracking:', err);
  else console.log('📡 Tracking Service suscrito a canal Redis "tracking:positions"');
});

sub.on('message', (channel, message) => {
  if (channel === 'tracking:positions') {
    const data = JSON.parse(message);
    const { pedidoId } = data;

    if (pedidoId && orderSubscriptions.has(pedidoId)) {
      const clients = orderSubscriptions.get(pedidoId)!;
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'DRIVER_LOCATION', payload: data }));
        }
      }
    }

    for (const admin of adminSockets) {
      if (admin.readyState === WebSocket.OPEN) {
        admin.send(JSON.stringify({ type: 'ADMIN_TRACKING_FEED', payload: data }));
      }
    }
  }
});

wss.on('connection', (ws: WebSocket) => {
  let subscribedOrderId: string | null = null;
  let isAdmin = false;

  ws.on('message', async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());

      switch (msg.type) {
        case 'REPARTIDOR_LOCATION_UPDATE': {
          const { repartidorId, pedidoId, lat, lon, heading, speed } = msg;
          const locationData = {
            repartidorId,
            pedidoId,
            lat,
            lon,
            heading: heading || 0,
            speed: speed || 0,
            timestamp: new Date().toISOString(),
          };

          await pub.setex(`driver:pos:${repartidorId}`, 120, JSON.stringify(locationData));
          await pub.publish('tracking:positions', JSON.stringify(locationData));
          break;
        }

        case 'SUBSCRIBE_ORDER': {
          subscribedOrderId = msg.pedidoId;
          if (!orderSubscriptions.has(msg.pedidoId)) {
            orderSubscriptions.set(msg.pedidoId, new Set());
          }
          orderSubscriptions.get(msg.pedidoId)!.add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', pedidoId: msg.pedidoId }));
          break;
        }

        case 'SUBSCRIBE_BACKOFFICE': {
          isAdmin = true;
          adminSockets.add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED_ADMIN', message: 'Conectado a radar global' }));
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
    if (isAdmin) {
      adminSockets.delete(ws);
    }
  });
});

console.log(`🛰️ Tracking WebSocket Service listo en puerto ${PORT}`);
