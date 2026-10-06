import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { Line, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import {
  Store,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  X,
  AlertTriangle,
  FileText,
  DollarSign,
  Truck,
  ExternalLink,
  ShieldAlert,
  ShoppingBag,
  UtensilsCrossed,
  Pill,
  Wine,
  Zap,
} from 'lucide-react-native';
import { BackendOrder } from '../services/ordersApi';
import { NavigationLauncher } from '../services/navigationLauncher';

/**
 * Distancia Haversine vial con curvatura terrestre y factor de red vial urbano/rural en Los Ríos (1.28x)
 */
export function calculateRoadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2 || isNaN(Number(lat1)) || isNaN(Number(lon1)) || isNaN(Number(lat2)) || isNaN(Number(lon2))) {
    return 0.5;
  }
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straight = R * c;
  const roadKm = Math.round(straight * 1.28 * 10) / 10;
  // Nunca marcar 0.0 km: mínimo operativo de 0.2 km incluso si el repartidor está en el mismo punto de cocina
  return Math.max(0.2, roadKm);
}

export function calculateEtaMinutes(distKm: number): number {
  if (distKm <= 0.3) return 1;
  return Math.max(1, Math.round((distKm / 25) * 60));
}

interface OrderOfferModalProps {
  visible: boolean;
  order: BackendOrder | null;
  driverLat?: number;
  driverLon?: number;
  apiBaseUrl?: string;
  onAccept: (order: BackendOrder) => void;
  onReject: (order: BackendOrder) => void;
  onClose: () => void;
}

export function OrderOfferModal({
  visible,
  order,
  driverLat,
  driverLon,
  apiBaseUrl,
  onAccept,
  onReject,
  onClose,
}: OrderOfferModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [distRecogidaKm, setDistRecogidaKm] = useState<number>(0.8);
  const [distEntregaKm, setDistEntregaKm] = useState<number>(1.8);
  const [etaRecogidaMin, setEtaRecogidaMin] = useState<number>(3);
  const [etaEntregaMin, setEtaEntregaMin] = useState<number>(7);
  const [isOsrmVerified, setIsOsrmVerified] = useState<boolean>(false);

  useEffect(() => {
    if (!visible || !order) return;
    setSecondsLeft(30);
    setIsOsrmVerified(false);

    // 1. Cálculo geodésico vial inmediato de alta precisión
    const cLat = Number(order.comercio_lat);
    const cLon = Number(order.comercio_lon);
    const eLat = Number(order.lat_entrega);
    const eLon = Number(order.lon_entrega);
    const dLat = driverLat !== undefined && !isNaN(Number(driverLat)) ? Number(driverLat) : -1.7925;
    const dLon = driverLon !== undefined && !isNaN(Number(driverLon)) ? Number(driverLon) : -79.6790;

    let initD1 = 0.5;
    if (dLat && dLon && cLat && cLon) {
      initD1 = calculateRoadDistanceKm(dLat, dLon, cLat, cLon);
    } else if (order.distancia_al_comercio_km !== undefined && order.distancia_al_comercio_km !== null) {
      initD1 = Math.max(0.2, Number(order.distancia_al_comercio_km) || 0.5);
    }

    let initD2 = 0.8;
    if (cLat && cLon && eLat && eLon) {
      initD2 = calculateRoadDistanceKm(cLat, cLon, eLat, eLon);
    } else if (order.distancia_entrega_km !== undefined && order.distancia_entrega_km !== null) {
      initD2 = Math.max(0.3, Number(order.distancia_entrega_km) || 0.8);
    }

    setDistRecogidaKm(initD1);
    setEtaRecogidaMin(calculateEtaMinutes(initD1));
    setDistEntregaKm(initD2);
    setEtaEntregaMin(calculateEtaMinutes(initD2));

    // 2. Consulta asíncrona al motor OSRM para precisión milimétrica de calles
    if (apiBaseUrl) {
      const cleanApi = apiBaseUrl.replace(/\/$/, '');
      const p1 = (dLat && dLon && cLat && cLon)
        ? fetch(`${cleanApi}/tracking/route?originLat=${dLat}&originLon=${dLon}&destLat=${cLat}&destLon=${cLon}`)
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null);

      const p2 = (cLat && cLon && eLat && eLon)
        ? fetch(`${cleanApi}/tracking/route?originLat=${cLat}&originLon=${cLon}&destLat=${eLat}&destLon=${eLon}`)
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null);

      Promise.all([p1, p2]).then(([r1, r2]) => {
        let verified = false;
        if (r1 && r1.success && r1.distanceMeters !== undefined) {
          const rawKm1 = r1.distanceMeters / 1000;
          const k1 = Math.max(0.2, Math.round(rawKm1 * 10) / 10);
          setDistRecogidaKm(k1);
          setEtaRecogidaMin(Math.max(1, r1.etaMinutes || calculateEtaMinutes(k1)));
          verified = true;
        }
        if (r2 && r2.success && r2.distanceMeters !== undefined) {
          const rawKm2 = r2.distanceMeters / 1000;
          const k2 = Math.max(0.3, Math.round(rawKm2 * 10) / 10);
          setDistEntregaKm(k2);
          setEtaEntregaMin(Math.max(2, r2.etaMinutes || calculateEtaMinutes(k2)));
          verified = true;
        }
        if (verified) {
          setIsOsrmVerified(true);
        }
      });
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReject(order);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, order, driverLat, driverLon, apiBaseUrl]);

  if (!order) return null;

  const safeRecogida = Math.max(0.2, distRecogidaKm);
  const safeEntrega = Math.max(0.3, distEntregaKm);
  const distanciaRecogida = safeRecogida.toFixed(1);
  const distanciaEntrega = safeEntrega.toFixed(1);
  const distanciaTotal = (safeRecogida + safeEntrega).toFixed(1);
  const etaRecogida = etaRecogidaMin;
  const etaEntrega = etaEntregaMin;
  const etaTotal = etaRecogida + etaEntrega;
  const ganancia = Number(order.ganancia_repartidor || 1.5).toFixed(2);
  const total = Number(order.total || 0).toFixed(2);

  // Vertical metadata
  const vertical = order.tipo_comercio_id || 'restaurante';

  const getVerticalHeader = () => {
    switch (vertical) {
      case 'supermercado':
        return {
          icon: ShoppingBag,
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.15)',
          label: 'Supermercado & Abarrotes',
        };
      case 'farmacia':
        return {
          icon: Pill,
          color: '#ec4899',
          bg: 'rgba(236, 72, 153, 0.15)',
          label: 'Farmacia & Salud ARCSA',
        };
      case 'licorera':
        return {
          icon: Wine,
          color: '#a855f7',
          bg: 'rgba(168, 85, 247, 0.15)',
          label: 'Licores (+18 Años)',
        };
      case 'express':
        return {
          icon: Zap,
          color: '#eab308',
          bg: 'rgba(234, 179, 8, 0.15)',
          label: 'Tienda Express & Carga',
        };
      default:
        return {
          icon: UtensilsCrossed,
          color: '#f97316',
          bg: 'rgba(249, 115, 22, 0.15)',
          label: 'Restaurante & Gastronomía',
        };
    }
  };

  const vInfo = getVerticalHeader();
  const VerticalIcon = vInfo.icon;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header con Timer de 30 segundos */}
          <View style={styles.headerBar}>
            <View style={[styles.verticalBadge, { backgroundColor: vInfo.bg, flex: 1, minWidth: 0, marginRight: 8 }]}>
              <VerticalIcon size={16} color={vInfo.color} />
              <Text style={[styles.verticalBadgeText, { color: vInfo.color, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                {vInfo.label}
              </Text>
            </View>

            <View style={[styles.timerBadge, { flexShrink: 0 }]}>
              <Clock size={14} color="#f59e0b" />
              <Text style={styles.timerText}>{secondsLeft}s</Text>
            </View>

            <Pressable onPress={onClose} style={[styles.closeBtn, { flexShrink: 0, marginLeft: 6 }]}>
              <X size={18} color="#94a3b8" />
            </Pressable>
          </View>

          {/* Barra de progreso de tiempo regresivo */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(secondsLeft / 30) * 100}%` },
              ]}
            />
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Tarjeta de Ganancia Destacada */}
            <View style={styles.earningCard}>
              <View>
                <Text style={styles.earningSub}>GANANCIA NETA PARA TI</Text>
                <Text style={styles.earningAmount}>+${ganancia}</Text>
              </View>
              <View style={styles.tripSummaryPill}>
                <Truck size={16} color="#10b981" />
                <Text style={styles.tripSummaryText}>{distanciaTotal} km · ~{etaTotal} min</Text>
              </View>
            </View>

            {/* Mapa Vectorial SVG de 2 Tramos */}
            <View style={styles.mapCard}>
              <Text style={styles.mapTitle}>🗺️ RUTA DE REPARTO EN 2 TRAMOS</Text>

              <View style={styles.svgWrapper}>
                <Svg height="140" width="100%" viewBox="0 0 320 140">
                  {/* Fondo estilo radar nocturno */}
                  <Rect x="0" y="0" width="320" height="140" rx="12" fill="#0f172a" />
                  
                  {/* Cuadrícula sutil */}
                  <Line x1="0" y1="45" x2="320" y2="45" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                  <Line x1="0" y1="95" x2="320" y2="95" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                  <Line x1="110" y1="0" x2="110" y2="140" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                  <Line x1="210" y1="0" x2="210" y2="140" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />

                  {/* Tramo 1: Rider -> Local (Cian punteado) */}
                  <Line
                    x1="40"
                    y1="90"
                    x2="155"
                    y2="45"
                    stroke="#06b6d4"
                    strokeWidth="3.5"
                    strokeDasharray="6,4"
                  />

                  {/* Tramo 2: Local -> Cliente (Esmeralda continuo) */}
                  <Line
                    x1="155"
                    y1="45"
                    x2="280"
                    y2="95"
                    stroke="#10b981"
                    strokeWidth="4"
                  />

                  {/* Punto 1: Rider (Tú) */}
                  <Circle cx="40" cy="90" r="14" fill="#06b6d4" opacity="0.25" />
                  <Circle cx="40" cy="90" r="8" fill="#06b6d4" />
                  <SvgText x="40" y="122" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                    Tú ({distanciaRecogida} km)
                  </SvgText>

                  {/* Punto 2: Comercio */}
                  <Circle cx="155" cy="45" r="16" fill="#f97316" opacity="0.25" />
                  <Circle cx="155" cy="45" r="9" fill="#f97316" />
                  <SvgText x="155" y="24" fill="#fdba74" fontSize="10" fontWeight="bold" textAnchor="middle">
                    Local Recogida
                  </SvgText>

                  {/* Punto 3: Cliente */}
                  <Circle cx="280" cy="95" r="14" fill="#10b981" opacity="0.25" />
                  <Circle cx="280" cy="95" r="8" fill="#10b981" />
                  <SvgText x="280" y="122" fill="#6ee7b7" fontSize="10" fontWeight="bold" textAnchor="middle">
                    Entrega ({distanciaEntrega} km)
                  </SvgText>
                </Svg>
              </View>

              {/* Botones de Navegación Externa */}
              <View style={styles.mapActionRow}>
                <Pressable
                  style={styles.navExternalBtn}
                  onPress={() => NavigationLauncher.abrirGoogleMaps(order.comercio_lat, order.comercio_lon)}
                >
                  <Navigation size={14} color="#38bdf8" />
                  <Text style={styles.navExternalText}>Ver Local en Google Maps</Text>
                </Pressable>
                <Pressable
                  style={styles.navExternalBtn}
                  onPress={() => NavigationLauncher.abrirWaze(order.comercio_lat, order.comercio_lon)}
                >
                  <ExternalLink size={14} color="#38bdf8" />
                  <Text style={styles.navExternalText}>Waze</Text>
                </Pressable>
              </View>
            </View>

            {/* Detalles de Tramo 1 y 2 */}
            <View style={styles.legsCard}>
              <View style={styles.legItem}>
                <View style={[styles.legDot, { backgroundColor: '#06b6d4' }]} />
                <View style={styles.legTextWrap}>
                  <Text style={styles.legTitle}>Paso 1: Recoger en {order.comercio_nombre}</Text>
                  <Text style={styles.legSubtitle}>{order.comercio_direccion || 'Centro de la ciudad'}</Text>
                  <Text style={styles.legMetric}>🛵 {distanciaRecogida} km de tu ubicación · ~{etaRecogida} min</Text>
                </View>
              </View>

              <View style={styles.legDivider} />

              <View style={styles.legItem}>
                <View style={[styles.legDot, { backgroundColor: '#10b981' }]} />
                <View style={styles.legTextWrap}>
                  <Text style={styles.legTitle}>Paso 2: Entregar a {order.cliente_nombre}</Text>
                  <Text style={styles.legSubtitle}>{order.direccion_entrega}</Text>
                  <Text style={styles.legMetric}>🏁 {distanciaEntrega} km desde el local · ~{etaEntrega} min</Text>
                </View>
              </View>
            </View>

            {/* Aviso Operativo de la Vertical */}
            <View style={styles.verticalAlertBox}>
              {vertical === 'restaurante' && (
                <View style={styles.verticalRow}>
                  <UtensilsCrossed size={18} color="#f97316" />
                  <Text style={styles.verticalAlertText}>
                    🍳 <Text style={styles.boldText}>Comida Caliente:</Text> Mantén la mochila térmica nivelada. Cuidado especial con sopas y jugos.
                  </Text>
                </View>
              )}

              {vertical === 'supermercado' && (
                <View style={styles.verticalRow}>
                  <ShoppingBag size={18} color="#38bdf8" />
                  <Text style={styles.verticalAlertText}>
                    🛒 <Text style={styles.boldText}>Supermercado / Abarrotes:</Text> {order.numero_bultos || 1} fundas empaquetadas. Sustitución elegida: {order.preferencia_sustitucion || 'Llamar al cliente'}.
                  </Text>
                </View>
              )}

              {vertical === 'farmacia' && (
                <View style={styles.verticalRow}>
                  <Pill size={18} color="#ec4899" />
                  <Text style={styles.verticalAlertText}>
                    💊 <Text style={styles.boldText}>Farmacia ARCSA:</Text> {order.pedido_requiere_receta ? '⚠️ Requiere validar receta física del cliente antes de entregar.' : 'Medicamentos sellados de venta libre.'}
                  </Text>
                </View>
              )}

              {vertical === 'licorera' && (
                <View style={styles.verticalRow}>
                  <Wine size={18} color="#a855f7" />
                  <Text style={styles.verticalAlertText}>
                    🔞 <Text style={styles.boldText}>Control +18 Años:</Text> Exigir presentación de cédula de identidad física obligatoria al entregar al cliente.
                  </Text>
                </View>
              )}

              {vertical === 'express' && (
                <View style={styles.verticalRow}>
                  <Zap size={18} color="#eab308" />
                  <Text style={styles.verticalAlertText}>
                    ⚡ <Text style={styles.boldText}>Entrega Express:</Text> Servicio de alta prioridad y despacho ágil.
                  </Text>
                </View>
              )}
            </View>

            {/* Método de Pago y Cobro */}
            <View style={[styles.paymentCard, order.metodo_pago === 'efectivo' ? styles.paymentCash : styles.paymentDigital]}>
              <View style={styles.paymentRow}>
                <DollarSign size={20} color={order.metodo_pago === 'efectivo' ? '#f59e0b' : '#10b981'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>
                    {order.metodo_pago === 'efectivo'
                      ? `💵 Cobrar en Efectivo: $${total}`
                      : '💳 Pagado Digital / Transferencia'}
                  </Text>
                  <Text style={styles.paymentDesc}>
                    {order.metodo_pago === 'efectivo'
                      ? 'Debes cobrar el monto total al cliente y dar el cambio respectivo.'
                      : 'No debes cobrar nada al cliente en el domicilio.'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Lista de Ítems */}
            {order.items && order.items.length > 0 && (
              <View style={styles.itemsCard}>
                <Text style={styles.itemsTitle}>📦 CONTENIDO DEL PEDIDO ({order.items.length} productos)</Text>
                {order.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemQty}>{item.cantidad}x</Text>
                    <Text style={styles.itemName}>{item.producto}</Text>
                    <Text style={styles.itemPrice}>${(item.cantidad * item.precio_unitario).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            {order.notas ? (
              <View style={styles.notesCard}>
                <Text style={styles.notesTitle}>📝 NOTAS DEL CLIENTE:</Text>
                <Text style={styles.notesText}>{order.notas}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer con Botones de Decisión */}
          <View style={styles.footerRow}>
            <Pressable style={styles.rejectBtn} onPress={() => onReject(order)}>
              <X size={18} color="#ef4444" />
              <Text style={styles.rejectBtnText}>Rechazar</Text>
            </Pressable>

            <Pressable style={styles.acceptBtn} onPress={() => onAccept(order)}>
              <Truck size={20} color="#042f2e" />
              <Text style={styles.acceptBtnText}>ACEPTAR PEDIDO</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#334155',
    display: 'flex',
    flexDirection: 'column',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  verticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  verticalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  timerText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#1e293b',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#1e293b',
    width: '100%',
    marginBottom: 10,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#f59e0b',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  earningCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 14,
  },
  earningSub: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  earningAmount: {
    color: '#10b981',
    fontSize: 28,
    fontWeight: '900',
  },
  tripSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tripSummaryText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '700',
  },
  mapCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  mapTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mapActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  navExternalBtn: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
  },
  navExternalText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  legsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  legItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  legDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  legTextWrap: {
    flex: 1,
  },
  legTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  legSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  legMetric: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  legDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
    marginLeft: 24,
  },
  verticalAlertBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 14,
  },
  verticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verticalAlertText: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '800',
    color: '#f8fafc',
  },
  paymentCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  paymentCash: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  paymentDigital: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  paymentTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  itemsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  itemsTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemQty: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 13,
    width: 28,
  },
  itemName: {
    color: '#f8fafc',
    fontSize: 13,
    flex: 1,
  },
  itemPrice: {
    color: '#94a3b8',
    fontSize: 12,
  },
  notesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  notesTitle: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  notesText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  rejectBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  rejectBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 2,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
  },
  acceptBtnText: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
