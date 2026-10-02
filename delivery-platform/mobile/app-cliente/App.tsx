import * as React from 'react';
import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { CATALOG, RESTAURANT, DEFAULT_ADDRESS, MAX_QUANTITY, cartLines, cartTotals, changeQuantity, checkoutError, prepareCheckout, money, type Cart, type Payment, type ProductId } from './src/orderModel';

type Screen = 'catalog' | 'cart' | 'checkout';
export default function App() {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [cart, setCart] = useState<Cart>({});
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [payment, setPayment] = useState<Payment>('efectivo');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ReturnType<typeof prepareCheckout> | null>(null);
  const totals = cartTotals(cart);
  function change(id: ProductId, delta: number) { setCart(previous => changeQuantity(previous, id, delta)); setError(''); setReceipt(null); }
  function navigate(next: Screen) { setScreen(next); setError(''); setReceipt(null); }
  function confirm() {
    const message = checkoutError(cart, address, payment);
    setError(message);
    if (!message) setReceipt(prepareCheckout(cart, address, payment));
  }
  function quantityControl(id: ProductId, name: string) {
    const count = cart[id] ?? 0;
    return <View style={styles.quantity}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Quitar uno de ${name}`} disabled={!count} onPress={() => change(id, -1)} style={[styles.step, !count && styles.disabled]}><Text style={styles.stepText}>−</Text></Pressable>
      <Text accessibilityLabel={`${count} unidades de ${name}`} style={styles.quantityText}>{count}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Agregar ${name}`} disabled={count >= MAX_QUANTITY} onPress={() => change(id, 1)} style={[styles.step, count >= MAX_QUANTITY && styles.disabled]}><Text style={styles.stepText}>+</Text></Pressable>
    </View>;
  }
  function totalSummary() {
    return <View style={styles.summary}>
      <View style={styles.row}><Text style={styles.muted}>Subtotal</Text><Text>{money(totals.subtotalCents)}</Text></View>
      <View style={styles.row}><Text style={styles.muted}>Envío en Baba</Text><Text>{money(totals.deliveryCents)}</Text></View>
      <View style={styles.row}><Text style={styles.title}>Total</Text><Text style={styles.price}>{money(totals.totalCents)}</Text></View>
    </View>;
  }
  return <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><Text style={styles.brand}>Delivery<Text style={styles.brandAccent}>Ya</Text></Text><Text style={styles.muted}>Baba · Los Ríos, Ecuador</Text></View>
      <View style={styles.tabs}>{([{ key: 'catalog', label: 'Catálogo' }, { key: 'cart', label: `Carrito (${totals.count})` }, { key: 'checkout', label: 'Entrega' }] as const).map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: screen === tab.key }} onPress={() => navigate(tab.key)} style={[styles.tab, screen === tab.key && styles.selected]}><Text style={styles.tabText}>{tab.label}</Text></Pressable>)}</View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.demo}>CATÁLOGO DE PRUEBA · BABA</Text>
        <Text style={styles.heading}>{RESTAURANT.name}</Text>
        <Text style={styles.muted}>Piloto principal en Baba · Próxima expansión: Babahoyo</Text>
        {screen === 'catalog' && <>
          <Text style={styles.section}>Sabores de casa</Text>
          {CATALOG.map(product => <View key={product.id} style={styles.card}>
            <View style={styles.product}><Text style={styles.emoji} accessibilityElementsHidden>{product.emoji}</Text><View style={styles.flex}><Text style={styles.title}>{product.name}</Text><Text style={styles.description}>{product.description}</Text></View></View>
            <View style={styles.row}><Text style={styles.price}>{money(product.priceCents)}</Text>{quantityControl(product.id, product.name)}</View>
          </View>)}
          <Pressable accessibilityRole="button" onPress={() => navigate('cart')} style={styles.primary}><Text style={styles.primaryText}>Ver carrito · {money(totals.totalCents)}</Text></Pressable>
        </>}
        {screen === 'cart' && <>
          <Text style={styles.section}>Tu carrito</Text>
          {!totals.count ? <View style={styles.card}><Text style={styles.title}>Tu próximo antojo está esperando</Text><Text style={styles.description}>Agrega un plato del catálogo para comenzar.</Text><Pressable accessibilityRole="button" style={styles.primary} onPress={() => navigate('catalog')}><Text style={styles.primaryText}>Explorar platos</Text></Pressable></View> : <>
            {cartLines(cart).map(item => <View key={item.id} style={styles.card}><Text style={styles.title}>{item.name}</Text><Text style={styles.description}>{money(item.priceCents)} por unidad</Text><View style={styles.row}>{quantityControl(item.id, item.name)}<Text style={styles.price}>{money(item.subtotalCents)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.name}`} onPress={() => change(item.id, -item.quantity)} style={styles.remove}><Text style={styles.removeText}>Eliminar</Text></Pressable></View>)}
            {totalSummary()}
            <Pressable accessibilityRole="button" onPress={() => navigate('checkout')} style={styles.primary}><Text style={styles.primaryText}>Continuar a entrega</Text></Pressable>
          </>}
        </>}
        {screen === 'checkout' && <>
          <Text style={styles.section}>Entrega y pago</Text>
          {receipt ? <View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.title}>Pedido de prueba preparado</Text><Text style={styles.description}>Este resumen es local. No se ha enviado al restaurante ni realizado un cobro.</Text>{receipt.items.map(item => <Text key={item.id} style={styles.description}>{item.quantity} × {item.name} · {money(item.subtotalCents)}</Text>)}<Text style={styles.description}>{receipt.address}</Text><Text style={styles.description}>Pago: {receipt.payment === 'efectivo' ? 'Efectivo' : 'Transferencia'}</Text><Text style={styles.price}>Total: {money(receipt.totalCents)}</Text><Pressable accessibilityRole="button" onPress={() => setReceipt(null)} style={styles.primary}><Text style={styles.primaryText}>Editar pedido</Text></Pressable></View> : <>
            <View style={styles.card}><Text style={styles.title}>Dirección en Baba</Text><Text style={styles.description}>Barrio, calle y referencia de entrega.</Text><TextInput accessibilityLabel="Dirección de entrega en Baba" value={address} onChangeText={value => { setAddress(value); setError(''); }} maxLength={200} multiline style={styles.input} placeholder="Barrio San Antonio, Calle Bolívar y Sucre" /><Text style={styles.muted}>{address.length}/200 caracteres</Text></View>
            <Text style={styles.section}>Método de pago</Text>
            {(['efectivo', 'transferencia'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: payment === value }} onPress={() => { setPayment(value); setError(''); }} style={[styles.payment, payment === value && styles.selected]}><Text style={styles.title}>{value === 'efectivo' ? 'Efectivo' : 'Transferencia'}</Text><Text style={styles.description}>{value === 'efectivo' ? 'Pago al recibir tu pedido.' : 'La transferencia se verificará al integrar el servicio de pagos.'}</Text></Pressable>)}
            {totalSummary()}
            {!totals.count && <Text style={styles.error}>Agrega productos desde el catálogo antes de continuar.</Text>}
            {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}
            <Text style={styles.description}>Modo prueba: los precios y el envío son de ejemplo. La confirmación genera un resumen local.</Text>
            <Pressable accessibilityRole="button" disabled={!totals.count} onPress={confirm} style={[styles.primary, !totals.count && styles.disabled]}><Text style={styles.primaryText}>Confirmar pedido de prueba</Text></Pressable>
          </>}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf7f2' }, header: { backgroundColor: '#fff', padding: 20 },
  brand: { fontSize: 26, fontWeight: '800', color: '#162a28' }, brandAccent: { color: '#cf3349' },
  muted: { color: '#5b6867', fontSize: 13 }, tabs: { flexDirection: 'row', padding: 8, backgroundColor: '#fff' },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, tabText: { color: '#162a28', fontWeight: '700' },
  selected: { backgroundColor: '#ffe7e9', borderColor: '#cf3349' }, content: { padding: 20, paddingBottom: 48 },
  demo: { color: '#9c2738', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 10 }, heading: { fontSize: 25, fontWeight: '800', color: '#162a28', marginBottom: 10 },
  section: { fontSize: 21, fontWeight: '800', color: '#162a28', marginTop: 26, marginBottom: 14 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#e2e5df' },
  product: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }, emoji: { fontSize: 34, marginRight: 12 }, flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#162a28' }, description: { fontSize: 14, color: '#5b6867', lineHeight: 21, marginVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginVertical: 8 },
  price: { fontSize: 21, fontWeight: '800', color: '#9c2738' }, quantity: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ffe7e9', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 25, fontWeight: '700', color: '#9c2738' }, quantityText: { minWidth: 36, textAlign: 'center', fontWeight: '700', color: '#162a28' },
  primary: { backgroundColor: '#163e37', padding: 18, minHeight: 52, borderRadius: 14, alignItems: 'center', marginTop: 12 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.4 }, remove: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, removeText: { color: '#9c2738', textDecorationLine: 'underline' },
  summary: { padding: 18, backgroundColor: '#fff', borderRadius: 16, marginTop: 12 },
  input: { minHeight: 100, borderWidth: 1, borderColor: '#81948b', borderRadius: 10, padding: 12, color: '#162a28', fontSize: 16, textAlignVertical: 'top' },
  payment: { padding: 18, borderWidth: 1, borderColor: '#d4dcd6', borderRadius: 14, backgroundColor: '#fff', marginBottom: 10 },
  error: { color: '#a51e33', marginVertical: 12, lineHeight: 22 },
});
