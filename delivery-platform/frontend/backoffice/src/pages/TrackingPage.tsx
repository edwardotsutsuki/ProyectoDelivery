import { useState, type FormEvent } from 'react';
import { Navigation, Radio, MapPin } from 'lucide-react';
import CourierTrackingMap from '@delivery/tracking-web';
import { trackingConfig, trackingScenarios } from '../trackingConfig';
import './TrackingPage.css';

export default function TrackingPage() {
  const [scenarioId, setScenarioId] = useState('baba');
  const [orderId, setOrderId] = useState('ORD-BABA-001');
  const [courierId, setCourierId] = useState('');
  const [active, setActive] = useState<{ scenarioId: string; orderId: string; courierId?: string } | null>(null);
  const scenario = trackingScenarios.find(item => item.id === (active?.scenarioId ?? scenarioId))!;
  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderId.trim()) return;
    setActive({ scenarioId, orderId: orderId.trim(), courierId: courierId.trim() || undefined });
  }
  return <section className="backoffice-tracking" aria-labelledby="tracker-title">
    <div className="tracker-intro"><span className="tracker-kicker">OPERACIÓN · SEGUIMIENTO</span><h1 id="tracker-title">Cada entrega, en el mapa</h1><p>Consulta la ubicación recibida de un pedido y su ruta hasta el destino.</p></div>
    <div className="tracker-demo-note"><Radio size={18} aria-hidden="true" /><span>Entorno de prueba · Los puntos son escenarios del piloto. La moto aparece solo al recibir GPS; no se simulan posiciones ni ETA.</span></div>
    <form onSubmit={start} className="tracker-controls">
      <label>Escenario<select value={scenarioId} onChange={event => { setScenarioId(event.target.value); setOrderId(trackingScenarios.find(item => item.id === event.target.value)!.orderId); }}><option value="baba">Baba · Centro → San Antonio</option><option value="babahoyo">Babahoyo · Malecón → 6 de Octubre</option></select></label>
      <label htmlFor="tracking-order">Número de pedido<input id="tracking-order" required maxLength={128} value={orderId} onChange={event => setOrderId(event.target.value)} autoComplete="off" pattern=".*\S.*" /></label>
      <label htmlFor="tracking-courier">ID de repartidor <span>(opcional)</span><input id="tracking-courier" maxLength={128} value={courierId} onChange={event => setCourierId(event.target.value)} placeholder="Todos los del pedido" autoComplete="off" /></label>
      <button type="submit"><Navigation size={17} aria-hidden="true" />{active ? 'Actualizar seguimiento' : 'Iniciar seguimiento'}</button>
    </form>
    {active ? <><div className="tracker-active"><span><MapPin size={15} aria-hidden="true" />{scenario.city} · #{active.orderId}{active.courierId ? ` · ${active.courierId}` : ''}</span><button type="button" onClick={() => setActive(null)}>Detener seguimiento</button></div><CourierTrackingMap orderId={active.orderId} courierId={active.courierId} restaurant={scenario.restaurant} destination={scenario.destination} trackingUrl={trackingConfig.trackingUrl} osrmUrl={trackingConfig.osrmUrl} /></> : <div className="tracker-empty"><Navigation size={40} aria-hidden="true" /><h2>Elige un pedido para comenzar</h2><p>El mapa mostrará restaurante y entrega. La conexión permanece cerrada hasta iniciar el seguimiento.</p></div>}
  </section>;
}
