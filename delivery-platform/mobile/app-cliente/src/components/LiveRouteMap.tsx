import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import Svg, { Rect, Line, Circle, Polyline, Text as SvgText, G } from 'react-native-svg';
import { Navigation, ExternalLink, Plus, Minus, MapPin, Store, Truck } from 'lucide-react-native';

export interface RoutePoint {
  lat: number;
  lon: number;
  name?: string;
}

export interface CourierRoutePoint extends RoutePoint {
  speed?: number;
  heading?: number;
}

export interface LiveRouteMapProps {
  origin: RoutePoint;
  destination: RoutePoint;
  courier?: CourierRoutePoint;
  routeCoordinates?: Array<[number, number]>;
  distanceMeters?: number;
  etaMinutes?: number;
  height?: number;
}

export function LiveRouteMap({
  origin,
  destination,
  courier,
  routeCoordinates,
  distanceMeters = 500,
  etaMinutes = 5,
  height = 220,
}: LiveRouteMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  // Coordenadas de los puntos clave
  const points = [
    origin,
    destination,
    ...(courier ? [courier] : []),
  ];

  // Cálculo de caja de delimitación geográfica (Bounding Box)
  const lats = points.map(p => p.lat);
  const lons = points.map(p => p.lon);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Margen de padding geográfico para asegurar visibilidad de marcadores
  const latDelta = Math.max(0.002, (maxLat - minLat) * 1.4);
  const lonDelta = Math.max(0.002, (maxLon - minLon) * 1.4);

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const currentLatDelta = latDelta / zoomLevel;
  const currentLonDelta = lonDelta / zoomLevel;

  const boundsMinLat = centerLat - currentLatDelta / 2;
  const boundsMaxLat = centerLat + currentLatDelta / 2;
  const boundsMinLon = centerLon - currentLonDelta / 2;
  const boundsMaxLon = centerLon + currentLonDelta / 2;

  // Proyección de Coordenadas Geográficas a Espacio SVG (360x200)
  const project = (lat: number, lon: number): { x: number; y: number } => {
    const x = ((lon - boundsMinLon) / (boundsMaxLon - boundsMinLon)) * 340 + 10;
    // La latitud en SVG es invertida (Y crece hacia abajo)
    const y = ((boundsMaxLat - lat) / (boundsMaxLat - boundsMinLat)) * 170 + 15;
    return {
      x: Math.max(10, Math.min(350, Math.round(x))),
      y: Math.max(15, Math.min(185, Math.round(y))),
    };
  };

  const originPos = project(origin.lat, origin.lon);
  const destPos = project(destination.lat, destination.lon);
  const courierPos = courier ? project(courier.lat, courier.lon) : null;

  // Polilínea de ruta
  let polylinePoints = '';
  if (routeCoordinates && routeCoordinates.length > 1) {
    polylinePoints = routeCoordinates
      .map(([coordLat, coordLon]) => {
        const pt = project(coordLat, coordLon);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
  } else {
    // Ruta directa en 2 tramos si no hay waypoints OSRM
    if (courierPos) {
      polylinePoints = `${originPos.x},${originPos.y} ${courierPos.x},${courierPos.y} ${destPos.x},${destPos.y}`;
    } else {
      polylinePoints = `${originPos.x},${originPos.y} ${destPos.x},${destPos.y}`;
    }
  }

  // Navegación Externa en 1 Toque
  const handleOpenGoogleMaps = () => {
    const targetLat = courier?.lat ?? destination.lat;
    const targetLon = courier?.lon ?? destination.lon;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLon}`).catch(() => {});
  };

  const handleOpenWaze = () => {
    const targetLat = courier?.lat ?? destination.lat;
    const targetLon = courier?.lon ?? destination.lon;
    Linking.openURL(`https://waze.com/ul?ll=${targetLat},${targetLon}&navigate=yes`).catch(() => {});
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Cabecera del Mapa */}
      <View style={styles.topBar}>
        <View style={styles.etaBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.etaText}>
            Llega en ~{etaMinutes} min · {distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`}
          </Text>
        </View>

        {/* Controles de Zoom */}
        <View style={styles.zoomControls}>
          <Pressable
            style={styles.zoomBtn}
            onPress={() => setZoomLevel(z => Math.min(2.5, Number((z + 0.3).toFixed(1))))}
          >
            <Plus size={14} color="#0f172a" />
          </Pressable>
          <Pressable
            style={styles.zoomBtn}
            onPress={() => setZoomLevel(z => Math.max(0.7, Number((z - 0.3).toFixed(1))))}
          >
            <Minus size={14} color="#0f172a" />
          </Pressable>
        </View>
      </View>

      {/* Lienzo SVG Vectorial */}
      <View style={styles.mapCanvas}>
        <Svg height="100%" width="100%" viewBox="0 0 360 200">
          {/* Fondo estilo cartografía nocturna con cuadrícula vial */}
          <Rect x="0" y="0" width="360" height="200" rx="14" fill="#0f172a" />
          <Line x1="0" y1="50" x2="360" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="5,5" />
          <Line x1="0" y1="100" x2="360" y2="100" stroke="#1e293b" strokeWidth="1" strokeDasharray="5,5" />
          <Line x1="0" y1="150" x2="360" y2="150" stroke="#1e293b" strokeWidth="1" strokeDasharray="5,5" />
          <Line x1="120" y1="0" x2="120" y2="200" stroke="#1e293b" strokeWidth="1" strokeDasharray="5,5" />
          <Line x1="240" y1="0" x2="240" y2="200" stroke="#1e293b" strokeWidth="1" strokeDasharray="5,5" />

          {/* Sombra de la ruta */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke="rgba(16, 185, 129, 0.2)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trazo Principal de la Ruta */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Marcador 1: Comercio / Origen */}
          <G>
            <Circle cx={originPos.x} cy={originPos.y} r="14" fill="#f97316" opacity="0.25" />
            <Circle cx={originPos.x} cy={originPos.y} r="7" fill="#f97316" />
            <SvgText
              x={originPos.x}
              y={originPos.y > 30 ? originPos.y - 12 : originPos.y + 20}
              fill="#fdba74"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              🏬 {origin.name ? origin.name.slice(0, 16) : 'Local'}
            </SvgText>
          </G>

          {/* Marcador 2: Destino / Cliente */}
          <G>
            <Circle cx={destPos.x} cy={destPos.y} r="14" fill="#38bdf8" opacity="0.25" />
            <Circle cx={destPos.x} cy={destPos.y} r="7" fill="#38bdf8" />
            <SvgText
              x={destPos.x}
              y={destPos.y > 30 ? destPos.y - 12 : destPos.y + 20}
              fill="#7dd3fc"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              🏠 Entrega
            </SvgText>
          </G>

          {/* Marcador 3: Motorizado en Movimiento con Halo Radar */}
          {courierPos && (
            <G>
              <Circle cx={courierPos.x} cy={courierPos.y} r="18" fill="#10b981" opacity="0.2" />
              <Circle cx={courierPos.x} cy={courierPos.y} r="11" fill="#10b981" opacity="0.4" />
              <Circle cx={courierPos.x} cy={courierPos.y} r="6" fill="#34d399" />
              <SvgText
                x={courierPos.x}
                y={courierPos.y > 35 ? courierPos.y - 14 : courierPos.y + 22}
                fill="#6ee7b7"
                fontSize="10"
                fontWeight="900"
                textAnchor="middle"
              >
                🛵 {courier?.name || 'Repartidor'}
              </SvgText>
            </G>
          )}
        </Svg>
      </View>

      {/* Barra de Acciones Externas */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.navExternalBtn} onPress={handleOpenGoogleMaps}>
          <Navigation size={13} color="#0284c7" />
          <Text style={styles.navExternalText}>Google Maps</Text>
        </Pressable>

        <Pressable style={styles.navExternalBtn} onPress={handleOpenWaze}>
          <ExternalLink size={13} color="#0284c7" />
          <Text style={styles.navExternalText}>Waze ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  etaText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '800',
  },
  zoomControls: {
    flexDirection: 'row',
    gap: 4,
  },
  zoomBtn: {
    backgroundColor: '#f1f5f9',
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCanvas: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  navExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  navExternalText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
  },
});
