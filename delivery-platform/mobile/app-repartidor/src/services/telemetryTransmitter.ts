// Transmisor de Telemetría WebSocket en Tiempo Real para Repartidor (Baba y Babahoyo)

export interface LocationPayload {
  repartidorId: string;
  pedidoId?: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
}

export class TelemetryTransmitter {
  private ws: WebSocket | null = null;
  private intervalId: any = null;
  private isOnline = false;
  private repartidorId: string;
  private wsUrl: string;
  private currentLat = -1.7925;
  private currentLon = -79.6790;
  private activeOrderId?: string;

  constructor(wsUrl: string, repartidorId = 'usr-repartidor-01') {
    this.wsUrl = wsUrl;
    this.repartidorId = repartidorId;
  }

  public setLocation(lat: number, lon: number) {
    this.currentLat = lat;
    this.currentLon = lon;
  }

  public setActiveOrder(pedidoId?: string) {
    this.activeOrderId = pedidoId;
  }

  public startOnlineTransmission() {
    this.isOnline = true;
    this.connectWebSocket();

    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.sendLocationPulse();
    }, 5000);
  }

  public stopTransmission() {
    this.isOnline = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignorar
      }
      this.ws = null;
    }
  }

  private connectWebSocket() {
    if (!this.isOnline) return;
    try {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => {
        this.sendLocationPulse();
      };
      this.ws.onerror = () => {
        // Reconexión silenciosa si falla
      };
      this.ws.onclose = () => {
        if (this.isOnline) {
          setTimeout(() => this.connectWebSocket(), 3000);
        }
      };
    } catch {
      // Ignorar en entornos sin soporte nativo de sockets
    }
  }

  public sendLocationPulse() {
    if (!this.isOnline) return;
    const payload: LocationPayload = {
      repartidorId: this.repartidorId,
      pedidoId: this.activeOrderId,
      lat: this.currentLat,
      lon: this.currentLon,
      speed: 6.94, // 25 km/h promedio en moto en Baba
      heading: 90,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'REPARTIDOR_LOCATION_UPDATE',
        payload,
      }));
    }
  }
}
