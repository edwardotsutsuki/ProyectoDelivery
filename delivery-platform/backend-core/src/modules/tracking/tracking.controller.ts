import { Router, Request, Response } from 'express';
import { redisClient } from '../../config/redis';
import { pgPool } from '../../config/database';

export const trackingRouter = Router();

const OSRM_URL = process.env.OSRM_URL || 'http://osrm-backend:5000';

// Función para calcular distancia esférica (Haversine) en metros
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. Cálculo de Ruta y ETA (OSRM con Fallback Geodésico Inteligente para Baba y Babahoyo)
trackingRouter.get('/route', async (req: Request, res: Response) => {
  try {
    const originLat = parseFloat(req.query.originLat as string || req.query.lat1 as string);
    const originLon = parseFloat(req.query.originLon as string || req.query.originLng as string || req.query.lng1 as string);
    const destLat = parseFloat(req.query.destLat as string || req.query.lat2 as string);
    const destLon = parseFloat(req.query.destLon as string || req.query.destLng as string || req.query.lng2 as string);

    if (isNaN(originLat) || isNaN(originLon) || isNaN(destLat) || isNaN(destLon)) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar originLat, originLon, destLat y destLon como números válidos',
      });
    }

    // Intentar consultar el motor OSRM local
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);

      const osrmEndpoint = `${OSRM_URL}/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;
      const response = await fetch(osrmEndpoint, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const osrmData = (await response.json()) as any;
        if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
          const route = osrmData.routes[0];
          return res.json({
            success: true,
            source: 'osrm-engine',
            distanceMeters: Math.round(route.distance),
            durationSeconds: Math.round(route.duration),
            etaMinutes: Math.max(1, Math.round(route.duration / 60)),
            geometry: route.geometry,
          });
        }
      }
    } catch (osrmErr) {
      // OSRM no listo o timeout, proceder con fallback geodésico
    }

    // Fallback Geodésico vial de Baba / Babahoyo
    // Factor de desvío de calles urbanas en Los Ríos: ~1.28
    const straightMeters = haversineDistanceMeters(originLat, originLon, destLat, destLon);
    const roadMeters = Math.round(straightMeters * 1.28);
    // Velocidad media de moto en zona urbana de Baba: 25 km/h = 6.94 m/s
    const durationSeconds = Math.max(60, Math.round(roadMeters / 6.94));
    const etaMinutes = Math.max(1, Math.round(durationSeconds / 60));

    // Generar geometría GeoJSON interpolada
    const midLat = originLat + (destLat - originLat) * 0.5;
    const midLon = originLon + (destLon - originLon) * 0.5;

    const coordinates = [
      [originLon, originLat],
      [originLon, midLat], // Giro en esquina
      [midLon, midLat],
      [destLon, midLat],
      [destLon, destLat],
    ];

    res.json({
      success: true,
      source: 'geodesic-fallback',
      distanceMeters: roadMeters,
      durationSeconds,
      etaMinutes,
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Obtener posición GPS en tiempo real de un repartidor desde Redis
trackingRouter.get('/driver-pos/:repartidorId', async (req: Request, res: Response) => {
  try {
    const { repartidorId } = req.params;
    const rawPos = await redisClient.get(`driver:pos:${repartidorId}`);

    if (!rawPos) {
      // Si no hay posición reciente, entregar posición por defecto en Baba Centro
      return res.json({
        success: true,
        source: 'default-baba',
        data: {
          repartidorId,
          lat: -1.7925,
          lon: -79.6790,
          heading: 0,
          speed: 0,
          timestamp: new Date().toISOString(),
          status: 'offline',
        },
      });
    }

    const pos = JSON.parse(rawPos);
    res.json({
      success: true,
      source: 'live-redis',
      data: {
        ...pos,
        status: 'online',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Obtener ETA y estado de entrega de un pedido en curso
trackingRouter.get('/pedido/:pedidoId/eta', async (req: Request, res: Response) => {
  try {
    const { pedidoId } = req.params;

    const query = `
      SELECT 
        p.id, p.estado, p.repartidor_id,
        ST_Y(p.ubicacion_entrega) as dest_lat,
        ST_X(p.ubicacion_entrega) as dest_lon,
        ST_Y(c.ubicacion) as restaurant_lat,
        ST_X(c.ubicacion) as restaurant_lon,
        c.nombre_comercial as restaurant_nombre
      FROM pedidos p
      JOIN comercios c ON c.id = p.comercio_id
      WHERE p.id::text = $1 LIMIT 1;
    `;
    const result = await pgPool.query(query, [pedidoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const order = result.rows[0];
    let driverLat = order.restaurant_lat;
    let driverLon = order.restaurant_lon;

    if (order.repartidor_id) {
      const rawPos = await redisClient.get(`driver:pos:${order.repartidor_id}`);
      if (rawPos) {
        const pos = JSON.parse(rawPos);
        driverLat = pos.lat;
        driverLon = pos.lon;
      }
    }

    const distanceMeters = Math.round(haversineDistanceMeters(driverLat, driverLon, order.dest_lat, order.dest_lon) * 1.28);
    const durationSeconds = Math.max(60, Math.round(distanceMeters / 6.94));
    const etaMinutes = Math.max(1, Math.round(durationSeconds / 60));

    res.json({
      success: true,
      pedidoId,
      estado: order.estado,
      repartidorId: order.repartidor_id,
      origen: { lat: driverLat, lon: driverLon },
      destino: { lat: order.dest_lat, lon: order.dest_lon },
      distanciaMetros: distanceMeters,
      etaMinutos: etaMinutes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
