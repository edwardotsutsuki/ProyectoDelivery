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
      origen: { lat: order.restaurant_lat, lon: order.restaurant_lon, nombre: order.restaurant_nombre },
      repartidor: { lat: driverLat, lon: driverLon },
      destino: { lat: order.dest_lat, lon: order.dest_lon },
      distanciaMetros: distanceMeters,
      etaMinutos: etaMinutes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. Listar todas las zonas de cobertura y polígonos GeoJSON (Baba y Babahoyo)
trackingRouter.get('/zonas', async (_req: Request, res: Response) => {
  try {
    const result = await pgPool.query(`
      SELECT 
        id, nombre, codigo, canton,
        tarifa_base, costo_km_adicional, tiempo_estimado_min, activa,
        ST_AsGeoJSON(poligono) as geojson
      FROM zonas_cobertura
      ORDER BY canton ASC, nombre ASC;
    `);

    const zonas = result.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      codigo: row.codigo,
      canton: row.canton,
      tarifaBase: parseFloat(row.tarifa_base),
      costoKmAdicional: parseFloat(row.costo_km_adicional),
      tiempoEstimadoMin: row.tiempo_estimado_min,
      activa: row.activa,
      geometria: JSON.parse(row.geojson),
    }));

    res.json({
      success: true,
      total: zonas.length,
      data: zonas,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Alternar activación de una zona de cobertura (Admin Backoffice)
trackingRouter.patch('/zonas/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pgPool.query(`
      UPDATE zonas_cobertura
      SET activa = NOT activa, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id::text = $1 OR codigo = $1
      RETURNING id, nombre, codigo, canton, activa;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Zona no encontrada' });
    }

    res.json({
      success: true,
      message: `Zona ${result.rows[0].nombre} ${result.rows[0].activa ? 'activada' : 'desactivada'} exitosamente`,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 6. Cálculo de tarifa dinámica por geolocalización y polígonos PostGIS
trackingRouter.post('/calcular-tarifa', async (req: Request, res: Response) => {
  try {
    const { originLat, originLon, destLat, destLon, isNight, isRain } = req.body;

    if (
      originLat === undefined || originLon === undefined ||
      destLat === undefined || destLon === undefined ||
      isNaN(parseFloat(originLat)) || isNaN(parseFloat(originLon)) ||
      isNaN(parseFloat(destLat)) || isNaN(parseFloat(destLon))
    ) {
      return res.status(400).json({
        success: false,
        message: 'originLat, originLon, destLat y destLon son obligatorios y numéricos',
      });
    }

    const oLat = parseFloat(originLat);
    const oLon = parseFloat(originLon);
    const dLat = parseFloat(destLat);
    const dLon = parseFloat(destLon);

    // 1. Verificar cobertura del destino en zonas activas
    const zoneQuery = `
      SELECT id, nombre, codigo, canton, tarifa_base, costo_km_adicional, tiempo_estimado_min
      FROM zonas_cobertura
      WHERE activa = TRUE 
        AND ST_Contains(poligono, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      ORDER BY tarifa_base ASC
      LIMIT 1;
    `;
    const destZoneRes = await pgPool.query(zoneQuery, [dLon, dLat]);
    const originZoneRes = await pgPool.query(zoneQuery, [oLon, oLat]);

    if (destZoneRes.rows.length === 0) {
      return res.status(422).json({
        success: false,
        coberturaValida: false,
        message: 'La dirección de entrega se encuentra fuera de nuestra zona de cobertura en Baba y Babahoyo.',
      });
    }

    // Si origen y destino están en diferentes cantones, aplicar tarifa de corredor intercantonal
    let selectedZone = destZoneRes.rows[0];
    const isIntercantonal = originZoneRes.rows.length > 0 &&
      originZoneRes.rows[0].canton !== destZoneRes.rows[0].canton &&
      originZoneRes.rows[0].canton !== 'Intercantonal' &&
      destZoneRes.rows[0].canton !== 'Intercantonal';

    if (isIntercantonal) {
      const intercantonalRes = await pgPool.query(`
        SELECT id, nombre, codigo, canton, tarifa_base, costo_km_adicional, tiempo_estimado_min
        FROM zonas_cobertura
        WHERE codigo = 'corredor_e484' AND activa = TRUE
        LIMIT 1;
      `);
      if (intercantonalRes.rows.length > 0) {
        selectedZone = intercantonalRes.rows[0];
      }
    }

    // 2. Calcular distancia y duración (vía OSRM con fallback geodésico)
    let distanceMeters = 0;
    let durationSeconds = 0;
    let source = 'geodesic-fallback';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const osrmEndpoint = `${OSRM_URL}/route/v1/driving/${oLon},${oLat};${dLon},${dLat}?overview=false`;
      const response = await fetch(osrmEndpoint, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const osrmData = (await response.json()) as any;
        if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
          distanceMeters = Math.round(osrmData.routes[0].distance);
          durationSeconds = Math.round(osrmData.routes[0].duration);
          source = 'osrm-engine';
        }
      }
    } catch {
      // Ignorar, fallback geodésico continuará
    }

    if (distanceMeters === 0) {
      const straightMeters = haversineDistanceMeters(oLat, oLon, dLat, dLon);
      distanceMeters = Math.round(straightMeters * 1.28);
      durationSeconds = Math.max(60, Math.round(distanceMeters / 6.94));
    }

    const distanceKm = +(distanceMeters / 1000).toFixed(2);
    const etaMinutes = Math.max(1, Math.round(durationSeconds / 60));

    // 3. Tarificación dinámica
    const tarifaBase = parseFloat(selectedZone.tarifa_base);
    const costoKmAdic = parseFloat(selectedZone.costo_km_adicional);
    const distanciaBaseKm = 2.0; // Los primeros 2 km incluidos en tarifa base
    const kmExtra = Math.max(0, +(distanceKm - distanciaBaseKm).toFixed(2));
    const subtotalDistancia = +(kmExtra * costoKmAdic).toFixed(2);

    // Recargos
    const horaActualEcuador = (new Date().getUTCHours() - 5 + 24) % 24; // UTC-5 hora continental Ecuador
    const esNocturno = isNight === true || horaActualEcuador >= 20 || horaActualEcuador < 6;
    const recargoNocturno = esNocturno ? 0.50 : 0.00;
    const recargoClima = isRain === true ? 0.75 : 0.00;

    const tarifaFinal = +(tarifaBase + subtotalDistancia + recargoNocturno + recargoClima).toFixed(2);

    res.json({
      success: true,
      coberturaValida: true,
      source,
      zona: {
        id: selectedZone.id,
        nombre: selectedZone.nombre,
        codigo: selectedZone.codigo,
        canton: selectedZone.canton,
      },
      distanciaMetros: distanceMeters,
      distanciaKm: distanceKm,
      duracionSegundos: durationSeconds,
      etaMinutos: etaMinutes,
      desgloseTarifa: {
        tarifaBase,
        distanciaBaseKm,
        kmExtra,
        costoKmAdicional: costoKmAdic,
        subtotalDistancia,
        recargoNocturno,
        recargoClima,
        tarifaFinal,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 7. Catálogo de Geocodificación y Autocompletado Local de Los Ríos (Montalvo, Baba, Babahoyo)
interface GeoLocationEntry {
  id: string;
  direccion: string;
  barrio: string;
  canton: 'baba' | 'babahoyo' | 'montalvo';
  lat: number;
  lon: number;
  referencia: string;
  tipo: 'parque' | 'calle' | 'salud' | 'comercial' | 'institucional' | 'residencial';
}

const LOS_RIOS_GEOCODING_CATALOG: GeoLocationEntry[] = [
  // MONTALVO
  {
    id: 'geo-mtv-01',
    direccion: 'Av. 25 de Abril y 10 de Agosto',
    barrio: 'Centro',
    canton: 'montalvo',
    lat: -1.7905,
    lon: -79.2880,
    referencia: 'Frente al Parque Central y GAD Municipal de Montalvo',
    tipo: 'parque',
  },
  {
    id: 'geo-mtv-02',
    direccion: 'Malecón del Río Cristal y 25 de Abril',
    barrio: 'Río Cristal',
    canton: 'montalvo',
    lat: -1.7918,
    lon: -79.2895,
    referencia: 'Balneario de agua dulce y zona turística gastronómica',
    tipo: 'comercial',
  },
  {
    id: 'geo-mtv-03',
    direccion: 'Calle 10 de Agosto y Babahoyo',
    barrio: 'Salud',
    canton: 'montalvo',
    lat: -1.7912,
    lon: -79.2875,
    referencia: 'Frente al Subcentro de Salud de Montalvo',
    tipo: 'salud',
  },
  {
    id: 'geo-mtv-04',
    direccion: 'Calle Babahoyo y Av. 25 de Abril',
    barrio: 'Comercial',
    canton: 'montalvo',
    lat: -1.7898,
    lon: -79.2865,
    referencia: 'Mercado Municipal y Supermercado San Vicente',
    tipo: 'comercial',
  },
  {
    id: 'geo-mtv-05',
    direccion: 'Cdla. Bellavista, Calle Los Laureles',
    barrio: 'Bellavista',
    canton: 'montalvo',
    lat: -1.7940,
    lon: -79.2850,
    referencia: 'Junto a la cancha sintética de Montalvo',
    tipo: 'residencial',
  },
  {
    id: 'geo-mtv-06',
    direccion: 'Vía Montalvo - Caluma Km 1',
    barrio: 'Periferia',
    canton: 'montalvo',
    lat: -1.7850,
    lon: -79.2820,
    referencia: 'Control Policial y paradero interprovincial',
    tipo: 'institucional',
  },
  {
    id: 'geo-mtv-07',
    direccion: 'Cdla. Las Mercedes, Calle Principal',
    barrio: 'Las Mercedes',
    canton: 'montalvo',
    lat: -1.7930,
    lon: -79.2910,
    referencia: 'Entrada por la Capilla San José',
    tipo: 'residencial',
  },

  // BABA
  {
    id: 'geo-baba-01',
    direccion: 'Av. Guayaquil y Sucre',
    barrio: 'Centro',
    canton: 'baba',
    lat: -1.7917,
    lon: -79.6783,
    referencia: 'Parque Central 23 de Junio y Municipio de Baba',
    tipo: 'parque',
  },
  {
    id: 'geo-baba-02',
    direccion: 'Calle Bolívar y Sucre',
    barrio: 'San Antonio',
    canton: 'baba',
    lat: -1.7940,
    lon: -79.6810,
    referencia: 'Frente a Picantería El Buen Sabor',
    tipo: 'residencial',
  },
  {
    id: 'geo-baba-03',
    direccion: 'Av. Guayaquil y Calle 10 de Agosto',
    barrio: 'Centro Sur',
    canton: 'baba',
    lat: -1.7895,
    lon: -79.6765,
    referencia: 'Junto al Hospital Básico de Baba',
    tipo: 'salud',
  },
  {
    id: 'geo-baba-04',
    direccion: 'Cdla. 23 de Junio, Mz. 14 Villa 5',
    barrio: 'La Nobleza',
    canton: 'baba',
    lat: -1.7960,
    lon: -79.6830,
    referencia: 'Sector residencial La Nobleza de Baba',
    tipo: 'residencial',
  },
  {
    id: 'geo-baba-05',
    direccion: 'Malecón del Río Baba y Rocafuerte',
    barrio: 'Riberas del Río',
    canton: 'baba',
    lat: -1.7910,
    lon: -79.6800,
    referencia: 'Paseo fluvial y muelle artesanal',
    tipo: 'comercial',
  },
  {
    id: 'geo-baba-06',
    direccion: 'Vía Baba - Guare Km 2',
    barrio: 'Sector Guare',
    canton: 'baba',
    lat: -1.7850,
    lon: -79.6720,
    referencia: 'Sector agropecuario y recintos de Baba',
    tipo: 'residencial',
  },

  // BABAHOYO
  {
    id: 'geo-bby-01',
    direccion: 'Malecón 9 de Octubre y Flores',
    barrio: 'Malecón',
    canton: 'babahoyo',
    lat: -1.8020,
    lon: -79.5340,
    referencia: 'Paseo del Malecón junto al Río Babahoyo',
    tipo: 'comercial',
  },
  {
    id: 'geo-bby-02',
    direccion: 'Calle 10 de Agosto y Pedro Carbo',
    barrio: 'Centro',
    canton: 'babahoyo',
    lat: -1.8015,
    lon: -79.5350,
    referencia: 'Frente al Parque Central 24 de Mayo y Catedral',
    tipo: 'parque',
  },
  {
    id: 'geo-bby-03',
    direccion: 'Av. Universitaria y E25',
    barrio: 'Terminal',
    canton: 'babahoyo',
    lat: -1.8150,
    lon: -79.5280,
    referencia: 'Terminal Terrestre de Babahoyo',
    tipo: 'institucional',
  },
  {
    id: 'geo-bby-04',
    direccion: 'Av. 5 de Junio y General Barona',
    barrio: 'Hospitalario',
    canton: 'babahoyo',
    lat: -1.8055,
    lon: -79.5320,
    referencia: 'Hospital General Martín Icaza',
    tipo: 'salud',
  },
  {
    id: 'geo-bby-05',
    direccion: 'Cdla. El Chorrillo, Av. Universitaria',
    barrio: 'El Chorrillo',
    canton: 'babahoyo',
    lat: -1.8180,
    lon: -79.5250,
    referencia: 'Campus Universidad Técnica de Babahoyo (UTB)',
    tipo: 'institucional',
  },
  {
    id: 'geo-bby-06',
    direccion: 'Cdla. Puerta Negra, Calle Los Álamos',
    barrio: 'Puerta Negra',
    canton: 'babahoyo',
    lat: -1.8080,
    lon: -79.5420,
    referencia: 'Sector residencial Puerta Negra',
    tipo: 'residencial',
  },
];

// Búsqueda y Autocompletado de Calles / Referencias
trackingRouter.get('/geocoding/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const canton = (req.query.canton as string || '').toLowerCase().trim();

  let results = LOS_RIOS_GEOCODING_CATALOG;

  if (canton && ['baba', 'babahoyo', 'montalvo'].includes(canton)) {
    results = results.filter(item => item.canton === canton);
  }

  if (query) {
    results = results.filter(item =>
      item.direccion.toLowerCase().includes(query) ||
      item.barrio.toLowerCase().includes(query) ||
      item.referencia.toLowerCase().includes(query) ||
      item.canton.toLowerCase().includes(query)
    );
  }

  res.json({
    success: true,
    total: results.length,
    data: results,
  });
});

// Geocodificación Inversa (De Coordenadas a Dirección más Cercana)
trackingRouter.get('/geocoding/reverse', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, message: 'Coordenadas lat y lon son requeridas y numéricas' });
  }

  let closest: GeoLocationEntry | null = null;
  let minDistance = Infinity;

  for (const entry of LOS_RIOS_GEOCODING_CATALOG) {
    const dist = haversineDistanceMeters(lat, lon, entry.lat, entry.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = entry;
    }
  }

  res.json({
    success: true,
    distanciaMetros: Math.round(minDistance),
    data: closest,
  });
});


