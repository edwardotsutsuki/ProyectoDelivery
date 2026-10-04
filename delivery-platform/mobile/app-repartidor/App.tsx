import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Navigation,
  Compass,
  Phone,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Power,
  Package,
  TrendingUp,
  Wallet as WalletIcon,
  ChevronRight,
  ShieldCheck,
  Activity,
  User,
  Truck,
  ArrowRight,
  FileText,
  Store,
  Layers,
  Zap,
  X,
} from 'lucide-react-native';

import { NavigationLauncher } from './src/services/navigationLauncher';
import { initialShift, setAvailability, transition, RESTAURANT, type Action, type Status } from './src/courierModel';
import { dailyWallet, money, type Wallet } from './src/walletModel';
import { fetchWallet } from './src/services/walletApi';
import { TelemetryTransmitter } from './src/services/telemetryTransmitter';
import {
  fetchAvailableOrders,
  fetchActiveOrder,
  fetchOrderHistory,
  acceptOrder,
  deliverOrder,
  releaseOrder,
  rejectOffer,
  fetchDriversList,
  type BackendOrder,
  type DriverProfile,
} from './src/services/ordersApi';
import { OrderOfferModal } from './src/components/OrderOfferModal';

const DEFAULT_API = 'https://delivery-baba-api.loca.lt/api/v1';
const COURIER_ID = 'usr-repartidor-01';

type TabType = 'orders' | 'wallet' | 'history' | 'profile';

export default function App({ apiBaseUrl = DEFAULT_API }: { apiBaseUrl?: string }) {
  const [currentApi, setCurrentApi] = useState(apiBaseUrl);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [isOnline, setIsOnline] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);

  // Local shift model (preserved for backward compatibility and tests)
  const shiftRef = useRef(initialShift());
  const [localShift, setLocalShift] = useState(shiftRef.current);

  // Live Backend Orders
  const [activeOrder, setActiveOrder] = useState<BackendOrder | null>(null);
  const [orderStep, setOrderStep] = useState<'PICKUP' | 'DELIVERY'>('PICKUP'); // Paso dentro del pedido activo
  const [availableOrders, setAvailableOrders] = useState<BackendOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<BackendOrder[]>([]);
  const [includePending, setIncludePending] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Gestión de 10 Repartidores y Selector de Pruebas
  const [courierId, setCourierId] = useState(COURIER_ID);
  const [driversList, setDriversList] = useState<DriverProfile[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [isDriverSelectorOpen, setIsDriverSelectorOpen] = useState(false);

  // Modal de Oferta y Ruteo Pre-Aceptación (2 Tramos)
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<BackendOrder | null>(null);
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);

  // Wallet state
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [syncedWallet, setSyncedWallet] = useState<Date | null>(null);

  // General error banner
  const [errorMessage, setErrorMessage] = useState('');

  // Checklist for order pickup
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Telemetry Transmitter (WebSocket)
  const transmitter = useRef<TelemetryTransmitter | null>(null);

  // Cargar lista de los 10 repartidores para pruebas al iniciar
  useEffect(() => {
    fetchDriversList(currentApi)
      .then((drivers) => {
        setDriversList(drivers);
        if (drivers.length > 0) {
          const defaultDriver = drivers.find((d) => d.id === '33333333-3333-3333-3333-333333333333') || drivers[0];
          setSelectedDriver(defaultDriver);
          setCourierId(defaultDriver.id);
        }
      })
      .catch((err) => console.warn('Error fetching drivers list:', err));
  }, [currentApi]);

  // Initialize Telemetry
  useEffect(() => {
    const wsUrl = currentApi.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/ws');
    transmitter.current = new TelemetryTransmitter(wsUrl, courierId);
    if (isOnline) {
      transmitter.current.startOnlineTransmission();
    }
    return () => {
      transmitter.current?.stopTransmission();
    };
  }, [currentApi, courierId, isOnline]);

  // Turno Online/Offline effect
  useEffect(() => {
    setGpsReady(false);
    if (!isOnline) {
      transmitter.current?.stopTransmission();
      return;
    }
    transmitter.current?.startOnlineTransmission();
    const timer = setTimeout(() => setGpsReady(true), 1200);
    return () => clearTimeout(timer);
  }, [isOnline]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Update telemetry coordinates when active order changes
  useEffect(() => {
    if (activeOrder) {
      transmitter.current?.setActiveOrder(activeOrder.id);
      if (orderStep === 'PICKUP' && activeOrder.comercio_lat && activeOrder.comercio_lon) {
        transmitter.current?.setLocation(Number(activeOrder.comercio_lat), Number(activeOrder.comercio_lon));
      } else if (activeOrder.lat_entrega && activeOrder.lon_entrega) {
        transmitter.current?.setLocation(Number(activeOrder.lat_entrega), Number(activeOrder.lon_entrega));
      }
    } else {
      transmitter.current?.setActiveOrder(undefined);
      transmitter.current?.setLocation(-1.7925, -79.6790); // Baba Centro
    }
  }, [activeOrder, orderStep]);

  // Fetch Wallet Data
  const refreshWallet = useCallback(async () => {
    const controller = new AbortController();
    setWalletLoading(true);
    setWalletError('');
    try {
      const data = await fetchWallet(currentApi, controller.signal);
      setWallet(data);
      setSyncedWallet(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setWalletError(err.message || 'Error al consultar saldo de billetera.');
      }
    } finally {
      setWalletLoading(false);
    }
    return () => controller.abort();
  }, [currentApi]);

  // Fetch Available and Active Orders
  const refreshOrders = useCallback(async () => {
    if (!isOnline) return;
    setLoadingOrders(true);
    try {
      // 1. Consultar pedido activo del repartidor
      const active = await fetchActiveOrder(currentApi, courierId);
      setActiveOrder(active);

      // Si no hay activo, consultar disponibles pasando coordenadas del repartidor seleccionado
      if (!active) {
        const disponibles = await fetchAvailableOrders(
          currentApi,
          includePending,
          selectedDriver ? Number(selectedDriver.lat) : undefined,
          selectedDriver ? Number(selectedDriver.lon) : undefined,
          courierId
        );
        setAvailableOrders(disponibles);

        // Si hay una comanda de oferta prioritaria exclusiva y el modal no está abierto, abrirlo automáticamente
        const priorityOffer = disponibles.find((o) => o.es_oferta_prioritaria);
        if (priorityOffer && !isOfferModalVisible && !activeOrder) {
          setSelectedOrderForModal(priorityOffer);
          setIsOfferModalVisible(true);
        }
      } else {
        setAvailableOrders([]);
      }
      setErrorMessage('');
    } catch (err: any) {
      console.warn('Error polling orders:', err.message);
    } finally {
      setLoadingOrders(false);
    }
  }, [currentApi, isOnline, includePending, courierId, selectedDriver, isOfferModalVisible, activeOrder]);

  // Fetch History
  const refreshHistory = useCallback(async () => {
    try {
      const history = await fetchOrderHistory(currentApi, courierId);
      setOrderHistory(history);
    } catch (err: any) {
      console.warn('Error fetching history:', err.message);
    }
  }, [currentApi, courierId]);

  // Auto-polling when online
  useEffect(() => {
    if (isOnline) {
      refreshOrders();
      refreshWallet();
      const interval = setInterval(() => {
        refreshOrders();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [isOnline, refreshOrders, refreshWallet]);

  // Tab change triggers
  useEffect(() => {
    if (activeTab === 'wallet') refreshWallet();
    if (activeTab === 'history') refreshHistory();
    if (activeTab === 'orders' && isOnline) refreshOrders();
  }, [activeTab, isOnline, refreshWallet, refreshHistory, refreshOrders]);

  // Handle Online/Offline toggle
  function handleToggleAvailability(nextOnline: boolean) {
    if (!nextOnline && activeOrder) {
      Alert.alert(
        'Entrega en curso',
        'No puedes desconectarte mientras tienes un pedido activo en entrega.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    try {
      const updated = setAvailability(shiftRef.current, nextOnline);
      shiftRef.current = updated;
      setLocalShift(updated);
      setIsOnline(nextOnline);
      setErrorMessage('');
    } catch (cause: any) {
      setErrorMessage(cause.message || 'No se pudo cambiar el estado de turno.');
    }
  }

  // Abrir Modal de Oferta y Ruteo Pre-Aceptación
  function handleOpenOfferModal(order: BackendOrder) {
    setSelectedOrderForModal(order);
    setIsOfferModalVisible(true);
  }

  // Rechazar Oferta Previa (Libera la orden al Pool General)
  async function handleRejectOffer(order: BackendOrder) {
    try {
      await rejectOffer(currentApi, order.id);
      setAvailableOrders((prev) => prev.filter((o) => o.id !== order.id));
      setIsOfferModalVisible(false);
      setSelectedOrderForModal(null);
    } catch (err: any) {
      console.warn('Error rejecting offer:', err.message);
      setIsOfferModalVisible(false);
    }
  }

  // Aceptar desde el Modal de Oferta
  async function handleAcceptFromModal(order: BackendOrder) {
    setIsOfferModalVisible(false);
    setSelectedOrderForModal(null);
    await handleAcceptOrder(order);
  }

  // Handle Accepting Order
  async function handleAcceptOrder(order: BackendOrder) {
    if (!isOnline) {
      Alert.alert('Turno Pausado', 'Debes ponerte Online para aceptar pedidos.');
      return;
    }
    setActionLoading(true);
    setErrorMessage('');
    try {
      await acceptOrder(currentApi, order.id, courierId);
      setActiveOrder(order);
      setOrderStep('PICKUP');
      setCheckedItems({});
      setAvailableOrders((prev) => prev.filter((o) => o.id !== order.id));
      Alert.alert(
        '¡Pedido Asignado! 🛵',
        `Dirígete a ${order.comercio_nombre} para retirar el pedido #${order.id.slice(0, 8)}.`,
        [{ text: 'Ir a Recoger' }]
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo aceptar el pedido.');
      Alert.alert('Error', err.message || 'No se pudo aceptar el pedido.');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Confirming Pickup
  function handleConfirmPickup() {
    setOrderStep('DELIVERY');
    Alert.alert(
      '¡Comida Recogida! 🚀',
      `Iniciando viaje hacia el domicilio de ${activeOrder?.cliente_nombre || 'el cliente'}.`,
      [{ text: 'Comenzar Ruta' }]
    );
  }

  // Handle Confirming Delivery
  async function handleConfirmDelivery() {
    if (!activeOrder) return;
    const isEfectivo = activeOrder.metodo_pago === 'efectivo';
    const totalCobrar = Number(activeOrder.total || 0).toFixed(2);

    Alert.alert(
      '¿Confirmar Entrega?',
      isEfectivo
        ? `¿Cobraste los $${totalCobrar} en efectivo al cliente?\n\nAl confirmar, el pedido se marcará como entregado y se asentará en tu billetera.`
        : `¿El cliente recibió su pedido conforme?\n\nEste pedido fue pagado digitalmente. No se requiere cobrar dinero.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Confirmar Entrega',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deliverOrder(currentApi, activeOrder.id);
              Alert.alert(
                '¡Entrega Exitosa! 🎉',
                `Pedido #${activeOrder.id.slice(0, 8)} completado. Se han acreditado tus ganancias en la billetera.`
              );
              setActiveOrder(null);
              setOrderStep('PICKUP');
              setCheckedItems({});
              refreshOrders();
              refreshWallet();
              refreshHistory();
            } catch (err: any) {
              setErrorMessage(err.message || 'Error al marcar como entregado.');
              Alert.alert('Error', err.message || 'No se pudo confirmar la entrega.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  // Direct Phone Call
  function handleCallPhone(phone?: string) {
    if (!phone) {
      Alert.alert('Teléfono no disponible', 'El usuario no tiene registrado número de contacto.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de llamadas.');
    });
  }

  // Handle Driver Release Order (Breakdown / Emergency)
  function handleReleaseOrder() {
    if (!activeOrder) return;
    Alert.alert(
      'Liberar Pedido por Emergencia',
      '¿Deseas devolver este pedido a la cola de despacho? Quedará disponible al instante para que otro motorizado en Baba lo recoja.',
      [
        { text: 'Volver a la ruta', style: 'cancel' },
        {
          text: 'Sí, Liberar Pedido',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await releaseOrder(currentApi, activeOrder.id, 'Imprevisto de motorizado');
              Alert.alert('Pedido Liberado 🔄', 'El pedido fue devuelto al radar de despacho.');
              setActiveOrder(null);
              setOrderStep('PICKUP');
              setCheckedItems({});
              refreshOrders();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo liberar el pedido.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  // Handle Selecting One of the 10 Drivers
  function handleSelectDriver(driver: DriverProfile) {
    setSelectedDriver(driver);
    setCourierId(driver.id);
    setIsDriverSelectorOpen(false);
  }

  // Calculations for daily wallet
  const daily = wallet ? dailyWallet(wallet, now) : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        {/* Cabecera Principal / Driver Status Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable
              style={styles.driverInfo}
              onPress={() => setIsDriverSelectorOpen(true)}
            >
              <View style={styles.avatarPill}>
                <Truck color="#10b981" size={20} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.driverTitle}>
                    {selectedDriver ? selectedDriver.nombre : 'Moto Baba 01 🛵'}
                  </Text>
                  <View style={styles.badgeSelector}>
                    <Text style={styles.badgeSelectorText}>Cambiar (10)</Text>
                  </View>
                </View>
                <Text style={styles.driverLocation}>
                  {selectedDriver
                    ? `${selectedDriver.ciudad} · ${selectedDriver.tipo_vehiculo || 'Moto'} · ${selectedDriver.calificacion_promedio || '5.0'} ★`
                    : 'Cantón Baba · Los Ríos, Ecuador'}
                </Text>
              </View>
            </Pressable>

            {/* Switch Online/Offline con Radar Visual */}
            <View style={styles.switchWrapper}>
              <Text style={[styles.switchStatus, isOnline ? styles.statusOnline : styles.statusOffline]}>
                {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={handleToggleAvailability}
                trackColor={{ false: '#334155', true: '#059669' }}
                thumbColor={isOnline ? '#34d399' : '#94a3b8'}
              />
            </View>
          </View>

          {/* Sub-barra de Telemetría GPS */}
          <View style={styles.telemetryBar}>
            <View style={styles.telemetryItem}>
              <Activity size={13} color={isOnline ? '#10b981' : '#64748b'} />
              <Text style={styles.telemetryText}>
                {!isOnline ? 'GPS Inactivo (Fuera de turno)' : gpsReady ? '📡 GPS Baba Centro (-1.7925, -79.6790)' : 'Buscando satélites…'}
              </Text>
            </View>
            {isOnline && (
              <View style={styles.pulseBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.pulseText}>Radar Activo</Text>
              </View>
            )}
          </View>

          {/* Tarjetas HUD de Rendimiento Diario */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ganancia Hoy</Text>
              <Text style={styles.statValue}>{daily ? money(daily.netCents) : '$0.00'}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Entregas Hoy</Text>
              <Text style={styles.statValue}>
                {orderHistory.length || (daily ? daily.movements.filter(m => m.type === 'ingreso').length : 0)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Deuda Efectivo</Text>
              <Text style={[styles.statValue, { color: '#f87171' }]}>
                {daily ? money(daily.cashDebtCents) : '$0.00'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pestañas de Navegación Segmentada */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Compass size={16} color={activeTab === 'orders' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              {activeOrder ? 'Misión Activa' : 'Despacho'}
            </Text>
            {activeOrder && <View style={styles.tabBadge} />}
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'wallet' && styles.tabButtonActive]}
            onPress={() => setActiveTab('wallet')}
          >
            <WalletIcon size={16} color={activeTab === 'wallet' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>Billetera</Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <Clock size={16} color={activeTab === 'history' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Historial</Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
            onPress={() => setActiveTab('profile')}
          >
            <User size={16} color={activeTab === 'profile' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Perfil</Text>
          </Pressable>
        </View>

        {/* Banner de error general si existe */}
        {!!errorMessage && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={18} color="#fca5a5" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Contenido Principal con Scroll */}
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {/* ============================================================ */}
          {/* 1. PESTAÑA: DESPACHO Y COMANDAS */}
          {/* ============================================================ */}
          {activeTab === 'orders' && (
            <View>
              {/* CASO A: REPARTIDOR OFFLINE */}
              {!isOnline && (
                <View style={styles.offlineBox}>
                  <View style={styles.offlineIconBg}>
                    <Power size={42} color="#64748b" />
                  </View>
                  <Text style={styles.offlineTitle}>Estás Desconectado</Text>
                  <Text style={styles.offlineDesc}>
                    Activa tu turno para comenzar a recibir comandas de restaurantes en Baba y Babahoyo, navegar con GPS y acumular ganancias.
                  </Text>
                  <Pressable
                    style={styles.connectButton}
                    onPress={() => handleToggleAvailability(true)}
                  >
                    <Power size={20} color="#042f2e" />
                    <Text style={styles.connectButtonText}>INICIAR TURNO ONLINE</Text>
                  </Pressable>
                </View>
              )}

              {/* CASO B: TIENE UN PEDIDO ACTIVO (HUD DE NAVEGACIÓN Y ENTREGA) */}
              {isOnline && activeOrder && (
                <View style={styles.activeMissionContainer}>
                  {/* Stepper de Progreso */}
                  <View style={styles.stepperContainer}>
                    <View style={[styles.stepItem, orderStep === 'PICKUP' ? styles.stepCurrent : styles.stepDone]}>
                      <Text style={styles.stepNum}>1</Text>
                      <Text style={styles.stepTitle}>Recoger en Restaurante</Text>
                    </View>
                    <View style={styles.stepLine} />
                    <View style={[styles.stepItem, orderStep === 'DELIVERY' ? styles.stepCurrent : styles.stepInactive]}>
                      <Text style={styles.stepNum}>2</Text>
                      <Text style={styles.stepTitle}>Entregar al Cliente</Text>
                    </View>
                  </View>

                  {/* Detalle del Destino de Misión Actual */}
                  {orderStep === 'PICKUP' ? (
                    // ETAPA 1: RECOGIDA EN RESTAURANTE
                    <View style={styles.cardMission}>
                      <View style={styles.missionHeader}>
                        <View style={styles.badgePickup}>
                          <Store size={14} color="#059669" />
                          <Text style={styles.badgePickupText}>PASO 1: RETIRO EN COCINA</Text>
                        </View>
                        <Text style={styles.orderIdTag}>#{activeOrder.id.slice(0, 8)}</Text>
                      </View>

                      <Text style={styles.restaurantName}>{activeOrder.comercio_nombre}</Text>
                      <Text style={styles.addressText}>{activeOrder.comercio_direccion || 'Centro de Baba'}</Text>

                      {/* Botones de Navegación 1-Clic a Cocina */}
                      <Text style={styles.navLabel}>Navegación asistida hacia el restaurante:</Text>
                      <View style={styles.navButtonsRow}>
                        <Pressable
                          style={styles.btnWaze}
                          onPress={() =>
                            NavigationLauncher.abrirWaze(
                              Number(activeOrder.comercio_lat || RESTAURANT.lat),
                              Number(activeOrder.comercio_lon || RESTAURANT.lng)
                            )
                          }
                        >
                          <Navigation size={18} color="#fff" />
                          <Text style={styles.btnNavText}>Waze ↗</Text>
                        </Pressable>

                        <Pressable
                          style={styles.btnMaps}
                          onPress={() =>
                            NavigationLauncher.abrirGoogleMaps(
                              Number(activeOrder.comercio_lat || RESTAURANT.lat),
                              Number(activeOrder.comercio_lon || RESTAURANT.lng)
                            )
                          }
                        >
                          <Compass size={18} color="#fff" />
                          <Text style={styles.btnNavText}>Google Maps ↗</Text>
                        </Pressable>
                      </View>

                      {/* Lista de Ítems a Verificar */}
                      <View style={styles.itemsBox}>
                        <Text style={styles.itemsBoxTitle}>Verificación de empaque en cocina:</Text>
                        {activeOrder.items && activeOrder.items.length > 0 ? (
                          activeOrder.items.map((item, idx) => (
                            <Pressable
                              key={idx}
                              style={styles.checkItemRow}
                              onPress={() =>
                                setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }))
                              }
                            >
                              <View style={[styles.checkbox, checkedItems[idx] && styles.checkboxActive]}>
                                {checkedItems[idx] && <CheckCircle size={14} color="#fff" />}
                              </View>
                              <Text style={styles.checkItemName}>
                                {item.cantidad}x {item.producto}
                              </Text>
                            </Pressable>
                          ))
                        ) : (
                          <Text style={styles.mutedText}>Comanda estándar de comida preparada.</Text>
                        )}
                      </View>

                      {/* Botón de Confirmación de Retiro */}
                      <Pressable
                        style={styles.primaryActionButton}
                        onPress={handleConfirmPickup}
                      >
                        <ArrowRight size={20} color="#042f2e" />
                        <Text style={styles.primaryActionText}>CONFIRMAR RECOGIDA E IR AL CLIENTE</Text>
                      </Pressable>

                      {/* Botón para liberar comanda en caso de emergencia */}
                      <Pressable
                        style={styles.releaseButton}
                        onPress={handleReleaseOrder}
                        disabled={actionLoading}
                      >
                        <AlertTriangle size={14} color="#fca5a5" />
                        <Text style={styles.releaseButtonText}>Liberar Comanda (Avería / Emergencia)</Text>
                      </Pressable>
                    </View>
                  ) : (
                    // ETAPA 2: ENTREGA AL CLIENTE
                    <View style={styles.cardMission}>
                      <View style={styles.missionHeader}>
                        <View style={styles.badgeDelivery}>
                          <MapPin size={14} color="#f59e0b" />
                          <Text style={styles.badgeDeliveryText}>PASO 2: ENTREGA AL DOMICILIO</Text>
                        </View>
                        <Text style={styles.orderIdTag}>#{activeOrder.id.slice(0, 8)}</Text>
                      </View>

                      <View style={styles.customerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.restaurantName}>{activeOrder.cliente_nombre}</Text>
                          <Text style={styles.addressText}>{activeOrder.direccion_entrega}</Text>
                          {!!activeOrder.notas && (
                            <Text style={styles.notesText}>📝 Nota: {activeOrder.notas}</Text>
                          )}
                        </View>
                        {!!activeOrder.cliente_telefono && (
                          <Pressable
                            style={styles.callButton}
                            onPress={() => handleCallPhone(activeOrder.cliente_telefono)}
                          >
                            <Phone size={20} color="#10b981" />
                            <Text style={styles.callButtonText}>Llamar</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Botones de Navegación 1-Clic a Domicilio */}
                      <Text style={styles.navLabel}>Navegación asistida hacia el domicilio:</Text>
                      <View style={styles.navButtonsRow}>
                        <Pressable
                          style={styles.btnWaze}
                          onPress={() =>
                            NavigationLauncher.abrirWaze(
                              Number(activeOrder.lat_entrega || -1.7917),
                              Number(activeOrder.lon_entrega || -79.6783)
                            )
                          }
                        >
                          <Navigation size={18} color="#fff" />
                          <Text style={styles.btnNavText}>Waze ↗</Text>
                        </Pressable>

                        <Pressable
                          style={styles.btnMaps}
                          onPress={() =>
                            NavigationLauncher.abrirGoogleMaps(
                              Number(activeOrder.lat_entrega || -1.7917),
                              Number(activeOrder.lon_entrega || -79.6783)
                            )
                          }
                        >
                          <Compass size={18} color="#fff" />
                          <Text style={styles.btnNavText}>Google Maps ↗</Text>
                        </Pressable>
                      </View>

                      {/* ALERTA CRÍTICA DE COBRO (EFECTIVO VS DIGITAL) */}
                      {activeOrder.metodo_pago === 'efectivo' ? (
                        <View style={styles.cashAlertBox}>
                          <View style={styles.cashAlertTop}>
                            <DollarSign size={22} color="#f59e0b" />
                            <Text style={styles.cashAlertTitle}>COBRO EN EFECTIVO OBLIGATORIO</Text>
                          </View>
                          <Text style={styles.cashAlertAmount}>
                            Cobrar al cliente: ${Number(activeOrder.total || 0).toFixed(2)}
                          </Text>
                          <Text style={styles.cashAlertDesc}>
                            Incluye alimentos y flete de envío. Se asentará como deuda de caja hasta liquidar en central.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.digitalAlertBox}>
                          <View style={styles.digitalAlertTop}>
                            <CheckCircle size={22} color="#10b981" />
                            <Text style={styles.digitalAlertTitle}>PAGADO POR TRANSFERENCIA</Text>
                          </View>
                          <Text style={styles.digitalAlertAmount}>¡NO COBRAR NINGÚN VALOR!</Text>
                          <Text style={styles.digitalAlertDesc}>
                            El cliente ya canceló por vía digital. Tus honorarios se acreditarán directo a tu billetera.
                          </Text>
                        </View>
                      )}

                      {/* Botón de Entrega Exitosa */}
                      <Pressable
                        style={[styles.deliverButton, actionLoading && styles.disabledBtn]}
                        disabled={actionLoading}
                        onPress={handleConfirmDelivery}
                      >
                        {actionLoading ? (
                          <ActivityIndicator color="#042f2e" />
                        ) : (
                          <>
                            <CheckCircle size={22} color="#042f2e" />
                            <Text style={styles.deliverButtonText}>CONFIRMAR PEDIDO ENTREGADO</Text>
                          </>
                        )}
                      </Pressable>

                      {/* Botón para liberar comanda en caso de emergencia */}
                      <Pressable
                        style={styles.releaseButton}
                        onPress={handleReleaseOrder}
                        disabled={actionLoading}
                      >
                        <AlertTriangle size={14} color="#fca5a5" />
                        <Text style={styles.releaseButtonText}>Liberar Comanda (Avería / Emergencia)</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* CASO C: ONLINE Y SIN PEDIDO ACTIVO -> RADAR DE PEDIDOS DISPONIBLES */}
              {isOnline && !activeOrder && (
                <View>
                  {/* Encabezado del Radar */}
                  <View style={styles.radarHeader}>
                    <View>
                      <Text style={styles.sectionHeading}>Pedidos Listos en Baba</Text>
                      <Text style={styles.sectionSub}>Órdenes esperando despacho por motorizado</Text>
                    </View>
                    <Pressable
                      style={styles.refreshIconBtn}
                      onPress={refreshOrders}
                      disabled={loadingOrders}
                    >
                      <RefreshCw size={18} color="#10b981" />
                    </Pressable>
                  </View>

                  {/* Switch para incluir pedidos pendientes/en cocina (Modo Piloto) */}
                  <View style={styles.filterRow}>
                    <Text style={styles.filterText}>Ver también pedidos en preparación (Piloto):</Text>
                    <Switch
                      value={includePending}
                      onValueChange={v => {
                        setIncludePending(v);
                        setTimeout(refreshOrders, 200);
                      }}
                      trackColor={{ false: '#334155', true: '#059669' }}
                    />
                  </View>

                  {/* Lista de Pedidos Disponibles */}
                  {loadingOrders && availableOrders.length === 0 ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="large" color="#10b981" />
                      <Text style={styles.loadingText}>Sondeando restaurantes en Baba…</Text>
                    </View>
                  ) : availableOrders.length === 0 ? (
                    <View style={styles.emptyRadarBox}>
                      <View style={styles.radarPulseCircle}>
                        <Activity size={36} color="#10b981" />
                      </View>
                      <Text style={styles.emptyRadarTitle}>Radar Buscando Pedidos</Text>
                      <Text style={styles.emptyRadarDesc}>
                        No hay pedidos listos en este instante en Baba Centro. Te notificaremos en cuanto una picantería o restaurante termine de cocinar.
                      </Text>
                      <Pressable style={styles.btnSecondary} onPress={refreshOrders}>
                        <RefreshCw size={16} color="#cbd5e1" />
                        <Text style={styles.btnSecondaryText}>Comprobar de nuevo</Text>
                      </Pressable>
                    </View>
                  ) : (
                    availableOrders.map(order => {
                      const isExclusive = Boolean(order.es_oferta_prioritaria);
                      const vertical = order.tipo_comercio_id || 'restaurante';
                      const verticalLabel =
                        vertical === 'supermercado' ? 'Supermercado 🛒' :
                        vertical === 'farmacia' ? 'Farmacia 💊' :
                        vertical === 'licoreria' ? 'Licorería 🍷' : 'Restaurante 🍽️';

                      const distRecogida = order.distancia_al_comercio_km !== undefined
                        ? `${Number(order.distancia_al_comercio_km).toFixed(1)} km`
                        : null;
                      const distEntrega = order.distancia_entrega_km !== undefined
                        ? `${Number(order.distancia_entrega_km).toFixed(1)} km`
                        : null;
                      const distTotal = order.distancia_total_km !== undefined
                        ? `${Number(order.distancia_total_km).toFixed(1)} km`
                        : null;

                      return (
                        <View key={order.id} style={[styles.orderCard, isExclusive && styles.orderCardExclusive]}>
                          {isExclusive && (
                            <View style={styles.exclusiveBanner}>
                              <Zap size={14} color="#f59e0b" />
                              <Text style={styles.exclusiveBannerText}>OFERTA PRIORITARIA EXCLUSIVA (30s)</Text>
                            </View>
                          )}

                          <View style={styles.orderCardTop}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <View style={styles.badgeOrder}>
                                <Store size={14} color="#10b981" />
                                <Text style={styles.badgeOrderText}>{order.comercio_nombre}</Text>
                              </View>
                              <View style={styles.verticalTag}>
                                <Text style={styles.verticalTagText}>{verticalLabel}</Text>
                              </View>
                            </View>
                            <Text style={styles.earningTag}>
                              +${Number(order.ganancia_repartidor || 0.80).toFixed(2)} ganancia
                            </Text>
                          </View>

                          {/* Métricas de 2 Tramos */}
                          <View style={styles.routePillsRow}>
                            <View style={styles.routePill}>
                              <Text style={styles.routePillLabel}>🛵 Al local:</Text>
                              <Text style={styles.routePillValue}>{distRecogida || '1.2 km'}</Text>
                            </View>
                            <Text style={styles.routePillArrow}>→</Text>
                            <View style={styles.routePill}>
                              <Text style={styles.routePillLabel}>🏁 Entrega:</Text>
                              <Text style={styles.routePillValue}>{distEntrega || '2.0 km'}</Text>
                            </View>
                            <View style={[styles.routePill, styles.routePillTotal]}>
                              <Text style={styles.routePillTotalText}>Total: {distTotal || '3.2 km'}</Text>
                            </View>
                          </View>

                          <Text style={styles.orderCardAddress} numberOfLines={1}>
                            🏬 Recoger: {order.comercio_direccion || 'Baba Centro'}
                          </Text>
                          <Text style={styles.orderCardAddress} numberOfLines={1}>
                            📍 Entregar: {order.cliente_nombre} ({order.direccion_entrega})
                          </Text>

                          <View style={styles.orderMetaRow}>
                            <View style={styles.paymentPill}>
                              <Text style={styles.paymentPillText}>
                                {order.metodo_pago === 'efectivo'
                                  ? `💵 Cobro Efectivo: $${Number(order.total).toFixed(2)}`
                                  : `💳 Pagado Transferencia ($${Number(order.total).toFixed(2)})`}
                              </Text>
                            </View>
                            {order.items && (
                              <Text style={styles.itemCountText}>
                                {order.items.reduce((acc, i) => acc + i.cantidad, 0)} ítems
                              </Text>
                            )}
                          </View>

                          {/* Botones: Ver Mapa Completo & Aceptar */}
                          <View style={styles.cardActionsRow}>
                            <Pressable
                              style={styles.btnInspectMap}
                              onPress={() => {
                                setSelectedOrderForModal(order);
                                setIsOfferModalVisible(true);
                              }}
                            >
                              <Compass size={16} color="#38bdf8" />
                              <Text style={styles.btnInspectMapText}>VER RUTA & DETALLES</Text>
                            </Pressable>

                            <Pressable
                              style={[styles.acceptButtonCompact, actionLoading && styles.disabledBtn]}
                              disabled={actionLoading}
                              onPress={() => handleAcceptOrder(order)}
                            >
                              <Truck size={16} color="#042f2e" />
                              <Text style={styles.acceptButtonCompactText}>ACEPTAR</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* 2. PESTAÑA: BILLETERA LEDGER */}
          {/* ============================================================ */}
          {activeTab === 'wallet' && (
            <View>
              <View style={styles.walletHeaderCard}>
                <Text style={styles.walletCardKicker}>BILLETERA CONTABLE · POSTGRESQL</Text>
                <Text style={styles.walletCardAmount}>
                  {daily ? money(daily.netCents) : '$0.00'}
                </Text>
                <Text style={styles.walletCardSub}>Neto de hoy (Ganancias - Deuda en efectivo)</Text>

                <View style={styles.walletDivider} />

                <View style={styles.walletStatsGrid}>
                  <View>
                    <Text style={styles.walletStatLabel}>Ganancias Envíos:</Text>
                    <Text style={styles.walletStatPositive}>
                      {daily ? money(daily.commissionCents) : '$0.00'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.walletStatLabel}>Efectivo en Mano (Deuda):</Text>
                    <Text style={styles.walletStatNegative}>
                      {daily ? money(daily.cashDebtCents) : '$0.00'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botón de Refrescar Saldo */}
              <Pressable
                style={styles.refreshWalletBtn}
                onPress={refreshWallet}
                disabled={walletLoading}
              >
                {walletLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <RefreshCw size={16} color="#fff" />
                    <Text style={styles.refreshWalletText}>Actualizar Balance Contable</Text>
                  </>
                )}
              </Pressable>

              {wallet && Math.abs(daily?.cashDebtCents || 0) >= 2500 && (
                <View style={styles.debtLimitAlert}>
                  <AlertTriangle size={20} color="#f59e0b" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.debtLimitTitle}>Límite de Caja Alcanzado</Text>
                    <Text style={styles.debtLimitDesc}>
                      Tienes más de $25 en efectivo retenido de clientes. Acércate a la oficina central de Baba para liquidar caja y seguir recibiendo pedidos en efectivo.
                    </Text>
                  </View>
                </View>
              )}

              {/* Historial de Movimientos de Hoy */}
              <Text style={styles.sectionHeading}>Movimientos de Hoy</Text>
              {!daily || daily.movements.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.mutedText}>Sin transacciones registradas para la fecha de hoy.</Text>
                </View>
              ) : (
                daily.movements.map(item => (
                  <View key={item.id} style={styles.movementCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.movementDesc}>{item.description}</Text>
                      <Text style={styles.movementMeta}>
                        {new Date(item.date).toLocaleTimeString('es-EC', {
                          timeZone: 'America/Guayaquil',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · Tipo: {item.type}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.movementAmount,
                        { color: item.cents < 0 ? '#f87171' : '#34d399' },
                      ]}
                    >
                      {money(item.cents)}
                    </Text>
                  </View>
                ))
              )}

              {syncedWallet && (
                <Text style={styles.syncTimestamp}>
                  Última sincronización: {syncedWallet.toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' })}
                </Text>
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* 3. PESTAÑA: HISTORIAL DE ENTREGAS */}
          {/* ============================================================ */}
          {activeTab === 'history' && (
            <View>
              <Text style={styles.sectionHeading}>Entregas Realizadas</Text>
              <Text style={styles.sectionSub}>Registro oficial de viajes concluidos con éxito</Text>

              {orderHistory.length === 0 ? (
                <View style={styles.card}>
                  <Clock size={32} color="#64748b" style={{ alignSelf: 'center', marginVertical: 12 }} />
                  <Text style={[styles.mutedText, { textAlign: 'center' }]}>
                    Aún no registras entregas completadas en este dispositivo.
                  </Text>
                </View>
              ) : (
                orderHistory.map(order => (
                  <View key={order.id} style={styles.card}>
                    <View style={styles.historyCardTop}>
                      <Text style={styles.orderIdTag}>#{order.id.slice(0, 8)}</Text>
                      <View style={styles.deliveredPill}>
                        <CheckCircle size={12} color="#10b981" />
                        <Text style={styles.deliveredPillText}>Entregado</Text>
                      </View>
                    </View>
                    <Text style={styles.historyRestaurant}>{order.comercio_nombre}</Text>
                    <Text style={styles.historyClient}>Cliente: {order.cliente_nombre}</Text>
                    <Text style={styles.addressText}>{order.direccion_entrega}</Text>
                    <View style={styles.historyBottomRow}>
                      <Text style={styles.historyEarning}>
                        Ganancia: +${Number(order.ganancia_repartidor || 0.80).toFixed(2)}
                      </Text>
                      <Text style={styles.historyPayment}>
                        {order.metodo_pago === 'efectivo' ? 'Cobro en Efectivo' : 'Transferencia'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* 4. PESTAÑA: PERFIL Y CONFIGURACIÓN */}
          {/* ============================================================ */}
          {activeTab === 'profile' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ficha del Repartidor</Text>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Identificador:</Text>
                  <Text style={styles.profileValue}>{COURIER_ID}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Nombre:</Text>
                  <Text style={styles.profileValue}>Moto Baba 01 (Carlos Repartidor)</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Vehículo:</Text>
                  <Text style={styles.profileValue}>Motocicleta 150cc · Placa EC-BABA-01</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Base Operativa:</Text>
                  <Text style={styles.profileValue}>Cantón Baba (Parque Central)</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Conexión con Plataforma</Text>
                <Text style={styles.mutedText}>URL del API Gateway:</Text>
                <TextInput
                  style={styles.apiInput}
                  value={currentApi}
                  onChangeText={setCurrentApi}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.apiPresetsRow}>
                  <Pressable
                    style={styles.btnSmall}
                    onPress={() => setCurrentApi('https://delivery-baba-api.loca.lt/api/v1')}
                  >
                    <Text style={styles.btnSmallText}>Túnel Remoto (loca.lt)</Text>
                  </Pressable>
                  <Pressable
                    style={styles.btnSmall}
                    onPress={() => setCurrentApi('http://192.168.68.123:8080/api/v1')}
                  >
                    <Text style={styles.btnSmallText}>IP Local WiFi</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Telemetría en Segundo Plano</Text>
                <Text style={styles.mutedText}>
                  Protocolo WebSocket bidireccional activo. Las coordenadas enviadas se reflejan en tiempo real en la pantalla de radar del cliente y la torre de control en Backoffice.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Modal de Selección de Repartidor de Pruebas (10 repartidores) */}
        <Modal
          visible={isDriverSelectorOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsDriverSelectorOpen(false)}
        >
          <View style={styles.selectorModalOverlay}>
            <View style={styles.selectorModalContent}>
              <View style={styles.selectorHeader}>
                <View>
                  <Text style={styles.selectorTitle}>Cambiar Perfil de Repartidor</Text>
                  <Text style={styles.selectorSubtitle}>
                    10 Repartidores activos en Baba, Babahoyo y Montalvo
                  </Text>
                </View>
                <Pressable
                  style={styles.selectorCloseBtn}
                  onPress={() => setIsDriverSelectorOpen(false)}
                >
                  <X size={20} color="#94a3b8" />
                </Pressable>
              </View>

              <ScrollView style={styles.selectorList}>
                {driversList.map((driver) => {
                  const isCurrent = driver.id === courierId;
                  const isBaba = driver.ciudad.toLowerCase().includes('baba') && !driver.ciudad.toLowerCase().includes('babahoyo');
                  const isBabahoyo = driver.ciudad.toLowerCase().includes('babahoyo');
                  const cityColor = isBaba ? '#10b981' : isBabahoyo ? '#38bdf8' : '#a855f7';

                  return (
                    <Pressable
                      key={driver.id}
                      style={[
                        styles.driverOptionCard,
                        isCurrent && styles.driverOptionCardActive,
                      ]}
                      onPress={() => handleSelectDriver(driver)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={[
                              styles.driverIconPill,
                              { backgroundColor: isCurrent ? '#059669' : '#1e293b' },
                            ]}
                          >
                            <Truck size={18} color={isCurrent ? '#ffffff' : '#94a3b8'} />
                          </View>
                          <View>
                            <Text style={styles.driverOptionName}>{driver.nombre}</Text>
                            <Text style={styles.driverOptionPhone}>{driver.telefono}</Text>
                          </View>
                        </View>
                        <View style={[styles.cityBadge, { borderColor: cityColor }]}>
                          <Text style={[styles.cityBadgeText, { color: cityColor }]}>
                            {driver.ciudad}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.driverOptionMeta}>
                        <Text style={styles.driverOptionMetaText}>
                          🛵 {driver.tipo_vehiculo || 'Moto'} {driver.placa_vehiculo ? `(${driver.placa_vehiculo})` : ''}
                        </Text>
                        <Text style={styles.driverOptionMetaText}>
                          ⭐ {driver.calificacion_promedio} ({driver.cant_entregas_completadas} entregas)
                        </Text>
                        <Text style={styles.driverOptionMetaText}>
                          📍 {Number(driver.lat).toFixed(4)}, {Number(driver.lon).toFixed(4)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal de Oferta y Ruteo Pre-Aceptación (2 Tramos + SVG + Waze/Google Maps + Temporizador) */}
        <OrderOfferModal
          visible={isOfferModalVisible}
          order={selectedOrderForModal}
          onAccept={(order) => {
            setIsOfferModalVisible(false);
            handleAcceptOrder(order);
          }}
          onReject={(order) => {
            handleRejectOffer(order);
          }}
          onClose={() => {
            setIsOfferModalVisible(false);
            setSelectedOrderForModal(null);
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090e17' },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarPill: {
    backgroundColor: '#064e3b',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#059669',
  },
  driverTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  driverLocation: { color: '#94a3b8', fontSize: 12 },
  switchWrapper: { alignItems: 'flex-end' },
  switchStatus: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  statusOnline: { color: '#34d399' },
  statusOffline: { color: '#94a3b8' },

  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  telemetryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  telemetryText: { color: '#cbd5e1', fontSize: 11, fontWeight: '500' },
  pulseBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981' },
  pulseText: { color: '#34d399', fontSize: 10, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  statValue: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginTop: 2 },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    position: 'relative',
  },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#10b981' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#34d399', fontWeight: '800' },
  tabBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    position: 'absolute',
    top: 10,
    right: 12,
  },

  contentContainer: { padding: 16, paddingBottom: 40 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7f1d1d',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
  },
  errorText: { color: '#fca5a5', fontSize: 12, flex: 1, fontWeight: '600' },

  // Offline Screen
  offlineBox: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 10,
  },
  offlineIconBg: {
    backgroundColor: '#1e293b',
    padding: 18,
    borderRadius: 50,
    marginBottom: 16,
  },
  offlineTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  offlineDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#34d399',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  connectButtonText: { color: '#042f2e', fontWeight: '800', fontSize: 14 },

  // Active Mission
  activeMissionContainer: { gap: 14 },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#334155', marginHorizontal: 8 },
  stepCurrent: { opacity: 1 },
  stepDone: { opacity: 0.8 },
  stepInactive: { opacity: 0.4 },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    color: '#042f2e',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 20,
  },
  stepTitle: { color: '#f8fafc', fontSize: 11, fontWeight: '700' },

  cardMission: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgePickup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePickupText: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  badgeDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#78350f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDeliveryText: { color: '#fbbf24', fontSize: 11, fontWeight: '800' },
  orderIdTag: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },

  restaurantName: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginVertical: 4 },
  addressText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  notesText: { color: '#fde68a', fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 8,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064e3b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#059669',
  },
  callButtonText: { color: '#34d399', fontWeight: '700', fontSize: 13 },

  navLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  navButtonsRow: { flexDirection: 'row', gap: 10 },
  btnWaze: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnMaps: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1e40af',
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnNavText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  itemsBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
  },
  itemsBoxTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 8 },
  checkItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkItemName: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },

  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34d399',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 6,
  },
  primaryActionText: { color: '#042f2e', fontWeight: '800', fontSize: 13 },

  // Alerts for cash / digital
  cashAlertBox: {
    backgroundColor: '#451a03',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#b45309',
    marginVertical: 14,
  },
  cashAlertTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cashAlertTitle: { color: '#f59e0b', fontSize: 13, fontWeight: '800' },
  cashAlertAmount: { color: '#fff', fontSize: 20, fontWeight: '900', marginVertical: 4 },
  cashAlertDesc: { color: '#fde68a', fontSize: 11, lineHeight: 16 },

  digitalAlertBox: {
    backgroundColor: '#064e3b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#059669',
    marginVertical: 14,
  },
  digitalAlertTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  digitalAlertTitle: { color: '#34d399', fontSize: 13, fontWeight: '800' },
  digitalAlertAmount: { color: '#fff', fontSize: 18, fontWeight: '900', marginVertical: 4 },
  digitalAlertDesc: { color: '#a7f3d0', fontSize: 11, lineHeight: 16 },

  deliverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  deliverButtonText: { color: '#042f2e', fontWeight: '900', fontSize: 14 },
  disabledBtn: { opacity: 0.6 },

  // Radar Screen
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  sectionSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  refreshIconBtn: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  filterText: { color: '#94a3b8', fontSize: 12 },

  loadingBox: { alignItems: 'center', padding: 30 },
  loadingText: { color: '#94a3b8', fontSize: 13, marginTop: 12 },

  emptyRadarBox: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 8,
  },
  radarPulseCircle: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 50,
    marginBottom: 14,
  },
  emptyRadarTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  emptyRadarDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 18,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  btnSecondaryText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },

  // Available Order Card
  orderCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 8,
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeOrderText: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  earningTag: {
    backgroundColor: '#064e3b',
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderCardAddress: { color: '#cbd5e1', fontSize: 12, marginVertical: 2 },
  orderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  paymentPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentPillText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  itemCountText: { color: '#64748b', fontSize: 11 },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34d399',
    paddingVertical: 13,
    borderRadius: 10,
  },
  acceptButtonText: { color: '#042f2e', fontWeight: '800', fontSize: 13 },

  // Wallet
  walletHeaderCard: {
    backgroundColor: '#064e3b',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  walletCardKicker: { color: '#a7f3d0', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  walletCardAmount: { color: '#fff', fontSize: 36, fontWeight: '900', marginVertical: 6 },
  walletCardSub: { color: '#d1fae5', fontSize: 12 },
  walletDivider: { height: 1, backgroundColor: '#047857', marginVertical: 14 },
  walletStatsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  walletStatLabel: { color: '#a7f3d0', fontSize: 11 },
  walletStatPositive: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  walletStatNegative: { color: '#fca5a5', fontSize: 16, fontWeight: '800', marginTop: 2 },

  refreshWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  refreshWalletText: { color: '#f8fafc', fontWeight: '700', fontSize: 13 },

  debtLimitAlert: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#451a03',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b45309',
    marginVertical: 8,
  },
  debtLimitTitle: { color: '#f59e0b', fontSize: 13, fontWeight: '800' },
  debtLimitDesc: { color: '#fde68a', fontSize: 11, lineHeight: 16, marginTop: 2 },

  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  movementDesc: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  movementMeta: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  movementAmount: { fontSize: 16, fontWeight: '800' },
  syncTimestamp: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 12 },

  // General Card
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 8,
  },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  mutedText: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },

  // History
  historyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveredPillText: { color: '#34d399', fontSize: 10, fontWeight: '700' },
  historyRestaurant: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginTop: 6 },
  historyClient: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  historyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  historyEarning: { color: '#34d399', fontSize: 13, fontWeight: '800' },
  historyPayment: { color: '#94a3b8', fontSize: 11 },

  // Profile
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  profileLabel: { color: '#94a3b8', fontSize: 12 },
  profileValue: { color: '#f8fafc', fontSize: 12, fontWeight: '700' },
  apiInput: {
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  apiPresetsRow: { flexDirection: 'row', gap: 8 },
  btnSmall: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnSmallText: { color: '#34d399', fontSize: 11, fontWeight: '600' },
  releaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#451a03',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  releaseButtonText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },

  // Selector & Exclusive & 2-Stage Route Styles
  badgeSelector: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669',
  },
  badgeSelectorText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },
  orderCardExclusive: {
    borderColor: '#f59e0b',
    borderWidth: 1.5,
  },
  exclusiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
  },
  exclusiveBannerText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verticalTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verticalTagText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  routePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routePillLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  routePillValue: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  routePillArrow: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  routePillTotal: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
    borderWidth: 1,
  },
  routePillTotalText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  btnInspectMap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  btnInspectMapText: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 12,
  },
  acceptButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#34d399',
    paddingVertical: 12,
    borderRadius: 10,
  },
  acceptButtonCompactText: {
    color: '#042f2e',
    fontWeight: '800',
    fontSize: 12,
  },

  // Selector Modal
  selectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  selectorModalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  selectorTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  selectorSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  selectorCloseBtn: {
    padding: 6,
    backgroundColor: '#1e293b',
    borderRadius: 20,
  },
  selectorList: {
    marginBottom: 20,
  },
  driverOptionCard: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  driverOptionCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b22',
  },
  driverIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverOptionName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  driverOptionPhone: {
    color: '#94a3b8',
    fontSize: 11,
  },
  cityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  cityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  driverOptionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  driverOptionMetaText: {
    color: '#cbd5e1',
    fontSize: 11,
  },
});
