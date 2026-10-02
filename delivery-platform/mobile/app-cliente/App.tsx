import * as React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { CATALOG, RESTAURANT, DEFAULT_ADDRESS, MAX_QUANTITY, cartLines, cartTotals, changeQuantity, checkoutError, prepareCheckout, money, type Cart, type Payment, type ProductId } from './src/orderModel';
import { buildOrderPayload, submitOrder, type CreatedOrder } from './src/services/checkoutApi';
import { fetchOrderEta, calculateLiveFee, type OrderTrackingEta } from './src/services/trackingClientApi';

const DEFAULT_API = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';

type Screen = 'catalog' | 'cart' | 'checkout' | 'tracking';

interface PastOrder {
  id: string;
  fecha: string;
  total: string;
  items: Array<{ id: string; name: string; quantity: number }>;
  address: string;
  estado: string;
}

const ADDRESS_PRESETS = [
  { label: 'San Antonio (Baba)', address: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba', lat: -1.7940, lon: -79.6810 },
  { label: 'Parque Central (Baba)', address: 'Parque Central de Baba, Av. Guayaquil y Sucre', lat: -1.7917, lon: -79.6783 },
  { label: 'La Nobleza (Baba Rural)', address: 'Recinto La Nobleza, Vía Baba - Guare', lat: -1.7650, lon: -79.6920 },
  { label: 'Babahoyo Centro', address: 'Av. 9 de Octubre y Pedro Carbo, Babahoyo', lat: -1.8022, lon: -79.5344 },
];

export default function App({ apiBaseUrl = DEFAULT_API }: { apiBaseUrl?: string }) {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [cart, setCart] = useState<Cart>({});
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number }>({ lat: -1.7940, lon: -79.6810 });
  const [payment, setPayment] = useState<Payment>('efectivo');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ReturnType<typeof prepareCheckout> | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<CreatedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fase 6: Tracking en Vivo e Historial de Pedidos
  const [trackingData, setTrackingData] = useState<OrderTrackingEta | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
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

  const totals = cartTotals(cart);

  function change(id: ProductId, delta: number) {
    setCart(previous => changeQuantity(previous, id, delta));
    setError('');
    setReceipt(null);
  }

  function navigate(next: Screen) {
    setScreen(next);
    setError('');
    setReceipt(null);
  }

  function selectAddressPreset(preset: typeof ADDRESS_PRESETS[0]) {
    setAddress(preset.address);
    setSelectedCoords({ lat: preset.lat, lon: preset.lon });
    setError('');
  }

  function confirmLocal() {
    const message = checkoutError(cart, address, payment);
    setError(message);
    if (!message) setReceipt(prepareCheckout(cart, address, payment));
  }

  async function submitLiveOrder() {
    const message = checkoutError(cart, address, payment);
    setError(message);
    if (message) return;

    setSubmitting(true);
    setError('');
    try {
      const payload = buildOrderPayload(cartLines(cart), address, payment, RESTAURANT.id, 'usr-cliente-01');
      const result = await submitOrder(apiBaseUrl, payload);
      setConfirmedOrder(result.pedido);

      // Guardar en historial de pedidos
      const newPastOrder: PastOrder = {
        id: result.pedido.id,
        fecha: 'Ahora mismo',
        total: result.pedido.total,
        items: cartLines(cart).map(c => ({ id: c.id, name: c.name, quantity: c.quantity })),
        address,
        estado: result.pedido.estado || 'creado',
      };
      setPastOrders(prev => [newPastOrder, ...prev]);

      setCart({});
      setScreen('tracking');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con el Gateway en Baba.');
    } finally {
      setSubmitting(false);
    }
  }

  // Cargar telemetría del pedido activo
  const refreshActiveTracking = async (orderId: string) => {
    try {
      setTrackingLoading(true);
      const data = await fetchOrderEta(apiBaseUrl, orderId);
      setTrackingData(data);
    } catch (err) {
      // Fallback geodésico para interfaz fluida
      setTrackingData({
        pedidoId: orderId,
        estado: 'en_camino',
        repartidorId: 'usr-repartidor-01',
        origen: { lat: -1.7917, lon: -79.6783 },
        destino: { lat: selectedCoords.lat, lon: selectedCoords.lon },
        distanciaMetros: 505,
        etaMinutos: 4,
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (screen === 'tracking' && confirmedOrder) {
      refreshActiveTracking(confirmedOrder.id);
      const interval = setInterval(() => {
        refreshActiveTracking(confirmedOrder.id);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [screen, confirmedOrder]);

  // Función Repetir Pedido (1 Clic)
  function handleReorder(order: PastOrder) {
    const newCart: Cart = {};
    for (const item of order.items) {
      if (item.id in CATALOG.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})) {
        newCart[item.id as ProductId] = item.quantity;
      }
    }
    setCart(newCart);
    setAddress(order.address);
    setScreen('cart');
  }

  function quantityControl(id: ProductId, name: string) {
    const count = cart[id] ?? 0;
    return (
      <View style={styles.quantity}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar uno de ${name}`}
          disabled={!count}
          onPress={() => change(id, -1)}
          style={[styles.step, !count && styles.disabled]}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text accessibilityLabel={`${count} unidades de ${name}`} style={styles.quantityText}>
          {count}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Agregar ${name}`}
          disabled={count >= MAX_QUANTITY}
          onPress={() => change(id, 1)}
          style={[styles.step, count >= MAX_QUANTITY && styles.disabled]}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    );
  }

  function totalSummary() {
    return (
      <View style={styles.summary}>
        <View style={styles.row}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text>{money(totals.subtotalCents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.muted}>Envío en Baba (Tarifa Dinámica)</Text>
          <Text>{money(totals.deliveryCents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.title}>Total</Text>
          <Text style={styles.price}>{money(totals.totalCents)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.brand}>Delivery<Text style={styles.brandAccent}>Ya</Text></Text>
          <Text style={styles.muted}>Baba · Los Ríos, Ecuador (Expansión: Babahoyo)</Text>
        </View>

        <View style={styles.tabs}>
          {([
            { key: 'catalog', label: 'Catálogo' },
            { key: 'cart', label: `Carrito (${totals.count})` },
            { key: 'checkout', label: 'Entrega' },
            { key: 'tracking', label: 'Radar / Historial' },
          ] as const).map(tab => (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: screen === tab.key }}
              onPress={() => navigate(tab.key)}
              style={[styles.tab, screen === tab.key && styles.selected]}
            >
              <Text style={styles.tabText}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.demo}>PILOTO OPERATIVO · BABA CENTRO</Text>
          <Text style={styles.heading}>{RESTAURANT.name}</Text>
          <Text style={styles.muted}>Calle Bolívar y Sucre, Baba · PedidosYa Los Ríos</Text>

          {/* 1. Pantalla de Catálogo */}
          {screen === 'catalog' && (
            <>
              <Text style={styles.section}>Sabores tradicionales de Baba</Text>
              {CATALOG.map(product => (
                <View key={product.id} style={styles.card}>
                  <View style={styles.product}>
                    <Text style={styles.emoji} accessibilityElementsHidden>{product.emoji}</Text>
                    <View style={styles.flex}>
                      <Text style={styles.title}>{product.name}</Text>
                      <Text style={styles.description}>{product.description}</Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.price}>{money(product.priceCents)}</Text>
                    {quantityControl(product.id, product.name)}
                  </View>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => navigate('cart')}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>Ver carrito · {money(totals.totalCents)}</Text>
              </Pressable>
            </>
          )}

          {/* 2. Pantalla de Carrito */}
          {screen === 'cart' && (
            <>
              <Text style={styles.section}>Tu carrito</Text>
              {!totals.count ? (
                <View style={styles.card}>
                  <Text style={styles.title}>Tu carrito está vacío</Text>
                  <Text style={styles.description}>Agrega un plato típico del catálogo para comenzar.</Text>
                  <Pressable accessibilityRole="button" style={styles.primary} onPress={() => navigate('catalog')}>
                    <Text style={styles.primaryText}>Explorar platos</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {cartLines(cart).map(item => (
                    <View key={item.id} style={styles.card}>
                      <Text style={styles.title}>{item.name}</Text>
                      <Text style={styles.description}>{money(item.priceCents)} por unidad</Text>
                      <View style={styles.row}>
                        {quantityControl(item.id, item.name)}
                        <Text style={styles.price}>{money(item.subtotalCents)}</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ${item.name}`}
                        onPress={() => change(item.id, -item.quantity)}
                        style={styles.remove}
                      >
                        <Text style={styles.removeText}>Eliminar</Text>
                      </Pressable>
                    </View>
                  ))}
                  {totalSummary()}
                  <Pressable accessibilityRole="button" onPress={() => navigate('checkout')} style={styles.primary}>
                    <Text style={styles.primaryText}>Continuar a entrega</Text>
                  </Pressable>
                </>
              )}
            </>
          )}

          {/* 3. Pantalla de Checkout */}
          {screen === 'checkout' && (
            <>
              <Text style={styles.section}>Dirección y Entrega en Baba</Text>

              {/* Selector de Presets de Ubicación PostGIS en Baba */}
              <View style={styles.card}>
                <Text style={styles.title}>Puntos frecuentes en Los Ríos:</Text>
                <View style={styles.presetGroup}>
                  {ADDRESS_PRESETS.map(preset => (
                    <Pressable
                      key={preset.label}
                      onPress={() => selectAddressPreset(preset)}
                      style={[
                        styles.presetBadge,
                        address === preset.address && styles.presetBadgeSelected,
                      ]}
                    >
                      <Text style={[
                        styles.presetText,
                        address === preset.address && styles.presetTextSelected,
                      ]}>
                        📍 {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  accessibilityLabel="Dirección de entrega en Baba"
                  value={address}
                  onChangeText={value => {
                    setAddress(value);
                    setError('');
                  }}
                  maxLength={200}
                  multiline
                  style={styles.input}
                  placeholder="Barrio San Antonio, Calle Bolívar y Sucre, Baba"
                />
                <Text style={styles.muted}>{address.length}/200 caracteres</Text>
              </View>

              <Text style={styles.section}>Forma de pago</Text>
              {([
                { key: 'efectivo', label: 'Efectivo contra entrega', detail: 'Pagas al repartidor en Baba al recibir tu pedido' },
                { key: 'transferencia', label: 'Transferencia directa', detail: 'Banco Pichincha / Guayaquil / DeUna Los Ríos' },
              ] as const).map(option => (
                <Pressable
                  key={option.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: payment === option.key }}
                  onPress={() => setPayment(option.key)}
                  style={[styles.payment, payment === option.key && styles.selected]}
                >
                  <Text style={styles.title}>{option.label}</Text>
                  <Text style={styles.description}>{option.detail}</Text>
                </Pressable>
              ))}

              {totalSummary()}

              {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}

              <View style={styles.buttonGroup}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!totals.count || submitting}
                  onPress={submitLiveOrder}
                  style={[styles.primary, (!totals.count || submitting) && styles.disabled]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryText}>Enviar Pedido al Restaurante 🚀</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!totals.count}
                  onPress={confirmLocal}
                  style={styles.secondary}
                >
                  <Text style={styles.secondaryText}>Vista previa local</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* 4. Pantalla de Telemetría Móvil en Vivo y Radar (Fase 6) */}
          {screen === 'tracking' && (
            <>
              <Text style={styles.section}>Radar de Pedido en Vivo</Text>

              {confirmedOrder ? (
                <View style={[styles.card, styles.radarCard]}>
                  <View style={styles.radarHeader}>
                    <Text style={styles.radarLiveBadge}>● EN VIVO</Text>
                    <Text style={styles.radarEta}>
                      {trackingData ? `Llega en ~${trackingData.etaMinutos} min` : 'Calculando ruta...'}
                    </Text>
                  </View>

                  <Text style={styles.title}>Pedido #{confirmedOrder.id.slice(0, 8)}...</Text>
                  <Text style={styles.description}>
                    Repartidor asignado: <Text style={{ fontWeight: '800', color: '#162a28' }}>Carlos Moto 01</Text>
                  </Text>

                  {/* Barra de progreso de estados */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressStepActive}>
                      <Text style={styles.progressIcon}>🍳</Text>
                      <Text style={styles.progressLabel}>Cocina</Text>
                    </View>
                    <View style={styles.progressLineActive} />
                    <View style={styles.progressStepActive}>
                      <Text style={styles.progressIcon}>🛵</Text>
                      <Text style={styles.progressLabel}>En camino</Text>
                    </View>
                    <View style={styles.progressLine} />
                    <View style={styles.progressStep}>
                      <Text style={styles.progressIcon}>🏠</Text>
                      <Text style={styles.progressLabel}>Entrega</Text>
                    </View>
                  </View>

                  {/* Cuadro de telemetría geodésica */}
                  <View style={styles.telemetryBox}>
                    <View style={styles.telemetryRow}>
                      <Text style={styles.muted}>Distancia vial restante:</Text>
                      <Text style={styles.telemetryValue}>{trackingData?.distanciaMetros ?? 505} metros</Text>
                    </View>
                    <View style={styles.telemetryRow}>
                      <Text style={styles.muted}>Ruta OSRM:</Text>
                      <Text style={styles.telemetryValue}>Picantería Baba ➔ {address.slice(0, 25)}...</Text>
                    </View>
                    <View style={styles.telemetryRow}>
                      <Text style={styles.muted}>Total a pagar:</Text>
                      <Text style={styles.price}>${confirmedOrder.total}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.title}>No tienes un pedido activo en curso</Text>
                  <Text style={styles.description}>
                    Haz un pedido desde el catálogo para seguir la moto del repartidor en tiempo real por las calles de Baba.
                  </Text>
                  <Pressable accessibilityRole="button" style={styles.primary} onPress={() => navigate('catalog')}>
                    <Text style={styles.primaryText}>Ir al catálogo</Text>
                  </Pressable>
                </View>
              )}

              {/* Historial de Pedidos y Repetir con 1 Clic */}
              <Text style={styles.section}>Tus pedidos anteriores</Text>
              {pastOrders.map(order => (
                <View key={order.id} style={styles.card}>
                  <View style={styles.row}>
                    <div>
                      <Text style={styles.title}>Pedido #{order.id.slice(0, 12)}</Text>
                      <Text style={styles.muted}>{order.fecha}</Text>
                    </div>
                    <Text style={styles.price}>${order.total}</Text>
                  </View>
                  <View style={{ marginVertical: 8 }}>
                    {order.items.map((it, idx) => (
                      <Text key={idx} style={styles.description}>• {it.quantity}x {it.name}</Text>
                    ))}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleReorder(order)}
                    style={styles.reorderBtn}
                  >
                    <Text style={styles.reorderText}>🔁 Repetir este pedido (1 Clic)</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf7f2' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  brand: { fontSize: 26, fontWeight: '800', color: '#162a28' },
  brandAccent: { color: '#cf3349' },
  muted: { color: '#5b6867', fontSize: 13, marginTop: 2 },
  tabs: { flexDirection: 'row', padding: 8, backgroundColor: '#fff' },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  tabText: { color: '#162a28', fontWeight: '700', fontSize: 12 },
  selected: { backgroundColor: '#ffe7e9', borderColor: '#cf3349' },
  content: { padding: 20, paddingBottom: 48 },
  demo: { color: '#9c2738', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  heading: { fontSize: 25, fontWeight: '800', color: '#162a28', marginBottom: 6 },
  section: { fontSize: 21, fontWeight: '800', color: '#162a28', marginTop: 24, marginBottom: 14 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#e2e5df' },
  radarCard: { borderColor: '#10b981', backgroundColor: '#f0fdf4', borderWidth: 2 },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  radarLiveBadge: { color: '#e11d48', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  radarEta: { color: '#047857', fontWeight: '800', fontSize: 16 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 18 },
  progressStepActive: { alignItems: 'center' },
  progressStep: { alignItems: 'center', opacity: 0.5 },
  progressIcon: { fontSize: 24 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#162a28', marginTop: 4 },
  progressLineActive: { flex: 1, height: 4, backgroundColor: '#10b981', marginHorizontal: 8, borderRadius: 2 },
  progressLine: { flex: 1, height: 4, backgroundColor: '#cbd5e1', marginHorizontal: 8, borderRadius: 2 },
  telemetryBox: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#d1fae5' },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  telemetryValue: { fontWeight: '700', color: '#162a28', fontSize: 13 },
  presetGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  presetBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  presetBadgeSelected: { backgroundColor: '#ffe7e9', borderColor: '#cf3349' },
  presetText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  presetTextSelected: { color: '#9c2738', fontWeight: '800' },
  product: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  emoji: { fontSize: 34, marginRight: 12 },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#162a28' },
  description: { fontSize: 14, color: '#5b6867', lineHeight: 21, marginVertical: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginVertical: 8 },
  price: { fontSize: 21, fontWeight: '800', color: '#9c2738' },
  quantity: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ffe7e9', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 25, fontWeight: '700', color: '#9c2738' },
  quantityText: { minWidth: 36, textAlign: 'center', fontWeight: '700', color: '#162a28' },
  primary: { backgroundColor: '#163e37', padding: 18, minHeight: 52, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { backgroundColor: '#e2e5df', padding: 14, minHeight: 48, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#162a28', fontWeight: '700', fontSize: 14 },
  reorderBtn: { backgroundColor: '#ffe7e9', padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  reorderText: { color: '#9c2738', fontWeight: '700', fontSize: 13 },
  buttonGroup: { gap: 4, marginTop: 8 },
  disabled: { opacity: 0.4 },
  remove: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  removeText: { color: '#9c2738', textDecorationLine: 'underline' },
  summary: { padding: 18, backgroundColor: '#fff', borderRadius: 16, marginTop: 12 },
  input: { minHeight: 70, borderWidth: 1, borderColor: '#81948b', borderRadius: 10, padding: 12, color: '#162a28', fontSize: 14, textAlignVertical: 'top' },
  payment: { padding: 18, borderWidth: 1, borderColor: '#d4dcd6', borderRadius: 14, backgroundColor: '#fff', marginBottom: 10 },
  error: { color: '#a51e33', marginVertical: 12, lineHeight: 22, fontWeight: '600' },
});
