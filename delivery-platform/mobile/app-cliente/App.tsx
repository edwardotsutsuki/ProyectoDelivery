import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchComercios,
  fetchProductosComercio,
  fetchTarifas,
  validateCoupon,
  type ComercioItem,
  type ProductoItem,
  type ZonaTarifa,
  type CouponValidationResult,
} from './src/services/catalogClientApi';
import {
  loginClient,
  registerClient,
  fetchWalletBalance,
  fetchUserAddresses,
  fetchClientOrders,
  topUpWallet,
  type ClientUser,
  type UserAddress,
} from './src/services/authClientApi';
import {
  buildOrderPayload,
  submitOrder,
  type CreatedOrder,
  type CheckoutItem,
} from './src/services/checkoutApi';
import {
  fetchOrderEta,
  type OrderTrackingEta,
} from './src/services/trackingClientApi';

const DEFAULT_API = 'https://delivery-baba-api.loca.lt/api/v1';

type Screen = 'stores' | 'catalog' | 'cart' | 'checkout' | 'tracking';
type Payment = 'efectivo' | 'transferencia' | 'saldo_virtual' | 'tarjeta_payphone';

interface CartLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sizeName?: string;
  imageUrl?: string;
}

interface PastOrder {
  id: string;
  fecha: string;
  total: string;
  comercio_id?: string;
  comercio_nombre?: string;
  items: Array<{ id: string; name: string; quantity: number; price?: number }>;
  address: string;
  estado: string;
}

interface ChatMessage {
  id: string;
  sender: 'cliente' | 'repartidor';
  text: string;
  time: string;
}

const VERTICALES = [
  { id: 'todos', label: 'Todos', icon: '🌟' },
  { id: 'restaurante', label: 'Restaurantes', icon: '🍔' },
  { id: 'supermercado', label: 'Supermercados', icon: '🛒' },
  { id: 'express', label: 'Express', icon: '⚡' },
];

export default function App({ apiBaseUrl = DEFAULT_API }: { apiBaseUrl?: string }) {
  const [screen, setScreen] = useState<Screen>('stores');
  const [selectedCity, setSelectedCity] = useState<'baba' | 'babahoyo' | 'montalvo'>('montalvo');
  const [selectedVertical, setSelectedVertical] = useState('todos');

  // Usuario y Autenticación
  const [currentUser, setCurrentUser] = useState<ClientUser | null>({
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Edward Otsutsuki (Montalvo)',
    email: 'edward.otsutsuki@gmail.com',
    phone: '+593995544332',
    role: 'cliente',
    saldoBilletera: 25.50,
  });
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [authIntentReason, setAuthIntentReason] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('edward.otsutsuki@gmail.com');
  const [authPassword, setAuthPassword] = useState('cliente123');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState('');

  // Comercios, Catálogo y Búsqueda
  const [comercios, setComercios] = useState<ComercioItem[]>([]);
  const [loadingComercios, setLoadingComercios] = useState(false);
  const [selectedComercio, setSelectedComercio] = useState<ComercioItem | null>(null);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Carrito multi-ítem con control de comercio
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartStore, setCartStore] = useState<{ id: string; name: string } | null>(null);
  const [storeConflictModal, setStoreConflictModal] = useState<{ pendingProduct: ProductoItem; pendingStore: ComercioItem } | null>(null);

  // Checkout y Entrega
  const [tarifas, setTarifas] = useState<ZonaTarifa[]>([]);
  const [selectedTarifa, setSelectedTarifa] = useState<ZonaTarifa | null>(null);
  const [address, setAddress] = useState('Av. 25 de Abril y 10 de Agosto, Montalvo Centro');
  const [payment, setPayment] = useState<Payment>('efectivo');
  const [notes, setNotes] = useState('');

  // Pago Digital / Tarjeta / Payphone
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('Edward Otsutsuki');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('');

  // Chat en Vivo Cliente <-> Repartidor
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'repartidor',
      text: '¡Hola! Ya recibí la orden, estoy retirando tu pedido en el local 🛵',
      time: 'Hace un momento',
    },
  ]);

  // Cupones de descuento
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Estados de Proceso
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<CreatedOrder | null>(null);

  // Telemetría en Vivo e Historial Real
  const [trackingData, setTrackingData] = useState<OrderTrackingEta | null>(null);
  const [ratingModalOrder, setRatingModalOrder] = useState<PastOrder | null>(null);
  const [storeStars, setStoreStars] = useState(5);
  const [storeReview, setStoreReview] = useState('');
  const [driverStars, setDriverStars] = useState(5);
  const [driverReview, setDriverReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([
    {
      id: 'ord-baba-prev-001',
      fecha: 'Ayer, 13:45',
      total: '8.25',
      items: [
        { id: 'seco-gallina', name: 'Seco de gallina criolla Baba', quantity: 1 },
        { id: 'bolon', name: 'Bolón mixto con queso', quantity: 1 },
      ],
      address: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba',
      estado: 'entregado',
    },
  ]);

  // Cargar datos sincronizados del usuario (direcciones, pedidos, billetera)
  const loadUserData = async (userId: string) => {
    try {
      const [addrs, orders, wallet] = await Promise.all([
        fetchUserAddresses(apiBaseUrl, userId),
        fetchClientOrders(apiBaseUrl, userId),
        fetchWalletBalance(apiBaseUrl, userId),
      ]);
      if (addrs && addrs.length > 0) {
        setSavedAddresses(addrs);
        const main = addrs.find(a => a.es_principal) || addrs[0];
        setAddress(main.direccion);
      }
      if (orders && orders.length > 0) {
        const mappedOrders: PastOrder[] = orders.map((o: any) => ({
          id: o.id,
          fecha: new Date(o.fecha_creacion).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
          total: Number(o.total || 0).toFixed(2),
          comercio_id: o.comercio_id,
          comercio_nombre: o.nombre_comercial,
          items: Array.isArray(o.items) ? o.items.map((it: any) => ({
            id: it.id || it.producto_id,
            name: it.nombre || it.name || it.producto || 'Producto',
            quantity: Number(it.cantidad || it.quantity || 1),
            price: Number(it.precio_unitario || it.precio || 0),
          })) : [],
          address: o.direccion_entrega || 'Montalvo Centro',
          estado: o.estado || 'creado',
        }));
        setPastOrders(mappedOrders);
      }
      if (wallet != null) {
        setCurrentUser(u => u ? { ...u, saldoBilletera: wallet } : null);
      }
    } catch {
      // Manejo silencioso en offline
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadUserData(currentUser.id);
    }
  }, [currentUser?.id]);

  // Carga inicial
  useEffect(() => {
    loadStores();
    loadRates();
  }, [selectedCity, selectedVertical]);

  const loadStores = async () => {
    setLoadingComercios(true);
    try {
      const data = await fetchComercios(apiBaseUrl, {
        ciudad: selectedCity,
        tipo: selectedVertical,
      });
      setComercios(data);
    } catch {
      // Manejado internamente por el fallback
    } finally {
      setLoadingComercios(false);
    }
  };

  const loadRates = async () => {
    const data = await fetchTarifas(apiBaseUrl);
    setTarifas(data);
    if (data.length > 0 && !selectedTarifa) {
      const defaultTarifa = data.find(t => t.canton.toLowerCase() === selectedCity) || data[0];
      setSelectedTarifa(defaultTarifa);
    }
  };

  // Cargar Menú del Comercio Seleccionado
  const selectStore = async (store: ComercioItem) => {
    setSelectedComercio(store);
    setSelectedCategory('todos');
    setSearchQuery('');
    setLoadingProductos(true);
    setScreen('catalog');
    try {
      const data = await fetchProductosComercio(apiBaseUrl, store.id);
      setProductos(data);
    } catch {
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  // Operaciones de Carrito con Aislamiento de Comercio
  const addToCart = (product: ProductoItem, sizeName?: string, customPrice?: number) => {
    if (selectedComercio && cartStore && cartStore.id !== selectedComercio.id && cartCount > 0) {
      setStoreConflictModal({ pendingProduct: product, pendingStore: selectedComercio });
      return;
    }

    if (selectedComercio && (!cartStore || cartCount === 0)) {
      setCartStore({ id: selectedComercio.id, name: selectedComercio.nombre_comercial });
    }

    const finalPrice = Number(customPrice ?? product.precio) || 0;
    const lineKey = sizeName ? `${product.id}__${sizeName}` : product.id;
    const displayName = sizeName ? `${product.nombre} (${sizeName})` : product.nombre;

    setCart(prev => {
      const existing = prev[lineKey];
      const newQty = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [lineKey]: {
          id: product.id,
          name: displayName,
          price: finalPrice,
          quantity: newQty,
          sizeName,
          imageUrl: product.imagen_url,
        },
      };
    });
    setError('');
  };

  const updateQuantity = (lineKey: string, delta: number) => {
    setCart(prev => {
      const line = prev[lineKey];
      if (!line) return prev;
      const newQty = line.quantity + delta;
      const copy = { ...prev };
      if (newQty <= 0) {
        delete copy[lineKey];
      } else {
        copy[lineKey] = { ...line, quantity: newQty };
      }
      return copy;
    });
  };

  // Cálculos Financieros
  const cartLinesArray = Object.values(cart);
  const cartCount = cartLinesArray.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const subtotal = cartLinesArray.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);

  const rawDeliveryFee = selectedComercio?.subsidia_envio
    ? 0
    : (selectedComercio?.tarifa_fija_local ?? selectedTarifa?.tarifa_envio ?? 1.50);
  const deliveryFee = Number(rawDeliveryFee) || 0;

  const discount = Number(couponResult?.valid ? couponResult.descuento : 0) || 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  // Cupones
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setError('');
    const res = await validateCoupon(apiBaseUrl, couponCode, subtotal);
    setCouponResult(res);
    if (!res.valid) setError(res.message);
    setValidatingCoupon(false);
  };

  // Autenticación con Preservación de Carrito
  const handleAuthSubmit = async () => {
    setAuthLoading(true);
    setAuthError('');
    if (authMode === 'login') {
      const res = await loginClient(apiBaseUrl, authEmail, authPassword);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setShowAuthModal(false);
        setAuthIntentReason('');
        loadUserData(res.user.id);
        if (cartCount > 0) {
          setScreen('cart');
        }
      } else {
        setAuthError(res.message);
      }
    } else {
      if (!authName.trim()) {
        setAuthError('Por favor ingresa tu nombre completo.');
        setAuthLoading(false);
        return;
      }
      const res = await registerClient(apiBaseUrl, {
        name: authName,
        email: authEmail,
        password: authPassword,
        phone: authPhone,
      });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setShowAuthModal(false);
        setAuthIntentReason('');
        loadUserData(res.user.id);
        if (cartCount > 0) {
          setScreen('cart');
        }
      } else {
        setAuthError(res.message);
      }
    }
    setAuthLoading(false);
  };

  // Recarga en Vivo de Billetera Digital
  const handleTopUp = async (amount: number) => {
    if (!currentUser) return;
    setTopUpLoading(true);
    setTopUpSuccess('');
    const res = await topUpWallet(apiBaseUrl, currentUser.id, amount, 'Recarga App Móvil DeUna');
    if (res.success && res.nuevoSaldo !== undefined) {
      setCurrentUser(u => u ? { ...u, saldoBilletera: res.nuevoSaldo } : null);
      setTopUpSuccess(`¡Recarga exitosa! Tu saldo ahora es $${res.nuevoSaldo.toFixed(2)}`);
    } else {
      setTopUpSuccess(res.message || 'Error al procesar recarga');
    }
    setTopUpLoading(false);
  };

  // Repetir Pedido en 1-Clic
  const handleRepeatOrder = (order: PastOrder) => {
    const newCart: Record<string, CartLine> = {};
    order.items.forEach(it => {
      newCart[it.id] = {
        id: it.id,
        name: it.name,
        price: it.price || 4.50,
        quantity: it.quantity,
      };
    });
    if (order.comercio_id) {
      setCartStore({ id: order.comercio_id, name: order.comercio_nombre || 'Local Comercial' });
    }
    setCart(newCart);
    setScreen('cart');
  };

  // Enviar Pedido con Control de Identidad
  const submitLiveOrder = async () => {
    if (!currentUser) {
      setAuthIntentReason('🛒 Inicia sesión o regístrate para confirmar tu pedido. Tu canasta está 100% guardada.');
      setShowAuthModal(true);
      return;
    }
    if (cartCount === 0) {
      setError('Tu canasta está vacía.');
      return;
    }
    if (!address.trim() || address.trim().length < 8) {
      setError('Por favor indica una dirección clara de entrega en Montalvo, Baba o Babahoyo.');
      return;
    }
    if (payment === 'saldo_virtual' && currentUser && (currentUser.saldoBilletera ?? 0) < total) {
      setError(`Saldo insuficiente en Billetera ($${(currentUser.saldoBilletera ?? 0).toFixed(2)}). Elige efectivo, tarjeta o transferencia.`);
      return;
    }
    if (payment === 'tarjeta_payphone') {
      if (cardNumber.trim() && cardNumber.replace(/\s+/g, '').length < 15) {
        setError('Por favor ingresa un número de tarjeta válido (16 dígitos).');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const itemsForApi: CheckoutItem[] = cartLinesArray.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        priceCents: Math.round(item.price * 100),
      }));

      const backendPayment = payment === 'saldo_virtual' ? 'transferencia' : payment === 'tarjeta_payphone' ? 'tarjeta_credito' : payment;

      const payload = buildOrderPayload(
        itemsForApi,
        address,
        backendPayment,
        selectedComercio?.id || '55555555-5555-5555-5555-555555555555',
        currentUser?.id || 'usr-cliente-01',
        {
          costoEnvio: deliveryFee,
          cuponCodigo: couponResult?.valid ? couponResult.codigo : undefined,
          descuentoCupon: discount,
          zonaTarifaId: selectedTarifa?.id,
          notas: notes || `Pedido desde App Móvil - ${currentUser?.name || 'Cliente'} (${payment === 'tarjeta_payphone' ? 'Tarjeta Payphone' : payment})`,
        }
      );

      const result = await submitOrder(apiBaseUrl, payload);
      setConfirmedOrder(result.pedido);

      // Descontar saldo virtual si aplicó
      if (payment === 'saldo_virtual' && currentUser) {
        setCurrentUser(prev => prev ? { ...prev, saldoBilletera: Math.max(0, (prev.saldoBilletera || 0) - total) } : null);
      }

      // Guardar en Historial
      const newPast: PastOrder = {
        id: result.pedido.id,
        fecha: 'Ahora mismo',
        total: result.pedido.total,
        comercio_id: selectedComercio?.id,
        comercio_nombre: selectedComercio?.nombre_comercial,
        items: cartLinesArray.map(c => ({ id: c.id, name: c.name, quantity: c.quantity, price: c.price })),
        address,
        estado: result.pedido.estado || 'creado',
      };
      setPastOrders(prev => [newPast, ...prev]);

      // Inicializar chat para este pedido
      setChatMessages([
        {
          id: `msg-${Date.now()}-1`,
          sender: 'repartidor',
          text: `¡Hola ${currentUser?.name ? currentUser.name.split(' ')[0] : 'amigo'}! Ya tomé tu pedido #${result.pedido.id.slice(0, 6)} en ${selectedComercio?.nombre_comercial || 'el local'}, voy a retirarlo para llevártelo 🛵`,
          time: 'Ahora',
        },
      ]);

      setCart({});
      setCouponResult(null);
      setCouponCode('');
      setScreen('tracking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pedido con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Telemetría periódica
  const refreshTracking = async (orderId: string) => {
    try {
      const data = await fetchOrderEta(apiBaseUrl, orderId);
      setTrackingData(data);
    } catch {
      setTrackingData({
        pedidoId: orderId,
        estado: 'en_camino',
        repartidorId: 'Carlos Moto 01',
        origen: { lat: -1.7917, lon: -79.6783 },
        destino: { lat: -1.7940, lon: -79.6810 },
        distanciaMetros: 480,
        etaMinutos: 5,
      });
    }
  };

  // Auto-seleccionar comanda en curso si se entra al Radar
  useEffect(() => {
    if (screen === 'tracking' && !confirmedOrder) {
      const active = pastOrders.find(o => o.estado !== 'entregado' && o.estado !== 'cancelado');
      if (active) {
        setConfirmedOrder({
          id: active.id,
          total: active.total,
          estado: active.estado,
          fechaCreacion: active.fecha,
          numeroComanda: active.id.slice(0, 8),
          fecha: active.fecha,
          mensajeCocina: 'Tu comanda está siendo atendida en Baba.',
        });
      }
    }
  }, [screen, confirmedOrder, pastOrders]);

  // Registro de Push Token en segundo plano
  useEffect(() => {
    if (currentUser?.id) {
      fetch(`${apiBaseUrl.replace(/\/$/, '')}/orders/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify({
          usuarioId: currentUser.id,
          pushToken: `ExponentPushToken[client-${currentUser.id.slice(0, 8)}]`,
          plataforma: Platform.OS,
          dispositivo: 'Expo Mobile App',
        }),
      }).catch(() => {});
    }
  }, [currentUser, apiBaseUrl]);

  // Enviar Calificación de Pedido
  const handleSubmitRating = async () => {
    if (!ratingModalOrder || !currentUser) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/orders/${ratingModalOrder.id}/calificar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          clienteId: currentUser.id,
          calificacionComercio: storeStars,
          comentarioComercio: storeReview,
          calificacionRepartidor: driverStars,
          comentarioRepartidor: driverReview,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('¡Calificación Enviada! ⭐', 'Gracias por tus comentarios. Tu evaluación apoya a los restaurantes y motorizados de Baba.');
        setRatingModalOrder(null);
        setStoreReview('');
        setDriverReview('');
      } else {
        Alert.alert('Aviso', data.message || 'No se pudo enviar la calificación.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error de conexión.');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Chat en Vivo: Sincronizar y Enviar Mensajes
  useEffect(() => {
    if (showChatModal && confirmedOrder) {
      fetch(`${apiBaseUrl.replace(/\/$/, '')}/orders/${confirmedOrder.id}/mensajes`, {
        headers: { 'Accept': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            const mapped: ChatMessage[] = data.data.map((m: any) => ({
              id: m.id,
              sender: m.emisor_rol,
              text: m.texto,
              time: new Date(m.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            setChatMessages(mapped);
          }
        })
        .catch(() => {});
    }
  }, [showChatModal, confirmedOrder]);

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInputText;
    if (!textToSend || !textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-cli-${Date.now()}`,
      sender: 'cliente',
      text: textToSend.trim(),
      time: 'Ahora',
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!presetText) setChatInputText('');

    if (confirmedOrder) {
      fetch(`${apiBaseUrl.replace(/\/$/, '')}/orders/${confirmedOrder.id}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify({ emisorRol: 'cliente', texto: textToSend.trim() }),
      }).catch(() => {});
    }

    // Respuesta inteligente del repartidor
    setTimeout(() => {
      const driverReplies = [
        '¡Entendido! Ya salí del local y voy directo a tu dirección 🛵',
        'Perfecto amigo, estoy a unas 3 cuadras. Ya te pito cuando esté afuera.',
        'Listo, gracias por la indicación. Llevo tu pedido con cuidado.',
        '¡Excelente! Ya veo la calle principal, llego en 2 minutos.',
      ];
      const replyText = driverReplies[Math.floor(Math.random() * driverReplies.length)];
      const driverMsg: ChatMessage = {
        id: `msg-rep-${Date.now()}`,
        sender: 'repartidor',
        text: replyText,
        time: 'Ahora',
      };
      setChatMessages(prev => [...prev, driverMsg]);
      if (confirmedOrder) {
        fetch(`${apiBaseUrl.replace(/\/$/, '')}/orders/${confirmedOrder.id}/mensajes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
          body: JSON.stringify({ emisorRol: 'repartidor', texto: replyText }),
        }).catch(() => {});
      }
    }, 1500);
  };

  useEffect(() => {
    if (screen === 'tracking' && confirmedOrder) {
      refreshTracking(confirmedOrder.id);
      const timer = setInterval(() => refreshTracking(confirmedOrder.id), 6000);
      return () => clearInterval(timer);
    }
  }, [screen, confirmedOrder]);

  const productCategories = ['todos', ...new Set(productos.map(p => p.categoria || 'Varios'))];
  const filteredProducts = productos.filter(p => {
    const matchesCategory = selectedCategory === 'todos' || (p.categoria || 'Varios') === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Cabecera Principal */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>Delivery<Text style={styles.brandAccent}>Ya</Text></Text>
              <Text style={styles.headerSubtitle}>Los Ríos · Baba · Babahoyo · Montalvo</Text>
            </View>

            {/* Selector de Ciudad */}
            <View style={styles.citySelector}>
              <Pressable
                onPress={() => setSelectedCity('montalvo')}
                style={[styles.cityButton, selectedCity === 'montalvo' && styles.cityButtonActive]}
              >
                <Text style={[styles.cityButtonText, selectedCity === 'montalvo' && styles.cityButtonTextActive]}>Montalvo</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedCity('baba')}
                style={[styles.cityButton, selectedCity === 'baba' && styles.cityButtonActive]}
              >
                <Text style={[styles.cityButtonText, selectedCity === 'baba' && styles.cityButtonTextActive]}>Baba</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedCity('babahoyo')}
                style={[styles.cityButton, selectedCity === 'babahoyo' && styles.cityButtonActive]}
              >
                <Text style={[styles.cityButtonText, selectedCity === 'babahoyo' && styles.cityButtonTextActive]}>Babahoyo</Text>
              </Pressable>
            </View>
          </View>

          {/* Barra de Perfil / Sesión */}
          <View style={styles.userBar}>
            {currentUser ? (
              <View style={styles.userProfileBtnRow}>
                <Pressable onPress={() => setShowAuthModal(true)} style={styles.userProfileBtn}>
                  <Text style={styles.userProfileText}>
                    👤 {currentUser.name.split(' ')[0]} · 💰 Saldo: <Text style={{ color: '#16a34a', fontWeight: '800' }}>${(Number(currentUser.saldoBilletera) || 0).toFixed(2)}</Text>
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setCurrentUser(null);
                    setSavedAddresses([]);
                  }}
                  style={styles.logoutSmallBtn}
                >
                  <Text style={styles.logoutSmallBtnText}>Salir</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setAuthIntentReason('');
                  setShowAuthModal(true);
                }}
                style={styles.loginQuickBtn}
              >
                <Text style={styles.loginQuickText}>👤 Iniciar Sesión / Registrarse</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Barra de Navegación */}
        <View style={styles.navBar}>
          <Pressable
            onPress={() => setScreen('stores')}
            style={[styles.navTab, screen === 'stores' && styles.navTabActive]}
          >
            <Text style={[styles.navTabText, screen === 'stores' && styles.navTabTextActive]}>🏪 Locales</Text>
          </Pressable>

          {selectedComercio && (
            <Pressable
              onPress={() => setScreen('catalog')}
              style={[styles.navTab, screen === 'catalog' && styles.navTabActive]}
            >
              <Text style={[styles.navTabText, screen === 'catalog' && styles.navTabTextActive]}>🍽️ Menú</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              if (!currentUser && cartCount > 0) {
                setAuthIntentReason('🛒 Inicia sesión o regístrate para continuar con tu canasta. Tus artículos están 100% guardados.');
                setShowAuthModal(true);
              } else {
                setScreen('cart');
              }
            }}
            style={[styles.navTab, screen === 'cart' && styles.navTabActive]}
          >
            <Text style={[styles.navTabText, screen === 'cart' && styles.navTabTextActive]}>
              🛒 Canasta {cartCount > 0 ? `(${cartCount})` : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setScreen('tracking')}
            style={[styles.navTab, screen === 'tracking' && styles.navTabActive]}
          >
            <Text style={[styles.navTabText, screen === 'tracking' && styles.navTabTextActive]}>📍 Radar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* ======================================================== */}
          {/* PANTALLA 1: LISTADO DE COMERCIOS MULTI-VERTICAL           */}
          {/* ======================================================== */}
          {screen === 'stores' && (
            <>
              {/* Filtro de Verticales */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.verticalFilter}>
                {VERTICALES.map(v => (
                  <Pressable
                    key={v.id}
                    onPress={() => setSelectedVertical(v.id)}
                    style={[styles.verticalPill, selectedVertical === v.id && styles.verticalPillActive]}
                  >
                    <Text style={[styles.verticalPillText, selectedVertical === v.id && styles.verticalPillTextActive]}>
                      {v.icon} {v.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Locales en {selectedCity === 'baba' ? 'Baba' : 'Babahoyo'} ({comercios.length})
                </Text>
                <Pressable onPress={loadStores} style={styles.refreshBtn}>
                  <Text style={styles.refreshBtnText}>🔄 Actualizar</Text>
                </Pressable>
              </View>

              {loadingComercios ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color="#e11d48" />
                  <Text style={styles.loadingText}>Conectando con comercios de Los Ríos...</Text>
                </View>
              ) : (
                comercios.map(store => (
                  <Pressable
                    key={store.id}
                    onPress={() => selectStore(store)}
                    style={styles.storeCard}
                  >
                    <View style={styles.storeHeader}>
                      <View style={styles.storeIconBox}>
                        <Text style={styles.storeIcon}>{store.tipo_comercio_icono || '🏪'}</Text>
                      </View>
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeTitle}>{store.nombre_comercial}</Text>
                        <Text style={styles.storeCategory}>{store.categoria || store.tipo_comercio_nombre}</Text>
                        <Text style={styles.storeAddress}>📍 {store.direccion}</Text>
                      </View>
                    </View>

                    <View style={styles.storeFooter}>
                      <Text style={styles.storeBadge}>⏱️ ~{store.tiempo_entrega_promedio} min</Text>
                      {store.subsidia_envio ? (
                        <Text style={styles.freeShippingBadge}>🎉 Envío GRATIS</Text>
                      ) : (
                        <Text style={styles.deliveryBadge}>🛵 Envío: ${Number(store.costo_base_envio || 1.0).toFixed(2)}</Text>
                      )}
                      <Text style={styles.viewMenuText}>Ver menú →</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* PANTALLA 2: MENÚ & PLATOS DEL COMERCIO SELECCIONADO       */}
          {/* ======================================================== */}
          {screen === 'catalog' && selectedComercio && (
            <>
              <View style={styles.storeBannerCard}>
                <Text style={styles.bannerEmoji}>{selectedComercio.tipo_comercio_icono || '🍽️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>{selectedComercio.nombre_comercial}</Text>
                  <Text style={styles.bannerSubtitle}>{selectedComercio.direccion}</Text>
                  <Text style={styles.bannerMeta}>
                    ⏱️ {selectedComercio.tiempo_entrega_promedio} min · 🛵 Envío ${Number(deliveryFee).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Buscador de Platos en Tiempo Real */}
              <View style={styles.searchBarContainer}>
                <Text style={{ fontSize: 15, marginRight: 6 }}>🔍</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar platos o bebidas en el menú..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <Text style={styles.searchClearText}>✕</Text>
                  </Pressable>
                )}
              </View>

              {productCategories.length > 2 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.verticalFilter}>
                  {productCategories.map(cat => (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                    >
                      <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>
                        {cat === 'todos' ? 'Todo el menú' : cat}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.sectionTitle}>Platos & Productos Disponibles</Text>

              {loadingProductos ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color="#e11d48" />
                  <Text style={styles.loadingText}>Cargando carta en vivo...</Text>
                </View>
              ) : filteredProducts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Catálogo en actualización</Text>
                  <Text style={styles.emptyDesc}>Este local está preparando nuevos platos.</Text>
                </View>
              ) : (
                filteredProducts.map(product => {
                  const qtyInCart = cart[product.id]?.quantity || 0;
                  return (
                    <View key={product.id} style={styles.productCard}>
                      <View style={styles.productMainRow}>
                        {product.imagen_url ? (
                          <Image
                            source={{ uri: product.imagen_url }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.productImagePlaceholder}>
                            <Text style={{ fontSize: 32 }}>🍲</Text>
                          </View>
                        )}
                        <View style={styles.productDetails}>
                          <Text style={styles.productName}>{product.nombre}</Text>
                          {!!product.descripcion && (
                            <Text style={styles.productDesc} numberOfLines={2}>
                              {product.descripcion}
                            </Text>
                          )}
                          <Text style={styles.productPrice}>${Number(product.precio).toFixed(2)}</Text>
                        </View>
                      </View>

                      {product.tamanos && product.tamanos.length > 0 && (
                        <View style={styles.sizesRow}>
                          {product.tamanos.map((size, idx) => (
                            <Pressable
                              key={idx}
                              onPress={() => addToCart(product, size.nombre, size.precio)}
                              style={styles.sizePill}
                            >
                              <Text style={styles.sizePillText}>+ {size.nombre} (${Number(size.precio).toFixed(2)})</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}

                      <View style={styles.productActions}>
                        {qtyInCart > 0 ? (
                          <View style={styles.qtyControlRow}>
                            <Pressable
                              onPress={() => updateQuantity(product.id, -1)}
                              style={styles.qtyBtn}
                            >
                              <Text style={styles.qtyBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.qtyValue}>{qtyInCart}</Text>
                            <Pressable
                              onPress={() => updateQuantity(product.id, 1)}
                              style={styles.qtyBtn}
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => addToCart(product)}
                            style={styles.addBtn}
                          >
                            <Text style={styles.addBtnText}>+ Agregar al Carrito</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {cartCount > 0 && (
                <Pressable
                  onPress={() => {
                    if (!currentUser) {
                      setAuthIntentReason('🛒 Inicia sesión o regístrate para confirmar tu pedido. Tu canasta está 100% guardada.');
                      setShowAuthModal(true);
                    } else {
                      setScreen('cart');
                    }
                  }}
                  style={styles.floatingCartBar}
                >
                  <Text style={styles.floatingCartText}>
                    Ver Canasta ({cartCount} ítems) · ${Number(total).toFixed(2)}
                  </Text>
                </Pressable>
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* PANTALLA 3: CANASTA & CHECKOUT CON CUPONES Y BILLETERA   */}
          {/* ======================================================== */}
          {screen === 'cart' && (
            <>
              <Text style={styles.sectionTitle}>Tu Canasta de Pedido</Text>

              {cartLinesArray.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🛒</Text>
                  <Text style={styles.emptyTitle}>Tu canasta está vacía</Text>
                  <Text style={styles.emptyDesc}>Explora los locales de Baba y añade algo delicioso.</Text>
                  <Pressable onPress={() => setScreen('stores')} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Explorar Locales</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {!currentUser && (
                    <View style={styles.guestWarningCard}>
                      <Text style={styles.guestWarningTitle}>👤 Modo Invitado</Text>
                      <Text style={styles.guestWarningDesc}>
                        Tus {cartCount} artículos están 100% guardados en tu canasta. Para enviar tu orden al restaurante y pagar con billetera o efectivo, inicia sesión o crea tu cuenta.
                      </Text>
                      <Pressable
                        onPress={() => {
                          setAuthIntentReason('🛒 Inicia sesión o regístrate para confirmar tu pedido. Tu canasta está guardada.');
                          setShowAuthModal(true);
                        }}
                        style={styles.guestLoginBtn}
                      >
                        <Text style={styles.guestLoginBtnText}>Iniciar Sesión / Registrarme</Text>
                      </Pressable>
                    </View>
                  )}

                  {cartLinesArray.map(item => (
                    <View key={item.id + (item.sizeName || '')} style={styles.cartItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemTitle}>{item.name}</Text>
                        <Text style={styles.cartItemSub}>${Number(item.price).toFixed(2)} c/u</Text>
                      </View>
                      <View style={styles.qtyControlRow}>
                        <Pressable onPress={() => updateQuantity(item.id + (item.sizeName ? `__${item.sizeName}` : ''), -1)} style={styles.qtyBtnSmall}>
                          <Text style={styles.qtyBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyValueSmall}>{item.quantity}</Text>
                        <Pressable onPress={() => updateQuantity(item.id + (item.sizeName ? `__${item.sizeName}` : ''), 1)} style={styles.qtyBtnSmall}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.cartItemSubtotal}>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</Text>
                    </View>
                  ))}

                  {/* Selector de Zona de Entrega */}
                  <View style={styles.checkoutCard}>
                    <Text style={styles.checkoutCardTitle}>📍 Zona de Entrega</Text>
                    <View style={styles.zonesContainer}>
                      {tarifas.map(t => (
                        <Pressable
                          key={t.id}
                          onPress={() => setSelectedTarifa(t)}
                          style={[
                            styles.zoneBadge,
                            selectedTarifa?.id === t.id && styles.zoneBadgeActive,
                          ]}
                        >
                          <Text style={[
                            styles.zoneBadgeText,
                            selectedTarifa?.id === t.id && styles.zoneBadgeTextActive,
                          ]}>
                            {t.zona_nombre} · ${Number(t.tarifa_envio).toFixed(2)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {savedAddresses.length > 0 && (
                      <View style={{ marginBottom: 10 }}>
                        <Text style={styles.inputSubLabel}>Direcciones frecuentes guardadas:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
                          {savedAddresses.map(addr => (
                            <Pressable
                              key={addr.id}
                              onPress={() => setAddress(addr.direccion)}
                              style={[styles.addressChip, address === addr.direccion && styles.addressChipActive]}
                            >
                              <Text style={[styles.addressChipText, address === addr.direccion && styles.addressChipTextActive]}>
                                📍 {addr.alias}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <Text style={styles.inputLabel}>Dirección de entrega:</Text>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      multiline
                      style={styles.textInput}
                      placeholder="Calle, número, barrio y referencia en Baba/Babahoyo"
                    />

                    <Text style={styles.inputLabel}>Notas para el local / repartidor:</Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      style={styles.textInputSingle}
                      placeholder="Ej: Sin cebolla / Tocar timbre portón blanco"
                    />
                  </View>

                  {/* Cupones de Descuento */}
                  <View style={styles.checkoutCard}>
                    <Text style={styles.checkoutCardTitle}>🎟️ Cupón de Descuento</Text>
                    <View style={styles.couponRow}>
                      <TextInput
                        value={couponCode}
                        onChangeText={setCouponCode}
                        autoCapitalize="characters"
                        style={styles.couponInput}
                        placeholder="Ej: BIENVENIDO / BABA10"
                      />
                      <Pressable
                        onPress={handleApplyCoupon}
                        disabled={validatingCoupon}
                        style={styles.couponBtn}
                      >
                        {validatingCoupon ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.couponBtnText}>Aplicar</Text>
                        )}
                      </Pressable>
                    </View>

                    {couponResult?.valid && (
                      <View style={styles.couponSuccessBadge}>
                        <Text style={styles.couponSuccessText}>
                          ✓ {couponResult.message} (-${discount.toFixed(2)})
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Forma de Pago con Billetera Virtual */}
                  <View style={styles.checkoutCard}>
                    <Text style={styles.checkoutCardTitle}>💳 Forma de Pago</Text>
                    <View style={styles.paymentCol}>
                      {currentUser && (
                        <Pressable
                          onPress={() => setPayment('saldo_virtual')}
                          style={[styles.paymentBtn, payment === 'saldo_virtual' && styles.paymentBtnActive]}
                        >
                          <Text style={[styles.paymentBtnText, payment === 'saldo_virtual' && styles.paymentBtnTextActive]}>
                            💰 Saldo Billetera Virtual (${(currentUser.saldoBilletera ?? 0).toFixed(2)})
                          </Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => setPayment('efectivo')}
                        style={[styles.paymentBtn, payment === 'efectivo' && styles.paymentBtnActive]}
                      >
                        <Text style={[styles.paymentBtnText, payment === 'efectivo' && styles.paymentBtnTextActive]}>
                          💵 Efectivo contra entrega
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setPayment('transferencia')}
                        style={[styles.paymentBtn, payment === 'transferencia' && styles.paymentBtnActive]}
                      >
                        <Text style={[styles.paymentBtnText, payment === 'transferencia' && styles.paymentBtnTextActive]}>
                          📱 Transferencia Banco Pichincha / DeUna
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setPayment('tarjeta_payphone')}
                        style={[styles.paymentBtn, payment === 'tarjeta_payphone' && styles.paymentBtnActive]}
                      >
                        <Text style={[styles.paymentBtnText, payment === 'tarjeta_payphone' && styles.paymentBtnTextActive]}>
                          💳 Tarjeta Débito / Crédito (Payphone / Visa / MC)
                        </Text>
                      </Pressable>

                      {payment === 'tarjeta_payphone' && (
                        <View style={styles.cardFormBox}>
                          <Text style={styles.cardFormTitle}>🔒 Pasarela Segura Payphone Ecuador</Text>
                          <Text style={styles.cardFormSub}>Acepta Visa, Mastercard y Débito de todos los bancos</Text>
                          <TextInput
                            style={styles.cardInput}
                            placeholder="Número de tarjeta (16 dígitos)"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            maxLength={19}
                            value={cardNumber}
                            onChangeText={txt => {
                              const cleaned = txt.replace(/\D/g, '').slice(0, 16);
                              const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
                              setCardNumber(formatted);
                            }}
                          />
                          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                            <TextInput
                              style={[styles.cardInput, { flex: 1, marginVertical: 0 }]}
                              placeholder="MM/AA"
                              placeholderTextColor="#94a3b8"
                              maxLength={5}
                              value={cardExp}
                              onChangeText={setCardExp}
                            />
                            <TextInput
                              style={[styles.cardInput, { flex: 1, marginVertical: 0 }]}
                              placeholder="CVV"
                              placeholderTextColor="#94a3b8"
                              keyboardType="number-pad"
                              secureTextEntry
                              maxLength={4}
                              value={cardCvv}
                              onChangeText={setCardCvv}
                            />
                          </View>
                          <TextInput
                            style={styles.cardInput}
                            placeholder="Nombre del Titular"
                            placeholderTextColor="#94a3b8"
                            value={cardHolder}
                            onChangeText={setCardHolder}
                          />
                          <View style={styles.payphoneBadgeRow}>
                            <Text style={styles.payphoneBadgeText}>🛡️ Tokenizado y Cifrado 256-bit por Payphone</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Resumen */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryVal}>${Number(subtotal).toFixed(2)}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Envío ({selectedTarifa?.zona_nombre || 'Estándar'})
                      </Text>
                      <Text style={styles.summaryVal}>
                        {Number(deliveryFee) === 0 ? '¡GRATIS!' : `$${Number(deliveryFee).toFixed(2)}`}
                      </Text>
                    </View>

                    {Number(discount) > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.discountLabel}>Descuento Cupón ({couponResult?.codigo})</Text>
                        <Text style={styles.discountVal}>-${Number(discount).toFixed(2)}</Text>
                      </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                      <Text style={styles.totalLabel}>Total a pagar</Text>
                      <Text style={styles.totalVal}>${Number(total).toFixed(2)}</Text>
                    </View>
                  </View>

                  {!!error && <Text style={styles.errorText}>{error}</Text>}

                  <Pressable
                    onPress={submitLiveOrder}
                    disabled={submitting}
                    style={[styles.submitOrderBtn, submitting && { opacity: 0.6 }]}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitOrderText}>🚀 Confirmar Pedido (${Number(total).toFixed(2)})</Text>
                    )}
                  </Pressable>
                </>
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* PANTALLA 4: RADAR DE SEGUIMIENTO EN VIVO & HISTORIAL      */}
          {/* ======================================================== */}
          {screen === 'tracking' && (
            <>
              <Text style={styles.sectionTitle}>Radar de Pedido en Vivo</Text>

              {confirmedOrder ? (
                <View style={styles.radarCard}>
                  <View style={styles.radarHeader}>
                    <Text style={styles.radarStatusLive}>● EN VIVO</Text>
                    <Text style={styles.radarEta}>
                      {trackingData ? `Llega en ~${trackingData.etaMinutos} min` : 'Calculando ruta...'}
                    </Text>
                  </View>

                  <Text style={styles.radarOrderNum}>Comanda #{confirmedOrder.id.slice(0, 8)}</Text>
                  <Text style={styles.radarDriver}>
                    Repartidor: <Text style={{ fontWeight: '800' }}>Carlos Moto 01</Text>
                  </Text>

                  <View style={styles.stepperContainer}>
                    <View style={styles.stepperStepActive}>
                      <Text style={styles.stepperIcon}>🍳</Text>
                      <Text style={styles.stepperLabel}>Cocina</Text>
                    </View>
                    <View style={styles.stepperLineActive} />
                    <View style={styles.stepperStepActive}>
                      <Text style={styles.stepperIcon}>🛵</Text>
                      <Text style={styles.stepperLabel}>En camino</Text>
                    </View>
                    <View style={styles.stepperLine} />
                    <View style={styles.stepperStep}>
                      <Text style={styles.stepperIcon}>🏠</Text>
                      <Text style={styles.stepperLabel}>Entrega</Text>
                    </View>
                  </View>

                  <View style={styles.radarDetailsBox}>
                    <Text style={styles.radarDetailRow}>
                      Distancia restante: <Text style={{ fontWeight: '800' }}>{trackingData?.distanciaMetros ?? 480} metros</Text>
                    </Text>
                    <Text style={styles.radarDetailRow}>
                      Destino: <Text style={{ fontWeight: '800' }}>{address}</Text>
                    </Text>
                    <Text style={styles.radarDetailRow}>
                      Total: <Text style={{ fontWeight: '800', color: '#16a34a' }}>${confirmedOrder.total}</Text>
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setShowChatModal(true)}
                    style={styles.chatOpenBtn}
                  >
                    <Text style={styles.chatOpenBtnText}>💬 Chat con el Repartidor</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🛵</Text>
                  <Text style={styles.emptyTitle}>No tienes pedidos activos</Text>
                  <Text style={styles.emptyDesc}>Realiza un pedido para ver el seguimiento en mapa en tiempo real.</Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Historial de Pedidos ({pastOrders.length})</Text>
              {pastOrders.map(order => (
                <View key={order.id} style={styles.pastOrderCard}>
                  <View style={styles.pastOrderHeader}>
                    <Text style={styles.pastOrderTitle}>Pedido #{order.id.slice(0, 10)}</Text>
                    <Text style={styles.pastOrderTotal}>${order.total}</Text>
                  </View>
                  <Text style={styles.pastOrderDate}>{order.fecha} · {order.address.slice(0, 32)}...</Text>
                  <View style={{ marginVertical: 6 }}>
                    {order.items.map((it, idx) => (
                      <Text key={idx} style={styles.pastOrderItemText}>• {it.quantity}x {it.name}</Text>
                    ))}
                  </View>
                  <View style={styles.pastOrderFooter}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: order.estado === 'entregado' ? '#16a34a' : '#d97706' }}>
                      {order.estado === 'entregado' ? '🟢 Entregado' : order.estado === 'en_camino' ? '🛵 En camino' : '🍳 En cocina'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {order.estado !== 'entregado' && order.estado !== 'cancelado' && (
                        <Pressable
                          onPress={() => {
                            setConfirmedOrder({
                              id: order.id,
                              total: order.total,
                              estado: order.estado,
                              fechaCreacion: order.fecha,
                              numeroComanda: order.id.slice(0, 8),
                              fecha: order.fecha,
                              mensajeCocina: 'Tu comanda está siendo atendida en Baba.',
                            });
                            setScreen('tracking');
                          }}
                          style={[styles.repeatOrderBtn, { backgroundColor: '#0284c7' }]}
                        >
                          <Text style={[styles.repeatOrderBtnText, { color: '#fff' }]}>📡 Seguir en Radar</Text>
                        </Pressable>
                      )}
                      {order.estado === 'entregado' && (
                        <Pressable
                          onPress={() => {
                            setRatingModalOrder(order);
                            setStoreStars(5);
                            setDriverStars(5);
                            setStoreReview('');
                            setDriverReview('');
                          }}
                          style={[styles.repeatOrderBtn, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}
                        >
                          <Text style={[styles.repeatOrderBtnText, { color: '#b45309' }]}>⭐ Calificar</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => handleRepeatOrder(order)} style={styles.repeatOrderBtn}>
                        <Text style={styles.repeatOrderBtnText}>🔁 Repetir</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ======================================================== */}
      {/* MODAL DE INICIO DE SESIÓN / REGISTRO / PERFIL            */}
      {/* ======================================================== */}
      <Modal visible={showAuthModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentUser ? 'Mi Cuenta' : (authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
              </Text>
              <Pressable onPress={() => setShowAuthModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {currentUser ? (
              <View style={{ paddingVertical: 12 }}>
                <Text style={styles.profileName}>{currentUser.name}</Text>
                <Text style={styles.profileEmail}>📧 {currentUser.email}</Text>
                <Text style={styles.profilePhone}>📱 {currentUser.phone || '+593995544332'}</Text>

                <View style={styles.walletBox}>
                  <Text style={styles.walletBoxLabel}>Saldo Billetera Digital</Text>
                  <Text style={styles.walletBoxValue}>${(Number(currentUser.saldoBilletera) || 0).toFixed(2)}</Text>
                  <Text style={styles.walletBoxSub}>Disponible para compras con 1 clic en Baba & Babahoyo</Text>

                  <View style={styles.topUpRow}>
                    <Text style={styles.topUpLabel}>Recarga rápida de saldo (DeUna / Pichincha):</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      {[5, 10, 20].map(amt => (
                        <Pressable
                          key={amt}
                          onPress={() => handleTopUp(amt)}
                          disabled={topUpLoading}
                          style={styles.topUpPill}
                        >
                          <Text style={styles.topUpPillText}>+${amt}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {topUpLoading && <ActivityIndicator size="small" color="#16a34a" style={{ marginTop: 6 }} />}
                    {!!topUpSuccess && <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700', marginTop: 4 }}>{topUpSuccess}</Text>}
                  </View>
                </View>

                {savedAddresses.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.inputSubLabel}>Tus direcciones guardadas ({savedAddresses.length}):</Text>
                    {savedAddresses.map(a => (
                      <Text key={a.id} style={{ fontSize: 12, color: '#475569', marginVertical: 2 }}>
                        📍 <Text style={{ fontWeight: '700' }}>{a.alias}</Text>: {a.direccion}
                      </Text>
                    ))}
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    setCurrentUser(null);
                    setSavedAddresses([]);
                    setShowAuthModal(false);
                  }}
                  style={styles.logoutBtn}
                >
                  <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ paddingVertical: 8 }}>
                {!!authIntentReason && (
                  <View style={styles.authReasonBanner}>
                    <Text style={styles.authReasonText}>{authIntentReason}</Text>
                    <Pressable
                      onPress={() => {
                        setShowAuthModal(false);
                        setScreen('cart');
                      }}
                      style={styles.guestContinueBtn}
                    >
                      <Text style={styles.guestContinueText}>Continuar a ver la canasta como invitado ›</Text>
                    </Pressable>
                  </View>
                )}

                {authMode === 'register' && (
                  <>
                    <Text style={styles.inputLabel}>Nombre y Apellido:</Text>
                    <TextInput
                      value={authName}
                      onChangeText={setAuthName}
                      style={styles.textInputSingle}
                      placeholder="Ej: Edward Salvatierra"
                    />

                    <Text style={styles.inputLabel}>Teléfono / WhatsApp:</Text>
                    <TextInput
                      value={authPhone}
                      onChangeText={setAuthPhone}
                      keyboardType="phone-pad"
                      style={styles.textInputSingle}
                      placeholder="Ej: +593991234567"
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Correo electrónico:</Text>
                <TextInput
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInputSingle}
                  placeholder="ejemplo@delivery.com"
                />

                <Text style={styles.inputLabel}>Contraseña:</Text>
                <TextInput
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry
                  style={styles.textInputSingle}
                  placeholder="••••••••"
                />

                {!!authError && <Text style={styles.errorText}>{authError}</Text>}

                <Pressable
                  onPress={handleAuthSubmit}
                  disabled={authLoading}
                  style={styles.submitOrderBtn}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitOrderText}>
                      {authMode === 'login' ? 'Entrar a mi Cuenta' : 'Registrarme'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setAuthMode(m => m === 'login' ? 'register' : 'login')}
                  style={{ marginTop: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, color: '#e11d48', fontWeight: '700' }}>
                    {authMode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL DE CONFLICTO DE COMERCIO (CAMBIO DE TIENDA)        */}
      {/* ======================================================== */}
      <Modal visible={!!storeConflictModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.conflictCard}>
            <Text style={styles.conflictEmoji}>⚠️</Text>
            <Text style={styles.conflictTitle}>¿Deseas cambiar de restaurante?</Text>
            <Text style={styles.conflictDesc}>
              Tu canasta ya tiene productos de <Text style={{ fontWeight: '800' }}>{cartStore?.name || 'otro comercio'}</Text>.{'\n'}
              Un pedido solo puede contener platos de un local a la vez. ¿Deseas vaciar la canasta para pedir en <Text style={{ fontWeight: '800' }}>{storeConflictModal?.pendingStore.nombre_comercial}</Text>?
            </Text>
            <View style={styles.conflictBtnRow}>
              <Pressable
                onPress={() => setStoreConflictModal(null)}
                style={styles.conflictCancelBtn}
              >
                <Text style={styles.conflictCancelBtnText}>Conservar canasta</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!storeConflictModal) return;
                  const prod = storeConflictModal.pendingProduct;
                  const st = storeConflictModal.pendingStore;
                  setCart({});
                  setCartStore({ id: st.id, name: st.nombre_comercial });
                  setStoreConflictModal(null);
                  const finalPrice = Number(prod.precio) || 0;
                  setCart({
                    [prod.id]: {
                      id: prod.id,
                      name: prod.nombre,
                      price: finalPrice,
                      quantity: 1,
                      imageUrl: prod.imagen_url,
                    },
                  });
                }}
                style={styles.conflictConfirmBtn}
              >
                <Text style={styles.conflictConfirmBtnText}>Vaciar y cambiar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL DE CALIFICACIÓN DE SERVICIO (COMERCIO Y REPARTIDOR) */}
      {/* ======================================================== */}
      <Modal visible={!!ratingModalOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⭐ Calificar Experiencia</Text>
              <Pressable onPress={() => setRatingModalOrder(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                Pedido #{ratingModalOrder?.id.slice(0, 8)} · Tu opinión ayuda a la comunidad de Baba.
              </Text>

              {/* 1. Calificación al Restaurante */}
              <View style={styles.ratingCardSection}>
                <Text style={styles.ratingSectionTitle}>🍽️ ¿Qué tal estuvo la comida?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Pressable key={star} onPress={() => setStoreStars(star)} style={styles.starBtn}>
                      <Text style={{ fontSize: 28 }}>{star <= storeStars ? '⭐' : '☆'}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.ratingInput}
                  placeholder="Comentario sobre el sabor, temperatura o empaque..."
                  placeholderTextColor="#94a3b8"
                  value={storeReview}
                  onChangeText={setStoreReview}
                />
              </View>

              {/* 2. Calificación al Motorizado */}
              <View style={styles.ratingCardSection}>
                <Text style={styles.ratingSectionTitle}>🛵 ¿Cómo fue la entrega del repartidor?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Pressable key={star} onPress={() => setDriverStars(star)} style={styles.starBtn}>
                      <Text style={{ fontSize: 28 }}>{star <= driverStars ? '⭐' : '☆'}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.ratingInput}
                  placeholder="Puntualidad, amabilidad y cuidado al entregar..."
                  placeholderTextColor="#94a3b8"
                  value={driverReview}
                  onChangeText={setDriverReview}
                />
              </View>

              <Pressable
                onPress={handleSubmitRating}
                disabled={submittingRating}
                style={[styles.submitRatingBtn, submittingRating && { opacity: 0.6 }]}
              >
                {submittingRating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitRatingBtnText}>ENVIAR EVALUACIÓN</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL DE CHAT EN VIVO CON EL REPARTIDOR                  */}
      {/* ======================================================== */}
      <Modal visible={showChatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', height: 580 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>💬 Chat con Repartidor</Text>
                <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '700' }}>
                  ● Carlos Moto 01 (En camino 🛵)
                </Text>
              </View>
              <Pressable onPress={() => setShowChatModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* Sugerencias Rápidas */}
            <View style={{ height: 42, marginBottom: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chatChipsRow}>
                {['Ya salgo a recibirte', 'Tocar el timbre por favor', 'Llamar al llegar', 'Dejar en garita', '¿Por dónde vienes?'].map((chip, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleSendChatMessage(chip)}
                    style={styles.chatChip}
                  >
                    <Text style={styles.chatChipText}>{chip}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Lista de Mensajes */}
            <ScrollView style={styles.chatMessagesList} contentContainerStyle={{ paddingVertical: 8 }}>
              {chatMessages.map(msg => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubble,
                    msg.sender === 'cliente' ? styles.chatBubbleClient : styles.chatBubbleDriver,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatBubbleText,
                      msg.sender === 'cliente' ? styles.chatBubbleTextClient : styles.chatBubbleTextDriver,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.chatBubbleTime,
                      msg.sender === 'cliente' ? { color: '#fecdd3' } : { color: '#94a3b8' },
                    ]}
                  >
                    {msg.sender === 'cliente' ? 'Tú' : 'Repartidor'} · {msg.time}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input y Botón de Enviar */}
            <View style={styles.chatInputRow}>
              <TextInput
                value={chatInputText}
                onChangeText={setChatInputText}
                placeholder="Escribe un mensaje al repartidor..."
                placeholderTextColor="#94a3b8"
                style={styles.chatTextInput}
                onSubmitEditing={() => handleSendChatMessage()}
              />
              <Pressable onPress={() => handleSendChatMessage()} style={styles.chatSendBtn}>
                <Text style={styles.chatSendBtnText}>Enviar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  brandAccent: { color: '#e11d48' },
  headerSubtitle: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  citySelector: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3 },
  cityButton: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  cityButtonActive: { backgroundColor: '#e11d48' },
  cityButtonText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  cityButtonTextActive: { color: '#fff' },

  userBar: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  userProfileBtn: { backgroundColor: '#f8fafc', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignSelf: 'flex-start' },
  userProfileText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  loginQuickBtn: { backgroundColor: '#fef2f2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fecdd3', alignSelf: 'flex-start' },
  loginQuickText: { fontSize: 12, fontWeight: '800', color: '#e11d48' },

  navBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  navTab: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  navTabActive: { borderBottomWidth: 3, borderBottomColor: '#e11d48' },
  navTabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  navTabTextActive: { color: '#e11d48', fontWeight: '800' },

  scrollContent: { padding: 16, paddingBottom: 48 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  refreshBtn: { backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  refreshBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  verticalFilter: { flexDirection: 'row', marginBottom: 12 },
  verticalPill: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  verticalPillActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  verticalPillText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  verticalPillTextActive: { color: '#fff' },

  categoryPill: { backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 6 },
  categoryPillActive: { backgroundColor: '#0f172a' },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  categoryPillTextActive: { color: '#fff' },

  storeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  storeHeader: { flexDirection: 'row', alignItems: 'center' },
  storeIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  storeIcon: { fontSize: 26 },
  storeInfo: { flex: 1 },
  storeTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  storeCategory: { fontSize: 12, color: '#e11d48', fontWeight: '700', marginVertical: 2 },
  storeAddress: { fontSize: 11, color: '#64748b' },
  storeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  storeBadge: { fontSize: 11, fontWeight: '700', color: '#475569' },
  deliveryBadge: { fontSize: 11, fontWeight: '700', color: '#047857' },
  freeShippingBadge: { fontSize: 11, fontWeight: '800', color: '#e11d48' },
  viewMenuText: { fontSize: 12, fontWeight: '800', color: '#0284c7' },

  storeBannerCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, alignItems: 'center' },
  bannerEmoji: { fontSize: 40, marginRight: 12 },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  bannerSubtitle: { fontSize: 12, color: '#64748b' },
  bannerMeta: { fontSize: 12, color: '#047857', fontWeight: '700', marginTop: 4 },

  productCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  productMainRow: { flexDirection: 'row' },
  productImage: { width: 76, height: 76, borderRadius: 12, marginRight: 12 },
  productImagePlaceholder: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  productDetails: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  productDesc: { fontSize: 12, color: '#64748b', marginVertical: 3 },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sizesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  sizePill: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  sizePillText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  productActions: { marginTop: 8, alignItems: 'flex-end' },
  addBtn: { backgroundColor: '#0f172a', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  qtyControlRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  qtyBtnSmall: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  qtyValue: { minWidth: 30, textAlign: 'center', fontWeight: '800', fontSize: 15, color: '#0f172a' },
  qtyValueSmall: { minWidth: 24, textAlign: 'center', fontWeight: '800', fontSize: 13, color: '#0f172a' },

  floatingCartBar: { backgroundColor: '#0f172a', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  floatingCartText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  cartItemCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cartItemTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cartItemSub: { fontSize: 11, color: '#64748b' },
  cartItemSubtotal: { fontSize: 15, fontWeight: '800', color: '#0f172a', minWidth: 55, textAlign: 'right' },

  checkoutCard: { backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  checkoutCardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  zonesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  zoneBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  zoneBadgeActive: { backgroundColor: '#fef2f2', borderColor: '#e11d48' },
  zoneBadgeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  zoneBadgeTextActive: { color: '#e11d48', fontWeight: '800' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 8, marginBottom: 4 },
  textInput: { minHeight: 55, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 13, color: '#0f172a', textAlignVertical: 'top' },
  textInputSingle: { height: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, fontSize: 13, color: '#0f172a', marginBottom: 4 },

  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, height: 42, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  couponBtn: { backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  couponBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  couponSuccessBadge: { backgroundColor: '#f0fdf4', padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  couponSuccessText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },

  paymentCol: { gap: 8 },
  paymentBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  paymentBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  paymentBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  paymentBtnTextActive: { color: '#fff' },

  summaryCard: { backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  summaryLabel: { fontSize: 13, color: '#64748b' },
  summaryVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  discountLabel: { fontSize: 13, color: '#16a34a', fontWeight: '700' },
  discountVal: { fontSize: 13, fontWeight: '800', color: '#16a34a' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  totalVal: { fontSize: 18, fontWeight: '900', color: '#e11d48' },

  errorText: { color: '#dc2626', fontSize: 13, fontWeight: '700', textAlign: 'center', marginVertical: 8 },
  submitOrderBtn: { backgroundColor: '#e11d48', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitOrderText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  radarCard: { backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#10b981', marginBottom: 16 },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  radarStatusLive: { color: '#e11d48', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  radarEta: { color: '#047857', fontWeight: '800', fontSize: 15 },
  radarOrderNum: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  radarDriver: { fontSize: 13, color: '#475569', marginTop: 2 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16 },
  stepperStepActive: { alignItems: 'center' },
  stepperStep: { alignItems: 'center', opacity: 0.4 },
  stepperIcon: { fontSize: 24 },
  stepperLabel: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  stepperLineActive: { flex: 1, height: 4, backgroundColor: '#10b981', marginHorizontal: 6, borderRadius: 2 },
  stepperLine: { flex: 1, height: 4, backgroundColor: '#cbd5e1', marginHorizontal: 6, borderRadius: 2 },
  radarDetailsBox: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1fae5' },
  radarDetailRow: { fontSize: 12, color: '#334155', marginVertical: 2 },

  pastOrderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pastOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pastOrderTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  pastOrderTotal: { fontSize: 15, fontWeight: '800', color: '#e11d48' },
  pastOrderDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  pastOrderItemText: { fontSize: 12, color: '#334155' },

  centerBox: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 13, color: '#64748b', marginTop: 8, fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 12 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', marginVertical: 4 },
  primaryBtn: { backgroundColor: '#0f172a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginTop: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, fontWeight: '800', color: '#64748b' },

  profileName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  profileEmail: { fontSize: 13, color: '#64748b', marginVertical: 4 },
  profilePhone: { fontSize: 13, color: '#64748b' },
  walletBox: { backgroundColor: '#f0fdf4', padding: 16, borderRadius: 14, marginVertical: 14, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' },
  walletBoxLabel: { fontSize: 12, fontWeight: '700', color: '#166534' },
  walletBoxValue: { fontSize: 28, fontWeight: '900', color: '#15803d', marginVertical: 4 },
  walletBoxSub: { fontSize: 11, color: '#16a34a' },
  logoutBtn: { backgroundColor: '#fef2f2', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecdd3' },
  logoutBtnText: { color: '#e11d48', fontWeight: '800', fontSize: 13 },

  userProfileBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutSmallBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  logoutSmallBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  guestWarningCard: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a', marginBottom: 14 },
  guestWarningTitle: { fontSize: 14, fontWeight: '800', color: '#b45309', marginBottom: 4 },
  guestWarningDesc: { fontSize: 12, color: '#78350f', lineHeight: 17, marginBottom: 8 },
  guestLoginBtn: { backgroundColor: '#d97706', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  guestLoginBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  authReasonBanner: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fecdd3', marginBottom: 12 },
  authReasonText: { fontSize: 12, color: '#b91c1c', fontWeight: '700' },
  guestContinueBtn: { marginTop: 6, alignSelf: 'flex-start' },
  guestContinueText: { fontSize: 11, color: '#475569', textDecorationLine: 'underline', fontWeight: '600' },

  inputSubLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 8 },
  addressChip: { backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8 },
  addressChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  addressChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  addressChipTextActive: { color: '#fff' },

  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, height: 40, fontSize: 13, color: '#0f172a' },
  searchClearBtn: { padding: 4 },
  searchClearText: { fontSize: 14, color: '#94a3b8', fontWeight: '800' },

  topUpRow: { width: '100%', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#dcfce7' },
  topUpLabel: { fontSize: 12, fontWeight: '700', color: '#166534' },
  topUpPill: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  topUpPillText: { fontSize: 12, fontWeight: '800', color: '#15803d' },

  pastOrderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 6 },
  repeatOrderBtn: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  repeatOrderBtnText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },

  conflictCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', alignSelf: 'center', marginBottom: 'auto', marginTop: 'auto', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  conflictEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  conflictTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  conflictDesc: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  conflictBtnRow: { flexDirection: 'row', gap: 10 },
  conflictCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  conflictCancelBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  conflictConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#e11d48', alignItems: 'center' },
  conflictConfirmBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  ratingCardSection: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14 },
  ratingSectionTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 6 },
  starBtn: { padding: 4 },
  ratingInput: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', padding: 10, fontSize: 12, color: '#0f172a', marginTop: 8 },
  submitRatingBtn: { backgroundColor: '#e11d48', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  submitRatingBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Estilos de Pago con Tarjeta Payphone
  cardFormBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 },
  cardFormTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  cardFormSub: { fontSize: 11, color: '#64748b', marginBottom: 10 },
  cardInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0f172a', marginVertical: 4 },
  payphoneBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  payphoneBadgeText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },

  // Estilos de Chat en Vivo
  chatOpenBtn: { backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  chatOpenBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  chatChipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  chatChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1' },
  chatChipText: { fontSize: 11, color: '#334155', fontWeight: '700' },
  chatMessagesList: { flex: 1, marginVertical: 8 },
  chatBubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 4 },
  chatBubbleClient: { alignSelf: 'flex-end', backgroundColor: '#e11d48', borderBottomRightRadius: 2 },
  chatBubbleDriver: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', borderBottomLeftRadius: 2 },
  chatBubbleText: { fontSize: 13, lineHeight: 18 },
  chatBubbleTextClient: { color: '#fff' },
  chatBubbleTextDriver: { color: '#0f172a' },
  chatBubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  chatTextInput: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, color: '#0f172a' },
  chatSendBtn: { backgroundColor: '#e11d48', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, justifyContent: 'center' },
  chatSendBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
