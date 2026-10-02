import * as React from 'react';
import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { CATALOG, RESTAURANT, DEFAULT_ADDRESS, MAX_QUANTITY, cartLines, cartTotals, changeQuantity, checkoutError, prepareCheckout, money, type Cart, type Payment, type ProductId } from './src/orderModel';
import { buildOrderPayload, submitOrder, type CreatedOrder } from './src/services/checkoutApi';

const DEFAULT_API = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';

type Screen = 'catalog' | 'cart' | 'checkout';

export default function App({ apiBaseUrl = DEFAULT_API }: { apiBaseUrl?: string }) {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [cart, setCart] = useState<Cart>({});
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [payment, setPayment] = useState<Payment>('efectivo');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ReturnType<typeof prepareCheckout> | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<CreatedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totals = cartTotals(cart);

  function change(id: ProductId, delta: number) {
    setCart(previous => changeQuantity(previous, id, delta));
    setError('');
    setReceipt(null);
    setConfirmedOrder(null);
  }

  function navigate(next: Screen) {
    setScreen(next);
    setError('');
    setReceipt(null);
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
      setCart({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con el Gateway en Baba.');
    } finally {
      setSubmitting(false);
    }
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
          <Text style={styles.muted}>Envío en Baba</Text>
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

          {screen === 'checkout' && (
            <>
              <Text style={styles.section}>Entrega y pago</Text>

              {/* Orden Confirmada en Backend en Vivo */}
              {confirmedOrder && (
                <View style={[styles.card, styles.confirmedCard]} accessibilityLiveRegion="polite">
                  <Text style={styles.confirmedBadge}>¡ORDEN ENVIADA A COCINA! 🎉</Text>
                  <Text style={styles.title}>Pedido #{confirmedOrder.id.slice(0, 8)}...</Text>
                  <Text style={styles.description}>
                    Tu pedido ya fue registrado en PostgreSQL y apareció en el panel Kanban de Picantería El Buen Sabor.
                  </Text>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.muted}>Estado actual:</Text>
                    <Text style={styles.confirmedState}>{confirmedOrder.estado.toUpperCase()}</Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.muted}>Total a pagar:</Text>
                    <Text style={styles.price}>${confirmedOrder.total}</Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.muted}>Método:</Text>
                    <Text style={styles.title}>{payment === 'efectivo' ? 'Efectivo contra entrega' : 'Transferencia'}</Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.muted}>Destino:</Text>
                    <Text style={styles.description}>{address}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setConfirmedOrder(null);
                      navigate('catalog');
                    }}
                    style={styles.primary}
                  >
                    <Text style={styles.primaryText}>Hacer otro pedido</Text>
                  </Pressable>
                </View>
              )}

              {/* Resumen Local de Prueba */}
              {receipt && !confirmedOrder && (
                <View style={styles.card} accessibilityLiveRegion="polite">
                  <Text style={styles.title}>Resumen previo de entrega</Text>
                  <Text style={styles.description}>Revisa los detalles antes de enviar la orden real al restaurante:</Text>
                  {receipt.items.map(item => (
                    <Text key={item.id} style={styles.description}>
                      {item.quantity} × {item.name} · {money(item.subtotalCents)}
                    </Text>
                  ))}
                  <Text style={styles.description}>{receipt.address}</Text>
                  <Text style={styles.description}>Pago: {receipt.payment === 'efectivo' ? 'Efectivo' : 'Transferencia'}</Text>
                  <Text style={styles.price}>Total: {money(receipt.totalCents)}</Text>
                  <View style={styles.row}>
                    <Pressable accessibilityRole="button" onPress={() => setReceipt(null)} style={styles.secondary}>
                      <Text style={styles.secondaryText}>Editar datos</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={submitting}
                      onPress={submitLiveOrder}
                      style={[styles.primary, submitting && styles.disabled, { flex: 1 }]}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryText}>Enviar al Restaurante 🚀</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Formulario de Checkout */}
              {!receipt && !confirmedOrder && (
                <>
                  <View style={styles.card}>
                    <Text style={styles.title}>Dirección en Baba</Text>
                    <Text style={styles.description}>Barrio, calle y referencia de entrega.</Text>
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

                  <Text style={styles.section}>Método de pago</Text>
                  {(['efectivo', 'transferencia'] as const).map(value => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: payment === value }}
                      onPress={() => {
                        setPayment(value);
                        setError('');
                      }}
                      style={[styles.payment, payment === value && styles.selected]}
                    >
                      <Text style={styles.title}>{value === 'efectivo' ? 'Efectivo' : 'Transferencia'}</Text>
                      <Text style={styles.description}>
                        {value === 'efectivo'
                          ? 'Cobro en efectivo por el repartidor al entregar.'
                          : 'Transferencia bancaria directa (Banco Pichincha / Guayaquil).'}
                      </Text>
                    </Pressable>
                  ))}

                  {totalSummary()}

                  {!totals.count && <Text style={styles.error}>Agrega productos desde el catálogo antes de continuar.</Text>}
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
                        <Text style={styles.primaryText}>Confirmar Pedido Real 🚀</Text>
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
  tabText: { color: '#162a28', fontWeight: '700' },
  selected: { backgroundColor: '#ffe7e9', borderColor: '#cf3349' },
  content: { padding: 20, paddingBottom: 48 },
  demo: { color: '#9c2738', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  heading: { fontSize: 25, fontWeight: '800', color: '#162a28', marginBottom: 6 },
  section: { fontSize: 21, fontWeight: '800', color: '#162a28', marginTop: 24, marginBottom: 14 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#e2e5df' },
  confirmedCard: { borderColor: '#10b981', backgroundColor: '#f0fdf4', borderWidth: 2 },
  confirmedBadge: { color: '#047857', fontWeight: '800', fontSize: 13, letterSpacing: 0.5, marginBottom: 8 },
  confirmedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  confirmedState: { fontWeight: '800', color: '#059669', fontSize: 14, backgroundColor: '#d1fae5', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
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
  buttonGroup: { gap: 4, marginTop: 8 },
  disabled: { opacity: 0.4 },
  remove: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  removeText: { color: '#9c2738', textDecorationLine: 'underline' },
  summary: { padding: 18, backgroundColor: '#fff', borderRadius: 16, marginTop: 12 },
  input: { minHeight: 100, borderWidth: 1, borderColor: '#81948b', borderRadius: 10, padding: 12, color: '#162a28', fontSize: 16, textAlignVertical: 'top' },
  payment: { padding: 18, borderWidth: 1, borderColor: '#d4dcd6', borderRadius: 14, backgroundColor: '#fff', marginBottom: 10 },
  error: { color: '#a51e33', marginVertical: 12, lineHeight: 22, fontWeight: '600' },
});
