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
  type ClientUser,
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
type Payment = 'efectivo' | 'transferencia' | 'saldo_virtual';

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
  items: Array<{ id: string; name: string; quantity: number }>;
  address: string;
  estado: string;
}

const VERTICALES = [
  { id: 'todos', label: 'Todos', icon: '🌟' },
  { id: 'restaurante', label: 'Restaurantes', icon: '🍔' },
  { id: 'supermercado', label: 'Supermercados', icon: '🛒' },
  { id: 'express', label: 'Express', icon: '⚡' },
];

export default function App({ apiBaseUrl = DEFAULT_API }: { apiBaseUrl?: string }) {
  const [screen, setScreen] = useState<Screen>('stores');
  const [selectedCity, setSelectedCity] = useState<'baba' | 'babahoyo'>('baba');
  const [selectedVertical, setSelectedVertical] = useState('todos');

  // Usuario y Autenticación
  const [currentUser, setCurrentUser] = useState<ClientUser | null>({
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Edward Otsutsuki (Baba)',
    email: 'edward.otsutsuki@gmail.com',
    phone: '+593995544332',
    role: 'cliente',
    saldoBilletera: 25.50,
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('edward.otsutsuki@gmail.com');
  const [authPassword, setAuthPassword] = useState('cliente123');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Comercios y Catálogo
  const [comercios, setComercios] = useState<ComercioItem[]>([]);
  const [loadingComercios, setLoadingComercios] = useState(false);
  const [selectedComercio, setSelectedComercio] = useState<ComercioItem | null>(null);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Carrito multi-ítem
  const [cart, setCart] = useState<Record<string, CartLine>>({});

  // Checkout y Entrega
  const [tarifas, setTarifas] = useState<ZonaTarifa[]>([]);
  const [selectedTarifa, setSelectedTarifa] = useState<ZonaTarifa | null>(null);
  const [address, setAddress] = useState('Barrio San Antonio, Calle Bolívar y Sucre, Baba');
  const [payment, setPayment] = useState<Payment>('efectivo');
  const [notes, setNotes] = useState('');

  // Cupones de descuento
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Estados de Proceso
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<CreatedOrder | null>(null);

  // Telemetría en Vivo e Historial
  const [trackingData, setTrackingData] = useState<OrderTrackingEta | null>(null);
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

  // Operaciones de Carrito
  const addToCart = (product: ProductoItem, sizeName?: string, customPrice?: number) => {
    const finalPrice = customPrice ?? product.precio;
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
  const cartCount = cartLinesArray.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = cartLinesArray.reduce((acc, it) => acc + it.price * it.quantity, 0);

  const deliveryFee = selectedComercio?.subsidia_envio
    ? 0
    : (selectedComercio?.tarifa_fija_local ?? selectedTarifa?.tarifa_envio ?? 1.50);

  const discount = couponResult?.valid ? couponResult.descuento : 0;
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

  // Autenticación
  const handleAuthSubmit = async () => {
    setAuthLoading(true);
    setAuthError('');
    if (authMode === 'login') {
      const res = await loginClient(apiBaseUrl, authEmail, authPassword);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setShowAuthModal(false);
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
      } else {
        setAuthError(res.message);
      }
    }
    setAuthLoading(false);
  };

  // Enviar Pedido
  const submitLiveOrder = async () => {
    if (cartCount === 0) {
      setError('Tu canasta está vacía.');
      return;
    }
    if (!address.trim() || address.trim().length < 8) {
      setError('Por favor indica una dirección clara de entrega en Baba o Babahoyo.');
      return;
    }
    if (payment === 'saldo_virtual' && currentUser && (currentUser.saldoBilletera ?? 0) < total) {
      setError(`Saldo insuficiente en Billetera ($${(currentUser.saldoBilletera ?? 0).toFixed(2)}). Elige efectivo o transferencia.`);
      return;
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

      const payload = buildOrderPayload(
        itemsForApi,
        address,
        payment === 'saldo_virtual' ? 'transferencia' : payment,
        selectedComercio?.id || '55555555-5555-5555-5555-555555555555',
        currentUser?.id || 'usr-cliente-01',
        {
          costoEnvio: deliveryFee,
          cuponCodigo: couponResult?.valid ? couponResult.codigo : undefined,
          descuentoCupon: discount,
          zonaTarifaId: selectedTarifa?.id,
          notas: notes || `Pedido desde App Móvil - ${currentUser?.name || 'Cliente Baba'}`,
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
        items: cartLinesArray.map(c => ({ id: c.id, name: c.name, quantity: c.quantity })),
        address,
        estado: result.pedido.estado || 'creado',
      };
      setPastOrders(prev => [newPast, ...prev]);

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

  useEffect(() => {
    if (screen === 'tracking' && confirmedOrder) {
      refreshTracking(confirmedOrder.id);
      const timer = setInterval(() => refreshTracking(confirmedOrder.id), 6000);
      return () => clearInterval(timer);
    }
  }, [screen, confirmedOrder]);

  const productCategories = ['todos', ...new Set(productos.map(p => p.categoria || 'Varios'))];
  const filteredProducts = selectedCategory === 'todos'
    ? productos
    : productos.filter(p => (p.categoria || 'Varios') === selectedCategory);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Cabecera Principal */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>Delivery<Text style={styles.brandAccent}>Ya</Text></Text>
              <Text style={styles.headerSubtitle}>Los Ríos · Piloto Baba & Babahoyo</Text>
            </View>

            {/* Selector de Ciudad */}
            <View style={styles.citySelector}>
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
              <Pressable onPress={() => setShowAuthModal(true)} style={styles.userProfileBtn}>
                <Text style={styles.userProfileText}>
                  👤 {currentUser.name.split(' ')[0]} · 💰 Saldo: <Text style={{ color: '#16a34a' }}>${(currentUser.saldoBilletera ?? 0).toFixed(2)}</Text>
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowAuthModal(true)} style={styles.loginQuickBtn}>
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
            onPress={() => setScreen('cart')}
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
                  onPress={() => setScreen('cart')}
                  style={styles.floatingCartBar}
                >
                  <Text style={styles.floatingCartText}>
                    Ver Canasta ({cartCount} ítems) · ${total.toFixed(2)}
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
                  {cartLinesArray.map(item => (
                    <View key={item.id + (item.sizeName || '')} style={styles.cartItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemTitle}>{item.name}</Text>
                        <Text style={styles.cartItemSub}>${item.price.toFixed(2)} c/u</Text>
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
                      <Text style={styles.cartItemSubtotal}>${(item.price * item.quantity).toFixed(2)}</Text>
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
                    </View>
                  </View>

                  {/* Resumen */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryVal}>${subtotal.toFixed(2)}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Envío ({selectedTarifa?.zona_nombre || 'Estándar'})
                      </Text>
                      <Text style={styles.summaryVal}>
                        {deliveryFee === 0 ? '¡GRATIS!' : `$${deliveryFee.toFixed(2)}`}
                      </Text>
                    </View>

                    {discount > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.discountLabel}>Descuento Cupón ({couponResult?.codigo})</Text>
                        <Text style={styles.discountVal}>-${discount.toFixed(2)}</Text>
                      </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                      <Text style={styles.totalLabel}>Total a pagar</Text>
                      <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
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
                      <Text style={styles.submitOrderText}>🚀 Confirmar Pedido (${total.toFixed(2)})</Text>
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
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🛵</Text>
                  <Text style={styles.emptyTitle}>No tienes pedidos activos</Text>
                  <Text style={styles.emptyDesc}>Realiza un pedido para ver el seguimiento en mapa en tiempo real.</Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Historial de Pedidos</Text>
              {pastOrders.map(order => (
                <View key={order.id} style={styles.pastOrderCard}>
                  <View style={styles.pastOrderHeader}>
                    <Text style={styles.pastOrderTitle}>Pedido #{order.id.slice(0, 10)}</Text>
                    <Text style={styles.pastOrderTotal}>${order.total}</Text>
                  </View>
                  <Text style={styles.pastOrderDate}>{order.fecha} · {order.address.slice(0, 30)}...</Text>
                  <View style={{ marginVertical: 6 }}>
                    {order.items.map((it, idx) => (
                      <Text key={idx} style={styles.pastOrderItemText}>• {it.quantity}x {it.name}</Text>
                    ))}
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
                  <Text style={styles.walletBoxValue}>${(currentUser.saldoBilletera ?? 0).toFixed(2)}</Text>
                  <Text style={styles.walletBoxSub}>Disponible para compras con 1 clic</Text>
                </View>

                <Pressable
                  onPress={() => {
                    setCurrentUser(null);
                    setShowAuthModal(false);
                  }}
                  style={styles.logoutBtn}
                >
                  <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ paddingVertical: 8 }}>
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
});
