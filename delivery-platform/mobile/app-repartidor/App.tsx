import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, ScrollView, Switch, Platform } from 'react-native';
import { NavigationLauncher } from './src/services/navigationLauncher';
import { initialShift, setAvailability, transition, RESTAURANT, type Action, type Status } from './src/courierModel';
import { dailyWallet, money, type Wallet } from './src/walletModel';
import { fetchWallet } from './src/services/walletApi';

const DEFAULT_API = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';
const labels: Record<Status, string> = { READY_FOR_PICKUP: 'Listo para despacho', ACCEPTED: 'Aceptado · recoger en restaurante', ON_THE_WAY: 'En camino al cliente', DELIVERED: 'Entregado' };
const actions: Partial<Record<Status, { action: Action; label: string }>> = { READY_FOR_PICKUP: { action: 'ACCEPT', label: 'Aceptar' }, ACCEPTED: { action: 'START', label: 'En Camino' }, ON_THE_WAY: { action: 'DELIVER', label: 'Entregado' } };

export default function App({ apiBaseUrl = DEFAULT_API }: { apiBaseUrl?: string }) {
  const current = useRef(initialShift());
  const [shift, setShift] = useState(current.current);
  const [tab, setTab] = useState<'orders' | 'wallet'>('orders');
  const [error, setError] = useState('');
  const [gpsReady, setGpsReady] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletError, setWalletError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [synced, setSynced] = useState<Date | null>(null);
  useEffect(() => {
    setGpsReady(false);
    if (!shift.online) return;
    const timer = setTimeout(() => setGpsReady(true), 1000);
    return () => clearTimeout(timer);
  }, [shift.online]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (tab !== 'wallet') return;
    const controller = new AbortController();
    setLoading(true); setWalletError('');
    fetchWallet(apiBaseUrl, controller.signal).then(value => {
      if (!controller.signal.aborted) { setWallet(value); setSynced(new Date()); setNow(new Date()); }
    }).catch(cause => {
      if (!controller.signal.aborted) setWalletError(cause instanceof Error && cause.name !== 'AbortError' ? cause.message : 'La consulta tardó demasiado. Reintenta.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tab, apiBaseUrl, reload]);
  function update(action: () => typeof shift) {
    try { const next = action(); current.current = next; setShift(next); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la acción.'); }
  }
  const daily = wallet ? dailyWallet(wallet, now) : null;
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text style={styles.brand}>Tu turno en Baba 🛵</Text><Text style={styles.muted}>Moto Baba 01 · Los Ríos · Babahoyo: expansión</Text>
      <View style={styles.row}><View><Text style={styles.title}>{shift.online ? 'Online · Turno activo' : 'Offline · Fuera de turno'}</Text><Text style={styles.muted}>GPS simulado: {!shift.online ? 'desconectado' : gpsReady ? 'conectado · Baba Centro' : 'buscando señal…'}</Text></View><Switch accessibilityLabel="Disponibilidad Online / Offline" value={shift.online} onValueChange={online => update(() => setAvailability(current.current, online))} trackColor={{ false: '#64748b', true: '#059669' }} /></View>
    </View>
    <View style={styles.tabs}>{([{ id: 'orders', label: 'Comandas' }, { id: 'wallet', label: 'Billetera' }] as const).map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => { setTab(item.id); setError(''); }} style={[styles.tab, tab === item.id && styles.selected]}><Text style={styles.title}>{item.label}</Text></Pressable>)}</View>
    <ScrollView contentContainerStyle={styles.content}>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {tab === 'orders' ? <>
        <Text style={styles.kicker}>COMANDAS DE PRUEBA · BABA</Text><Text style={styles.heading}>Listos para salir</Text><Text style={styles.description}>Acepta una comanda, recoge en el restaurante y marca la entrega al llegar. Los cambios son locales y no afectan a la billetera real.</Text>
        {!shift.online && <Text style={styles.notice}>Activa Online para aceptar pedidos. El GPS es simulado y no solicita permisos.</Text>}
        {shift.orders.map(order => {
          const next = actions[order.status];
          const target = order.status === 'ON_THE_WAY' || order.status === 'DELIVERED' ? order.destination : RESTAURANT;
          return <View key={order.id} style={styles.card}>
            <Text style={styles.kicker}>#{order.id}</Text><Text style={styles.title}>{labels[order.status]}</Text>
            <Text style={styles.description}>{RESTAURANT.name}</Text><Text style={styles.title}>{order.customer}</Text><Text style={styles.description}>{order.address}</Text>
            <Text style={styles.notice}>{order.payment === 'efectivo' ? `Cobro en efectivo: ${money(order.totalCents)}` : `Transferencia · No cobrar efectivo · ${money(order.totalCents)}`}</Text>
            {order.status !== 'DELIVERED' && <><Text style={styles.muted}>Navegar hacia {order.status === 'ON_THE_WAY' ? 'el cliente' : 'el restaurante'}</Text><View style={styles.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Waze para ${order.id}`} style={styles.secondary} onPress={() => void NavigationLauncher.abrirWaze(target.lat, target.lng)}><Text style={styles.title}>Waze ↗</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Google Maps para ${order.id}`} style={styles.secondary} onPress={() => void NavigationLauncher.abrirGoogleMaps(target.lat, target.lng)}><Text style={styles.title}>Google Maps ↗</Text></Pressable>
            </View></>}
            {next && <Pressable accessibilityRole="button" accessibilityLabel={`${next.label}, pedido ${order.id}`} disabled={!shift.online} onPress={() => update(() => transition(current.current, order.id, next.action))} style={[styles.primary, !shift.online && styles.disabled]}><Text style={styles.primaryText}>{next.label}</Text></Pressable>}
          </View>;
        })}
      </> : <>
        <Text style={styles.kicker}>BILLETERA · DATOS DEL GATEWAY</Text><Text style={styles.heading}>Tu balance</Text><Text style={styles.description}>Repartidor de prueba usr-repartidor-01 · USD · Día de Ecuador</Text>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => setReload(value => value + 1)} style={[styles.primary, loading && styles.disabled]}><Text style={styles.primaryText}>{loading ? 'Consultando…' : walletError ? 'Reintentar consulta' : 'Actualizar billetera'}</Text></Pressable>
        {!!walletError && <Text accessibilityRole="alert" style={styles.error}>{walletError}{wallet ? ' Se conserva la última consulta; puede estar desactualizada.' : ''}</Text>}
        {!wallet && !loading && <Text style={styles.description}>Saldo no disponible. No se muestra un saldo ficticio.</Text>}
        {wallet && daily && <>
          <View style={styles.balance}><Text style={styles.title}>{daily.partial ? 'Neto de hoy · parcial' : 'Neto de hoy'}</Text><Text style={styles.amount}>{money(daily.netCents)}</Text><Text style={styles.muted}>Suma de movimientos recibidos del día, no saldo disponible para retirar.</Text></View>
          <View style={styles.card}><Text style={styles.title}>Saldo acumulado del servidor</Text><Text style={styles.amount}>{money(wallet.balanceCents)}</Text><Text style={styles.description}>{wallet.balanceCents < 0 ? 'Saldo deudor ante la plataforma.' : 'Saldo neto acumulado del ledger.'}</Text>
            <Text style={styles.description}>Efectivo de hoy (deuda): {money(daily.cashDebtCents)}</Text><Text style={styles.description}>Comisiones de hoy (netas): {money(daily.commissionCents)}</Text><Text style={styles.description}>Otros movimientos de hoy: {money(daily.otherCents)}</Text>
            {daily.partial && <Text style={styles.notice}>El servidor limita el historial a 50 movimientos. El neto y desglose de hoy pueden estar incompletos.</Text>}
          </View>
          <Text style={styles.heading}>Movimientos de hoy</Text>{!daily.movements.length && <Text style={styles.description}>Sin movimientos recibidos para hoy.</Text>}
          {daily.movements.map(item => <View key={item.id} style={styles.card}><Text style={styles.title}>{item.description}</Text><Text style={styles.muted}>{new Date(item.date).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' })} · {item.type}</Text><Text style={[styles.value, { color: item.cents < 0 ? '#fda4af' : '#6ee7b7' }]}>{money(item.cents)}</Text></View>)}
          {synced && <Text style={styles.muted}>Última consulta: {synced.toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' })}</Text>}
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1321' }, header: { padding: 20, backgroundColor: '#132237' }, brand: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginVertical: 12 },
  tabs: { flexDirection: 'row', padding: 8, gap: 8 }, tab: { flex: 1, minHeight: 48, padding: 14, alignItems: 'center', borderRadius: 12 }, selected: { backgroundColor: '#26405b' },
  content: { padding: 20, paddingBottom: 48 }, kicker: { color: '#6ee7b7', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  heading: { color: '#fff', fontSize: 25, fontWeight: '800', marginVertical: 12 }, title: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' }, muted: { color: '#b0c1d3', fontSize: 12, marginTop: 6 },
  description: { color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginVertical: 10 }, card: { backgroundColor: '#15243a', padding: 18, borderRadius: 18, marginVertical: 10 },
  primary: { backgroundColor: '#6ee7b7', minHeight: 48, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 }, primaryText: { color: '#062d27', fontWeight: '800', fontSize: 16 },
  secondary: { backgroundColor: '#29445f', padding: 14, minHeight: 48, borderRadius: 12 }, disabled: { opacity: 0.4 },
  notice: { backgroundColor: '#263950', color: '#fde68a', padding: 12, borderRadius: 10, marginVertical: 12, lineHeight: 21 }, error: { color: '#fecdd3', backgroundColor: '#502331', padding: 14, marginVertical: 12, borderRadius: 10 },
  balance: { backgroundColor: '#075246', borderRadius: 18, padding: 20, marginTop: 20 }, amount: { color: '#fff', fontWeight: '800', fontSize: 32, marginVertical: 10 }, value: { fontSize: 20, fontWeight: '700', marginTop: 10 },
});
