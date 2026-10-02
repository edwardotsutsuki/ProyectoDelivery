import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

export default function App() {
  const [tab, setTab] = useState<'inicio' | 'carrito' | 'tracking'>('inicio');
  const [cart, setCart] = useState<{ id: string; nombre: string; precio: number; cantidad: number }[]>([
    { id: '1', nombre: 'Pizza Margherita Mediana', precio: 9.50, cantidad: 1 },
    { id: '2', nombre: 'Gaseosa 500ml', precio: 1.50, cantidad: 2 },
  ]);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'saldo_virtual'>('efectivo');

  const total = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0) + 1.50;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>Delivery<Text style={{ color: '#e11d48' }}>Ya</Text></Text>
        <Text style={styles.headerSubtitle}>📍 Baba Centro · Los Ríos</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabButton, tab === 'inicio' && styles.tabActive]} onPress={() => setTab('inicio')}>
          <Text style={[styles.tabText, tab === 'inicio' && styles.tabTextActive]}>Explorar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, tab === 'carrito' && styles.tabActive]} onPress={() => setTab('carrito')}>
          <Text style={[styles.tabText, tab === 'carrito' && styles.tabTextActive]}>Carrito ({cart.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, tab === 'tracking' && styles.tabActive]} onPress={() => setTab('tracking')}>
          <Text style={[styles.tabText, tab === 'tracking' && styles.tabTextActive]}>En Camino</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {tab === 'inicio' && (
          <View>
            <Text style={styles.sectionTitle}>Comercios Abiertos Cerca de Ti</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pizzería de prueba · Baba Centro</Text>
              <Text style={styles.cardSubtitle}>Pizzas Artesanales • 25-35 min • ⭐ 4.9</Text>
              <View style={styles.productRow}>
                <View>
                  <Text style={styles.productName}>Pizza Margherita</Text>
                  <Text style={styles.productPrice}>$9.50</Text>
                </View>
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>+ Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {tab === 'carrito' && (
          <View>
            <Text style={styles.sectionTitle}>Tu Carrito (Conectado a Redis)</Text>
            {cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Text style={styles.cartItemText}>{item.cantidad}x {item.nombre}</Text>
                <Text style={styles.cartItemPrice}>${(item.precio * item.cantidad).toFixed(2)}</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Método de Pago</Text>
            {(['efectivo', 'transferencia', 'saldo_virtual'] as const).map((metodo) => (
              <TouchableOpacity
                key={metodo}
                style={[styles.paymentOption, metodoPago === metodo && styles.paymentOptionSelected]}
                onPress={() => setMetodoPago(metodo)}
              >
                <Text style={[styles.paymentText, metodoPago === metodo && styles.paymentTextSelected]}>
                  {metodo === 'efectivo' && '💵 Efectivo contra entrega'}
                  {metodo === 'transferencia' && '🏦 Transferencia bancaria directa'}
                  {metodo === 'saldo_virtual' && '💳 Billetera DeliveryYa (Saldo)'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.totalBox}>
              <Text style={styles.totalText}>Total a Pagar (inc. envío):</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.checkoutBtn} onPress={() => setTab('tracking')}>
              <Text style={styles.checkoutBtnText}>Confirmar Pedido 🛵</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'tracking' && (
          <View style={styles.trackingBox}>
            <Text style={styles.trackingTitle}>¡Tu pedido está en camino!</Text>
            <Text style={styles.trackingSub}>Conectado a WebSocket en tiempo real</Text>

            <View style={styles.mapMock}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🛵</Text>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Repartidor Juan Pérez</Text>
              <Text style={{ color: '#34d399', fontSize: 13, marginTop: 4 }}>A 4 minutos de tu puerta (Ruta OSRM)</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  brandTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { color: '#64748b', fontSize: 13, marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 8 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#ffe4e6' },
  tabText: { fontWeight: '700', color: '#64748b', fontSize: 13 },
  tabTextActive: { color: '#e11d48' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardSubtitle: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 16 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  productPrice: { fontSize: 14, color: '#e11d48', fontWeight: '800' },
  addButton: { backgroundColor: '#e11d48', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cartItemText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  cartItemPrice: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  paymentOption: { padding: 14, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, marginBottom: 8, backgroundColor: '#fff' },
  paymentOptionSelected: { borderColor: '#e11d48', backgroundColor: '#fff1f2' },
  paymentText: { fontWeight: '600', color: '#334155' },
  paymentTextSelected: { color: '#e11d48', fontWeight: '700' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingVertical: 12, borderTopWidth: 2, borderTopColor: '#0f172a' },
  totalText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#e11d48' },
  checkoutBtn: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  checkoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  trackingBox: { alignItems: 'center', paddingVertical: 20 },
  trackingTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  trackingSub: { color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 20 },
  mapMock: { width: '100%', height: 260, backgroundColor: '#0f172a', borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 20 },
});

