import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { NavigationLauncher } from './src/services/navigationLauncher';
import { BackgroundLocationService } from './src/services/backgroundLocation';

export default function App() {
  const [enLinea, setEnLinea] = useState(false);
  const [tab, setTab] = useState<'pedido' | 'billetera'>('pedido');

  const toggleConexion = async () => {
    if (!enLinea) {
      await BackgroundLocationService.iniciarRastreo().catch(console.error);
      setEnLinea(true);
    } else {
      await BackgroundLocationService.detenerRastreo().catch(console.error);
      setEnLinea(false);
    }
  };

  const destinoLat = -2.1894;
  const destinoLon = -79.8891;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Modo Repartidor 🛵</Text>
          <Text style={styles.subTitle}>Juan Pérez • Moto Honda GL150</Text>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, enLinea ? styles.online : styles.offline]}
          onPress={toggleConexion}
        >
          <Text style={styles.statusText}>{enLinea ? '🟢 EN LÍNEA' : '🔴 DESCONECTADO'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pedido' && styles.activeTab]}
          onPress={() => setTab('pedido')}
        >
          <Text style={[styles.tabText, tab === 'pedido' && styles.activeTabText]}>Pedido Activo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'billetera' && styles.activeTab]}
          onPress={() => setTab('billetera')}
        >
          <Text style={[styles.tabText, tab === 'billetera' && styles.activeTabText]}>Billetera (Ledger)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {tab === 'pedido' && (
          <View>
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderBadge}>PEDIDO EN CURSO #PED-101</Text>
                <Text style={styles.timeTag}>12 min restantes</Text>
              </View>

              <Text style={styles.sectionHeader}>1. Recogida en Restaurante</Text>
              <Text style={styles.placeName}>Pizzería Napolitana Gourmet</Text>
              <Text style={styles.placeAddress}>Av. 9 de Octubre y Boyacá</Text>

              <Text style={[styles.sectionHeader, { marginTop: 14 }]}>2. Destino del Cliente</Text>
              <Text style={styles.placeName}>Carlos Andrade</Text>
              <Text style={styles.placeAddress}>Malecón 2000, Torre B, Apto 402</Text>

              <View style={styles.paymentAlert}>
                <Text style={styles.paymentAlertText}>💵 COBRAR EN EFECTIVO AL CLIENTE: $22.00</Text>
              </View>

              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Navegación Giro a Giro:</Text>
              <View style={styles.navButtonsRow}>
                <TouchableOpacity
                  style={styles.wazeButton}
                  onPress={() => NavigationLauncher.abrirWaze(destinoLat, destinoLon)}
                >
                  <Text style={styles.wazeText}>Abrir en Waze 🚙</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mapsButton}
                  onPress={() => NavigationLauncher.abrirGoogleMaps(destinoLat, destinoLon)}
                >
                  <Text style={styles.mapsText}>Google Maps 🗺️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {tab === 'billetera' && (
          <View>
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>SALDO DISPONIBLE EN BILLETERA</Text>
              <Text style={styles.walletAmount}>+$34.50</Text>
              <Text style={styles.walletSub}>Tus ganancias netas acumuladas de hoy</Text>
            </View>

            <View style={styles.debtCard}>
              <Text style={styles.debtLabel}>EFECTIVO EN MANO (DEUDA PLATAFORMA)</Text>
              <Text style={styles.debtAmount}>-$22.00</Text>
              <Text style={styles.debtSub}>Efectivo cobrado pendiente de liquidación o depósito</Text>
            </View>

            <Text style={styles.historyTitle}>Últimos Movimientos en Ledger</Text>
            <View style={styles.historyItem}>
              <View>
                <Text style={styles.historyDesc}>Entrega Finalizada #PED-100</Text>
                <Text style={styles.historyDate}>Hoy, 16:30 • Tarifa Envío</Text>
              </View>
              <Text style={styles.creditText}>+$2.50</Text>
            </View>

            <View style={styles.historyItem}>
              <View>
                <Text style={styles.historyDesc}>Recaudo Efectivo #PED-99</Text>
                <Text style={styles.historyDate}>Hoy, 15:10 • Monto recibido</Text>
              </View>
              <Text style={styles.debitText}>-$15.00</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  header: { padding: 16, backgroundColor: '#0f172a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  subTitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  online: { backgroundColor: '#064e3b' },
  offline: { backgroundColor: '#450a0a' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 6 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#1e293b' },
  tabText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  activeTabText: { color: '#e11d48' },
  content: { padding: 16 },
  orderCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  orderBadge: { color: '#e11d48', fontWeight: '800', fontSize: 12 },
  timeTag: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  sectionHeader: { color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  placeName: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  placeAddress: { color: '#cbd5e1', fontSize: 13, marginTop: 2 },
  paymentAlert: { backgroundColor: '#fef3c7', padding: 14, borderRadius: 10, marginTop: 18 },
  paymentAlertText: { color: '#92400e', fontWeight: '800', fontSize: 13 },
  navButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  wazeButton: { flex: 1, backgroundColor: '#33ccff', padding: 14, borderRadius: 12, alignItems: 'center' },
  wazeText: { color: '#000', fontWeight: '800', fontSize: 14 },
  mapsButton: { flex: 1, backgroundColor: '#34a853', padding: 14, borderRadius: 12, alignItems: 'center' },
  mapsText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  walletCard: { backgroundColor: '#064e3b', padding: 20, borderRadius: 16, marginBottom: 14 },
  walletLabel: { color: '#6ee7b7', fontSize: 11, fontWeight: '800' },
  walletAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 6 },
  walletSub: { color: '#a7f3d0', fontSize: 12, marginTop: 4 },
  debtCard: { backgroundColor: '#450a0a', padding: 20, borderRadius: 16, marginBottom: 24 },
  debtLabel: { color: '#fca5a5', fontSize: 11, fontWeight: '800' },
  debtAmount: { color: '#f87171', fontSize: 28, fontWeight: '800', marginTop: 6 },
  debtSub: { color: '#fecaca', fontSize: 12, marginTop: 4 },
  historyTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: '#0f172a', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  historyDesc: { color: '#fff', fontWeight: '700', fontSize: 14 },
  historyDate: { color: '#64748b', fontSize: 12, marginTop: 2 },
  creditText: { color: '#34d399', fontWeight: '800', fontSize: 16 },
  debitText: { color: '#f87171', fontWeight: '800', fontSize: 16 },
});

