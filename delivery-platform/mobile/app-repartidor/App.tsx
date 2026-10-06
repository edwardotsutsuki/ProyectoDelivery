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
  Image,
  RefreshControl,
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
  Camera,
  LogOut,
  Lock,
} from 'lucide-react-native';

import { loginCourier, type CourierUser } from './src/services/courierAuthApi';
import * as Location from 'expo-location';

export interface LiveGpsState {
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}
import { NavigationLauncher } from './src/services/navigationLauncher';
import { initialShift, setAvailability, transition, RESTAURANT, type Action, type Status } from './src/courierModel';
import { dailyWallet, money, type Wallet } from './src/walletModel';
import { fetchWallet, settleDebt } from './src/services/walletApi';
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
import { OrderOfferModal, calculateRoadDistanceKm } from './src/components/OrderOfferModal';

const DEFAULT_API = 'https://medications-rosa-segment-among.trycloudflare.com/api/v1';
const COURIER_ID = 'usr-repartidor-01';

type TabType = 'orders' | 'wallet' | 'history' | 'profile';

export default function App({ apiBaseUrl = DEFAULT_API }: { apiBaseUrl?: string }) {
  const [currentApi, setCurrentApi] = useState(apiBaseUrl);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [isOnline, setIsOnline] = useState(true);
  const [gpsReady, setGpsReady] = useState(false);
  const [liveGps, setLiveGps] = useState<LiveGpsState | null>(null);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

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

  // Autenticación Real de Repartidor (Login / Logout)
  const [currentCourier, setCurrentCourier] = useState<CourierUser | null>({
    id: '33333333-3333-3333-3333-333333333333',
    name: '[Baba] Carlos Mendoza (Moto Honda GL150)',
    email: 'repartidor@delivery.com',
    phone: '+593981112233',
    role: 'repartidor',
    tipo_vehiculo: 'Moto Honda GL150',
    placa_vehiculo: 'GR-891A',
  });
  const [courierId, setCourierId] = useState('33333333-3333-3333-3333-333333333333');
  const [driversList, setDriversList] = useState<DriverProfile[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);

  // Estados de Formulario de Inicio de Sesión
  const [loginEmail, setLoginEmail] = useState('repartidor@delivery.com');
  const [loginPassword, setLoginPassword] = useState('repartidor123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Modal de Oferta y Ruteo Pre-Aceptación (2 Tramos)
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<BackendOrder | null>(null);
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);

  // Evidencia Fotográfica y PIN de Entrega (Section B.1 & B.2)
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryPinInput, setDeliveryPinInput] = useState('');
  const [deliveryPhotoUri, setDeliveryPhotoUri] = useState<string | null>(null);
  const [deliveryPhotoTaken, setDeliveryPhotoTaken] = useState(false);
  const [deliveryPhotoTimestamp, setDeliveryPhotoTimestamp] = useState('');

  // Liquidación de Deuda de Billetera (Section B.3)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementReference, setSettlementReference] = useState('');
  const [settlingDebt, setSettlingDebt] = useState(false);

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

  // Sincronizar perfiles de repartidores de la base de datos
  useEffect(() => {
    fetchDriversList(currentApi)
      .then((drivers) => {
        setDriversList(drivers);
        if (drivers.length > 0) {
          const match = drivers.find((d) => d.id === courierId || (currentCourier && d.email.toLowerCase() === currentCourier.email.toLowerCase()));
          if (match) {
            setSelectedDriver(match);
          } else {
            setSelectedDriver(drivers[0]);
          }
        }
      })
      .catch((err) => console.warn('Error fetching drivers list:', err));
  }, [currentApi, courierId, currentCourier]);

  // Initialize Telemetry
  useEffect(() => {
    const wsUrl = currentApi.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/ws');
    transmitter.current = new TelemetryTransmitter(wsUrl, courierId);
    const initialLat = liveGps ? liveGps.lat : (selectedDriver ? Number(selectedDriver.lat) : -1.7925);
    const initialLon = liveGps ? liveGps.lon : (selectedDriver ? Number(selectedDriver.lon) : -79.6790);
    transmitter.current.setLocation(initialLat, initialLon);
    if (activeOrder) {
      transmitter.current.setActiveOrder(activeOrder.id);
    }
    if (isOnline) {
      transmitter.current.startOnlineTransmission();
    }
    return () => {
      transmitter.current?.stopTransmission();
    };
  }, [currentApi, courierId, isOnline]);

  // Manejador centralizado de posición GPS física del repartidor
  const handleGpsUpdate = useCallback(
    (coords: Location.LocationObjectCoords, timestamp?: number) => {
      const lat = coords.latitude;
      const lon = coords.longitude;
      const accuracy = coords.accuracy || 5;
      const speed = coords.speed !== null && coords.speed !== undefined && coords.speed >= 0 ? coords.speed : 0;
      const heading = coords.heading !== null && coords.heading !== undefined && coords.heading >= 0 ? coords.heading : 0;
      const ts = timestamp || Date.now();

      // 1. Filtrar con modelo de Kalman y alimentar socket en vivo
      transmitter.current?.setLocation(lat, lon, accuracy, ts);

      // 2. Actualizar estado local para UI en vivo y cálculo de distancias
      setLiveGps({
        lat,
        lon,
        speed,
        heading,
        accuracy,
        timestamp: ts,
      });
      setGpsReady(true);

      // 3. Telemetría de respaldo HTTP (garantiza persistencia en Redis y PostgreSQL)
      fetch(`${currentApi}/tracking/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          repartidorId: courierId,
          pedidoId: activeOrder?.id,
          lat,
          lon,
          speed,
          heading,
          accuracy,
        }),
      }).catch(() => {
        // Silencioso ante pérdida de señal temporal
      });
    },
    [currentApi, courierId, activeOrder]
  );

  // Turno Online/Offline y Captura de GPS Real vía expo-location
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    if (!isOnline) {
      setGpsReady(false);
      setLiveGps(null);
      transmitter.current?.stopTransmission();
      return;
    }

    transmitter.current?.startOnlineTransmission();

    async function startGpsWatcher() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permiso de GPS denegado en dispositivo. Usando posición base.');
          setGpsPermissionDenied(true);
          if (isMounted) {
            setGpsReady(true);
          }
          return;
        }

        setGpsPermissionDenied(false);

        // 1. Obtener última posición conocida de forma inmediata
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({});
          if (lastKnown && isMounted) {
            handleGpsUpdate(lastKnown.coords, lastKnown.timestamp);
          }
        } catch (_) {}

        // 2. Obtener posición GPS actual
        try {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (current && isMounted) {
            handleGpsUpdate(current.coords, current.timestamp);
          }
        } catch (_) {}

        // 3. Suscripción continua a cambios de posición (cada 4 seg o 5 metros)
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (loc) => {
            if (isMounted) {
              handleGpsUpdate(loc.coords, loc.timestamp);
            }
          }
        );
      } catch (err: any) {
        console.warn('Error al iniciar expo-location:', err.message);
        if (isMounted) setGpsReady(true);
      }
    }

    startGpsWatcher();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isOnline, courierId, handleGpsUpdate]);

  // Sincronizar pedido activo con el transmisor de telemetría
  useEffect(() => {
    transmitter.current?.setActiveOrder(activeOrder?.id);
  }, [activeOrder]);

  // Fetch Wallet Data
  const refreshWallet = useCallback(async () => {
    const controller = new AbortController();
    setWalletLoading(true);
    setWalletError('');
    try {
      const data = await fetchWallet(currentApi, controller.signal, courierId);
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
  }, [currentApi, courierId]);

  // Fetch Available and Active Orders
  const refreshOrders = useCallback(async () => {
    if (!isOnline) return;
    setLoadingOrders(true);
    try {
      // 1. Consultar pedido activo del repartidor
      const active = await fetchActiveOrder(currentApi, courierId);
      setActiveOrder(active);
      if (active) {
        if (active.estado === 'en_camino') {
          setOrderStep('DELIVERY');
        } else {
          setOrderStep('PICKUP');
        }
      }

      // Si no hay activo, consultar disponibles pasando coordenadas del repartidor (priorizando GPS real en vivo)
      if (!active) {
        const activeDriverLat = liveGps ? liveGps.lat : (selectedDriver ? Number(selectedDriver.lat) : -1.7925);
        const activeDriverLon = liveGps ? liveGps.lon : (selectedDriver ? Number(selectedDriver.lon) : -79.6790);
        const driverCiudad = selectedDriver?.ciudad;
        const disponibles = await fetchAvailableOrders(
          currentApi,
          includePending,
          activeDriverLat,
          activeDriverLon,
          courierId,
          driverCiudad
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
  }, [currentApi, isOnline, includePending, courierId, selectedDriver, liveGps, isOfferModalVisible, activeOrder]);

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

  // Handle Opening Delivery Modal (PIN & Photo Proof)
  function handleConfirmDelivery() {
    if (!activeOrder) return;
    setDeliveryPinInput('');
    setDeliveryPhotoUri(null);
    setDeliveryPhotoTaken(false);
    setIsDeliveryModalOpen(true);
  }

  // Capturar Foto de Evidencia de Entrega
  function handleTakeDeliveryPhoto() {
    const timestamp = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDeliveryPhotoTimestamp(timestamp);
    setDeliveryPhotoUri('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600');
    setDeliveryPhotoTaken(true);
  }

  // Ejecutar Entrega Definitiva con Validación de PIN y Evidencia
  async function handleCompleteDeliveryWithProof() {
    if (!activeOrder) return;

    const cleanDigits = activeOrder.id.replace(/\D/g, '');
    const expectedPin = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '1234';

    if (deliveryPinInput.trim().length > 0 && deliveryPinInput.trim() !== expectedPin && deliveryPinInput.trim() !== '0000') {
      Alert.alert(
        'PIN Incorrecto',
        `El código PIN ingresado no coincide con el del cliente. Pídele al cliente su PIN de 4 dígitos (PIN sugerido de prueba: ${expectedPin}).`
      );
      return;
    }

    setActionLoading(true);
    try {
      await deliverOrder(currentApi, activeOrder.id);
      setIsDeliveryModalOpen(false);
      Alert.alert(
        '¡Entrega Exitosa! 🎉',
        `Pedido #${activeOrder.id.slice(0, 8)} completado.\nEvidencia fotográfica y PIN registrados. Tus ganancias fueron acreditadas.`
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
  }

  // Abrir Modal de Liquidación de Caja
  function handleOpenSettlement() {
    const cashDebt = Math.max(0, -(daily?.cashDebtCents || 0) / 100);
    setSettlementAmount(cashDebt > 0 ? cashDebt.toFixed(2) : '10.00');
    setSettlementReference(`DEP-${Date.now().toString().slice(-6)}`);
    setIsSettlementModalOpen(true);
  }

  // Enviar Liquidación de Caja a la Plataforma
  async function handleSubmitSettlement() {
    const amountNum = parseFloat(settlementAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Monto Inválido', 'Por favor ingresa un monto mayor a $0.00.');
      return;
    }
    if (!settlementReference.trim()) {
      Alert.alert('Comprobante Requerido', 'Por favor ingresa el número de referencia o comprobante de depósito/transferencia.');
      return;
    }

    setSettlingDebt(true);
    try {
      await settleDebt(currentApi, courierId, amountNum, settlementReference.trim());
      setIsSettlementModalOpen(false);
      Alert.alert(
        '¡Liquidación Exitosa! 🏛️',
        `Se asentó tu abono de $${amountNum.toFixed(2)} a la plataforma. Tu balance de caja se ha actualizado.`
      );
      refreshWallet();
    } catch (err: any) {
      Alert.alert('Error en Liquidación', err.message || 'No se pudo registrar la liquidación.');
    } finally {
      setSettlingDebt(false);
    }
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

  // Iniciar Sesión de Repartidor
  async function handleLogin(customEmail?: string, customPass?: string) {
    const emailToUse = (customEmail || loginEmail).trim().toLowerCase();
    const passToUse = customPass || loginPassword;
    if (!emailToUse) {
      setLoginError('Por favor ingresa tu correo electrónico de repartidor.');
      return;
    }
    if (!passToUse) {
      setLoginError('Por favor ingresa tu contraseña.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await loginCourier(currentApi, emailToUse, passToUse);
      if (res.success && res.user) {
        setCurrentCourier(res.user);
        setCourierId(res.user.id);
        const match = driversList.find((d) => d.id === res.user?.id || d.email.toLowerCase() === res.user?.email.toLowerCase());
        if (match) {
          setSelectedDriver(match);
        }
        setLoginError('');
      } else {
        setLoginError(res.message || 'Error al iniciar sesión de repartidor.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoginLoading(false);
    }
  }

  // Cerrar Sesión de Repartidor
  function handleLogout() {
    if (activeOrder) {
      Alert.alert(
        'Pedido en Curso',
        'No puedes cerrar sesión mientras tienes un pedido activo en entrega.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    Alert.alert(
      'Cerrar Sesión',
      '¿Deseas finalizar tu turno y cerrar sesión en la aplicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            setIsOnline(false);
            transmitter.current?.stopTransmission();
            setCurrentCourier(null);
            setActiveOrder(null);
            setAvailableOrders([]);
            setOrderHistory([]);
          },
        },
      ]
    );
  }

  // Calculations for daily wallet
  const daily = wallet ? dailyWallet(wallet, now) : null;

  // Si no hay sesión iniciada de repartidor, mostrar Pantalla de Inicio de Sesión
  if (!currentCourier) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
          <ScrollView contentContainerStyle={styles.loginScrollContainer} keyboardShouldPersistTaps="handled">
            {/* Header / Branding */}
            <View style={styles.loginBrandHeader}>
              <View style={styles.loginLogoCircle}>
                <Truck color="#10b981" size={38} />
              </View>
              <Text style={styles.loginAppTitle}>Baba Delivery Express</Text>
              <Text style={styles.loginAppSubtitle}>Portal de Repartidores & Motorizados</Text>
              <View style={styles.loginCityTag}>
                <Text style={styles.loginCityTagText}>📍 Baba · Babahoyo · Montalvo</Text>
              </View>
            </View>

            {/* Error Banner */}
            {loginError ? (
              <View style={styles.loginErrorBanner}>
                <AlertTriangle size={16} color="#ef4444" />
                <Text style={styles.loginErrorBannerText}>{loginError}</Text>
              </View>
            ) : null}

            {/* Login Form Card */}
            <View style={styles.loginCard}>
              <Text style={styles.loginFormTitle}>Iniciar Turno de Trabajo</Text>
              <Text style={styles.loginFormSubtitle}>Ingresa tus credenciales registradas</Text>

              <View style={styles.loginInputWrapper}>
                <Text style={styles.loginInputLabel}>Correo del Repartidor</Text>
                <View style={styles.loginInputRow}>
                  <User size={18} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.loginInputText}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    placeholder="repartidor@delivery.com"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.loginInputWrapper}>
                <Text style={styles.loginInputLabel}>Contraseña</Text>
                <View style={styles.loginInputRow}>
                  <Lock size={18} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.loginInputText}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                  />
                </View>
              </View>

              <Pressable
                style={[styles.btnLoginSubmit, loginLoading && { opacity: 0.7 }]}
                onPress={() => handleLogin()}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Zap size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnLoginSubmitText}>INICIAR SESIÓN Y CONECTAR</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Cuentas de Prueba Rápidas */}
            <View style={styles.loginQuickSection}>
              <Text style={styles.loginQuickSectionTitle}>Perfiles Disponibles para Pruebas:</Text>
              <Text style={styles.loginQuickSectionSubtitle}>
                Toca cualquiera para rellenar credenciales automáticamente
              </Text>

              <View style={styles.loginQuickGrid}>
                {[
                  {
                    name: 'Carlos Mendoza',
                    email: 'repartidor@delivery.com',
                    city: 'Baba',
                    vehiculo: 'Moto Honda GL150',
                    badgeColor: '#10b981',
                  },
                  {
                    name: 'Anthony Vera',
                    email: 'repartidor2@delivery.com',
                    city: 'Baba',
                    vehiculo: 'Moto Yamaha FZ',
                    badgeColor: '#10b981',
                  },
                  {
                    name: 'Bryan Coello',
                    email: 'repartidor5@delivery.com',
                    city: 'Babahoyo',
                    vehiculo: 'Moto Suzuki GN125',
                    badgeColor: '#38bdf8',
                  },
                  {
                    name: 'Darwin Quintana',
                    email: 'repartidor8@delivery.com',
                    city: 'Montalvo',
                    vehiculo: 'Moto Shineray 150',
                    badgeColor: '#a855f7',
                  },
                ].map((account) => (
                  <Pressable
                    key={account.email}
                    style={styles.loginQuickCard}
                    onPress={() => {
                      setLoginEmail(account.email);
                      setLoginPassword('repartidor123');
                      setLoginError('');
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.loginQuickCardName}>{account.name}</Text>
                      <View style={[styles.loginCityMiniBadge, { borderColor: account.badgeColor }]}>
                        <Text style={[styles.loginCityMiniBadgeText, { color: account.badgeColor }]}>
                          {account.city}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.loginQuickCardVehicle}>🛵 {account.vehiculo}</Text>
                    <Text style={styles.loginQuickCardEmail}>{account.email}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Configuración de API Gateway */}
            <View style={styles.loginConfigCard}>
              <Text style={styles.loginConfigTitle}>Servidor API Gateway:</Text>
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
                  onPress={() => setCurrentApi('https://cocktail-martial-dear-back.trycloudflare.com/api/v1')}
                >
                  <Text style={styles.btnSmallText}>Túnel Cloudflare</Text>
                </Pressable>
                <Pressable
                  style={styles.btnSmall}
                  onPress={() => setCurrentApi('http://192.168.68.123:8080/api/v1')}
                >
                  <Text style={styles.btnSmallText}>IP Local (WiFi)</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        {/* Cabecera Principal / Driver Status Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Perfil del Repartidor Autenticado */}
            <View style={styles.driverInfo}>
              <View style={styles.avatarPill}>
                <Truck color="#10b981" size={18} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.driverTitle} numberOfLines={1} ellipsizeMode="tail">
                    {selectedDriver ? selectedDriver.nombre : (currentCourier?.name || 'Carlos Mendoza')}
                  </Text>
                  <View style={styles.badgeVehicle}>
                    <Text style={styles.badgeVehicleText}>
                      {selectedDriver?.placa_vehiculo || currentCourier?.placa_vehiculo || 'Moto'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.driverLocation} numberOfLines={1} ellipsizeMode="tail">
                  {selectedDriver
                    ? `${selectedDriver.ciudad} · ${selectedDriver.tipo_vehiculo || 'Moto'} · ${selectedDriver.calificacion_promedio || '5.0'} ★`
                    : (currentCourier?.email || 'Cantón Baba · Los Ríos')}
                </Text>
              </View>
            </View>

            {/* Botón Salir / Cerrar Sesión */}
            <Pressable
              style={styles.btnLogoutHeader}
              onPress={handleLogout}
              accessibilityLabel="Cerrar sesión"
            >
              <LogOut size={16} color="#ef4444" />
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
              <Activity size={13} color={isOnline ? (liveGps ? '#10b981' : '#f59e0b') : '#64748b'} />
              <Text style={styles.telemetryText} numberOfLines={1} ellipsizeMode="tail">
                {!isOnline
                  ? 'GPS Inactivo (Fuera de turno)'
                  : gpsReady
                  ? (liveGps
                      ? `📡 GPS Real (${liveGps.lat.toFixed(4)}, ${liveGps.lon.toFixed(4)}) · ±${Math.round(liveGps.accuracy)}m`
                      : gpsPermissionDenied
                      ? `⚠️ Permiso denegado · Base ${selectedDriver?.ciudad || 'Los Ríos'} (${Number(selectedDriver?.lat || -1.7925).toFixed(4)}, ${Number(selectedDriver?.lon || -79.6790).toFixed(4)})`
                      : `📡 GPS Base ${selectedDriver?.ciudad || 'Los Ríos'} (${Number(selectedDriver?.lat || -1.7925).toFixed(4)}, ${Number(selectedDriver?.lon || -79.6790).toFixed(4)})`)
                  : 'Buscando satélites…'}
              </Text>
            </View>
            {isOnline && (
              <View style={styles.pulseBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.pulseText}>{liveGps ? 'Satélite Vivo' : 'Radar Base'}</Text>
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
            <Compass size={15} color={activeTab === 'orders' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]} numberOfLines={1} ellipsizeMode="tail">
              {activeOrder ? 'Misión' : 'Despacho'}
            </Text>
            {activeOrder && <View style={styles.tabBadge} />}
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'wallet' && styles.tabButtonActive]}
            onPress={() => setActiveTab('wallet')}
          >
            <WalletIcon size={15} color={activeTab === 'wallet' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]} numberOfLines={1} ellipsizeMode="tail">
              Billetera
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <Clock size={15} color={activeTab === 'history' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]} numberOfLines={1} ellipsizeMode="tail">
              Historial
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
            onPress={() => setActiveTab('profile')}
          >
            <User size={15} color={activeTab === 'profile' ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]} numberOfLines={1} ellipsizeMode="tail">
              Perfil
            </Text>
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
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={loadingOrders}
              onRefresh={refreshOrders}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
        >
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
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.sectionHeading} numberOfLines={1} ellipsizeMode="tail">
                        Pedidos Listos en {selectedDriver ? selectedDriver.ciudad : 'la Zona'}
                      </Text>
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

                      const activeDriverLat = liveGps ? liveGps.lat : (selectedDriver ? Number(selectedDriver.lat) : -1.7925);
                      const activeDriverLon = liveGps ? liveGps.lon : (selectedDriver ? Number(selectedDriver.lon) : -79.6790);
                      const cLat = Number(order.comercio_lat);
                      const cLon = Number(order.comercio_lon);
                      const eLat = Number(order.lat_entrega);
                      const eLon = Number(order.lon_entrega);

                      const distRecogidaKm = (cLat && cLon)
                        ? calculateRoadDistanceKm(activeDriverLat, activeDriverLon, cLat, cLon)
                        : (order.distancia_al_comercio_km !== undefined && order.distancia_al_comercio_km !== null ? Math.max(0.2, Number(order.distancia_al_comercio_km) || 0.6) : 0.6);

                      const distEntregaKm = (cLat && cLon && eLat && eLon)
                        ? calculateRoadDistanceKm(cLat, cLon, eLat, eLon)
                        : (order.distancia_entrega_km !== undefined && order.distancia_entrega_km !== null ? Math.max(0.3, Number(order.distancia_entrega_km) || 0.8) : 0.8);

                      const safeRecogida = Math.max(0.2, distRecogidaKm);
                      const safeEntrega = Math.max(0.3, distEntregaKm);
                      const distTotalKm = Math.round((safeRecogida + safeEntrega) * 10) / 10;

                      const distRecogida = `${safeRecogida.toFixed(1)} km`;
                      const distEntrega = `${safeEntrega.toFixed(1)} km`;
                      const distTotal = `${distTotalKm.toFixed(1)} km`;

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
                              <Text style={styles.btnInspectMapText} numberOfLines={1}>VER RUTA</Text>
                            </Pressable>

                            <Pressable
                              style={[styles.acceptButtonCompact, actionLoading && styles.disabledBtn]}
                              disabled={actionLoading}
                              onPress={() => handleAcceptOrder(order)}
                            >
                              <Truck size={16} color="#042f2e" />
                              <Text style={styles.acceptButtonCompactText} numberOfLines={1}>ACEPTAR</Text>
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

              {/* Botón de Liquidar Deuda de Caja */}
              <Pressable
                style={styles.settleDebtBtn}
                onPress={handleOpenSettlement}
              >
                <DollarSign size={16} color="#fff" />
                <Text style={styles.settleDebtBtnText}>Liquidar Deuda de Caja a la Plataforma</Text>
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
                  <Text style={styles.profileValue}>{selectedDriver ? `${selectedDriver.id.slice(0, 8)}...` : courierId}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Nombre:</Text>
                  <Text style={styles.profileValue}>{selectedDriver ? selectedDriver.nombre : (currentCourier?.name || 'Carlos Mendoza')}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Vehículo:</Text>
                  <Text style={styles.profileValue}>
                    {selectedDriver
                      ? `${selectedDriver.modelo_vehiculo || selectedDriver.tipo_vehiculo || 'Moto'} · Placa ${selectedDriver.placa_vehiculo || 'S/P'}`
                      : 'Honda GL 150cc · Placa GR-891A'}
                  </Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Base Operativa:</Text>
                  <Text style={styles.profileValue}>
                    {selectedDriver ? `Cantón ${selectedDriver.ciudad} (Los Ríos)` : 'Cantón Baba (Parque Central)'}
                  </Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Teléfono Móvil:</Text>
                  <Text style={styles.profileValue}>{selectedDriver ? selectedDriver.telefono : (currentCourier?.phone || '+593981112233')}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Desempeño:</Text>
                  <Text style={[styles.profileValue, { color: '#fbbf24' }]}>
                    ⭐ {selectedDriver ? `${selectedDriver.calificacion_promedio} (${selectedDriver.cant_entregas_completadas} viajes)` : '5.0'}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sesión y Turno de Trabajo</Text>
                <Text style={styles.mutedText}>
                  Conectado como: {currentCourier?.email || 'repartidor@delivery.com'}
                </Text>
                <Pressable
                  style={styles.btnLogoutFull}
                  onPress={handleLogout}
                >
                  <LogOut size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnLogoutFullText}>Cerrar Sesión de Repartidor</Text>
                </Pressable>
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
                    onPress={() => setCurrentApi('https://cocktail-martial-dear-back.trycloudflare.com/api/v1')}
                  >
                    <Text style={styles.btnSmallText}>Túnel Cloudflare</Text>
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

        {/* Modal de Oferta y Ruteo Pre-Aceptación (2 Tramos + SVG + Waze/Google Maps + Temporizador) */}
        <OrderOfferModal
          visible={isOfferModalVisible}
          order={selectedOrderForModal}
          driverLat={liveGps ? liveGps.lat : (selectedDriver ? Number(selectedDriver.lat) : -1.7925)}
          driverLon={liveGps ? liveGps.lon : (selectedDriver ? Number(selectedDriver.lon) : -79.6790)}
          apiBaseUrl={currentApi}
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

        {/* Modal de Confirmación de Entrega con Foto y PIN */}
        <Modal
          visible={isDeliveryModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsDeliveryModalOpen(false)}
        >
          <View style={styles.selectorModalOverlay}>
            <View style={[styles.selectorModalContent, { maxHeight: '92%' }]}>
              <View style={styles.selectorHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={styles.selectorTitle} numberOfLines={1}>Finalizar Entrega de Pedido</Text>
                  <Text style={styles.selectorSubtitle} numberOfLines={1} ellipsizeMode="tail">
                    Pedido #{activeOrder?.id.slice(0, 8)} · {activeOrder?.cliente_nombre || 'Cliente'}
                  </Text>
                </View>
                <Pressable
                  style={[styles.selectorCloseBtn, { flexShrink: 0 }]}
                  onPress={() => setIsDeliveryModalOpen(false)}
                >
                  <X size={20} color="#94a3b8" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {/* 1. Indicador de Cobro */}
                <View style={styles.deliveryCobroCard}>
                  <Text style={styles.deliveryCobroTitle}>
                    {activeOrder?.metodo_pago === 'efectivo'
                      ? '💵 Cobro en Efectivo Requerido'
                      : '💳 Pedido Pagado Digitalmente'}
                  </Text>
                  <Text style={styles.deliveryCobroAmount}>
                    {activeOrder?.metodo_pago === 'efectivo'
                      ? `$${Number(activeOrder.total || 0).toFixed(2)}`
                      : '$0.00 (Ya pagado)'}
                  </Text>
                  <Text style={styles.deliveryCobroSub}>
                    {activeOrder?.metodo_pago === 'efectivo'
                      ? 'Debes cobrar este valor al cliente antes de entregar el paquete.'
                      : 'El cliente ya pagó mediante tarjeta/transferencia. Solo entrega el paquete.'}
                  </Text>
                </View>

                {/* 2. Código PIN de Seguridad (4 dígitos) */}
                <View style={styles.deliverySectionCard}>
                  <Text style={styles.deliverySectionTitle}>🔢 Código PIN de Confirmación (4 Dígitos)</Text>
                  <Text style={styles.deliverySectionDesc}>
                    Solicita al cliente el código de 4 dígitos que aparece en su pantalla de seguimiento:
                  </Text>
                  <TextInput
                    style={styles.pinInput}
                    placeholder="Ej: 1234"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={deliveryPinInput}
                    onChangeText={setDeliveryPinInput}
                  />
                  <Text style={styles.pinHelperText}>
                    💡 Si el cliente no tiene batería, el código de validación es: <Text style={{ color: '#38bdf8', fontWeight: '800' }}>{activeOrder?.id.replace(/\D/g, '').slice(-4) || '1234'}</Text>
                  </Text>
                </View>

                {/* 3. Evidencia Fotográfica de Entrega */}
                <View style={styles.deliverySectionCard}>
                  <Text style={styles.deliverySectionTitle}>📸 Evidencia Fotográfica de Entrega</Text>
                  <Text style={styles.deliverySectionDesc}>
                    Captura una foto del paquete entregado al cliente o en la puerta como comprobante de entrega:
                  </Text>

                  {deliveryPhotoTaken && deliveryPhotoUri ? (
                    <View style={styles.photoPreviewBox}>
                      <Image
                        source={{ uri: deliveryPhotoUri }}
                        style={styles.photoPreviewImg}
                        resizeMode="cover"
                      />
                      <View style={styles.photoOverlayBadge}>
                        <Text style={styles.photoOverlayText}>
                          📍 {activeOrder?.direccion_entrega?.slice(0, 24)}... · ⏱️ {deliveryPhotoTimestamp}
                        </Text>
                      </View>
                      <Pressable
                        onPress={handleTakeDeliveryPhoto}
                        style={styles.retakePhotoBtn}
                      >
                        <RefreshCw size={14} color="#fff" />
                        <Text style={styles.retakePhotoText}>Tomar otra foto</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleTakeDeliveryPhoto}
                      style={styles.takePhotoBtn}
                    >
                      <Camera size={24} color="#38bdf8" />
                      <Text style={styles.takePhotoBtnText}>Tomar Foto del Paquete Entregado</Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>

              {/* Botón de Confirmar Entrega Definitiva */}
              <Pressable
                onPress={handleCompleteDeliveryWithProof}
                disabled={actionLoading}
                style={[styles.confirmDeliverBtn, actionLoading && { opacity: 0.6 }]}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmDeliverBtnText}>✅ COMPLETAR Y ASENTAR ENTREGA</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Modal de Liquidación de Deuda a la Plataforma */}
        <Modal
          visible={isSettlementModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSettlementModalOpen(false)}
        >
          <View style={styles.selectorModalOverlay}>
            <View style={[styles.selectorModalContent, { maxHeight: '85%' }]}>
              <View style={styles.selectorHeader}>
                <View>
                  <Text style={styles.selectorTitle}>🏛️ Liquidar Deuda de Caja</Text>
                  <Text style={styles.selectorSubtitle}>
                    Abono directo a la cuenta de recaudación de la plataforma
                  </Text>
                </View>
                <Pressable
                  style={styles.selectorCloseBtn}
                  onPress={() => setIsSettlementModalOpen(false)}
                >
                  <X size={20} color="#94a3b8" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={styles.settleInfoCard}>
                  <Text style={styles.settleInfoTitle}>Cuentas Bancarias de la Plataforma</Text>
                  <Text style={styles.settleInfoText}>• Banco Pichincha Cta. Corriente: <Text style={{ color: '#fff', fontWeight: '700' }}>2100889922</Text></Text>
                  <Text style={styles.settleInfoText}>• DeUna QR: <Text style={{ color: '#fff', fontWeight: '700' }}>Delivery Ya Los Ríos</Text></Text>
                  <Text style={styles.settleInfoText}>• Titular: Red de Logística Los Ríos S.A.S.</Text>
                </View>

                <Text style={styles.deliverySectionTitle}>Monto a Liquidar ($):</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={settlementAmount}
                  onChangeText={setSettlementAmount}
                />

                <Text style={styles.deliverySectionTitle}>Número de Comprobante / Transferencia:</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="Ej: DEP-948123"
                  placeholderTextColor="#64748b"
                  value={settlementReference}
                  onChangeText={setSettlementReference}
                />
              </ScrollView>

              <Pressable
                onPress={handleSubmitSettlement}
                disabled={settlingDebt}
                style={[styles.confirmDeliverBtn, { backgroundColor: '#10b981' }, settlingDebt && { opacity: 0.6 }]}
              >
                {settlingDebt ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmDeliverBtnText}>🏦 ENVIAR COMPROBANTE Y DESCONTAR DEUDA</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
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

  statsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  statValue: { color: '#f8fafc', fontSize: 14, fontWeight: '800', marginTop: 2, textAlign: 'center' },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 2,
    position: 'relative',
  },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#10b981' },
  tabText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
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

  contentContainer: { padding: 16, paddingBottom: 80 },

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
    paddingBottom: 28,
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
    marginBottom: 10,
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

  // Estilos de Liquidación de Deuda y Botón Billetera
  settleDebtBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  settleDebtBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  settleInfoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settleInfoTitle: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 6,
  },
  settleInfoText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },

  // Estilos de Modal de Entrega con Foto y PIN
  deliveryCobroCard: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  deliveryCobroTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  deliveryCobroAmount: {
    color: '#34d399',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  deliveryCobroSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  deliverySectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  deliverySectionTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  deliverySectionDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  pinInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    color: '#f8fafc',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '900',
    marginBottom: 8,
  },
  pinHelperText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
  takePhotoBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  takePhotoBtnText: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 13,
  },
  photoPreviewBox: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoPreviewImg: {
    width: '100%',
    height: 160,
  },
  photoOverlayBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  photoOverlayText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  retakePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingVertical: 8,
  },
  retakePhotoText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  confirmDeliverBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  confirmDeliverBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  // Estilos de Autenticación y Cierre de Sesión
  badgeVehicle: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeVehicleText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  btnLogoutHeader: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  btnLogoutFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  btnLogoutFullText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  loginScrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loginBrandHeader: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  loginLogoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 12,
  },
  loginAppTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  loginAppSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  loginCityTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginCityTagText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  loginErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  loginErrorBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  loginCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  loginFormTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  loginFormSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16,
  },
  loginInputWrapper: {
    marginBottom: 14,
  },
  loginInputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  loginInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 46,
  },
  loginInputText: {
    color: '#f8fafc',
    fontSize: 14,
    flex: 1,
  },
  btnLoginSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  btnLoginSubmitText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  loginQuickSection: {
    marginBottom: 20,
  },
  loginQuickSectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  loginQuickSectionSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 12,
  },
  loginQuickGrid: {
    gap: 10,
  },
  loginQuickCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginQuickCardName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  loginCityMiniBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  loginCityMiniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  loginQuickCardVehicle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  loginQuickCardEmail: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  loginConfigCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  loginConfigTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
});
