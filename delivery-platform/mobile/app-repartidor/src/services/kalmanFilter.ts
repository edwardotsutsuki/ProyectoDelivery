/**
 * Filtro de Kalman 2D para Suavizado de Telemetría GPS de Repartidores
 * (Baba, Babahoyo, Montalvo y Corredor E484 de Los Ríos)
 *
 * Filtra el ruido satelital, amortigua el jitter y los saltos bruscos entre edificaciones,
 * calculando rumbo (bearing en grados) y velocidad continua (speedMps en m/s).
 */

export interface FilteredLocation {
  lat: number;
  lon: number;
  accuracy: number;
  speedMps: number;
  bearing: number;
  timestampMs: number;
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

export class KalmanGpsFilter {
  private lat = -1.7925;
  private lon = -79.6790;
  private variance = 25.0; // Varianza inicial (5m de error al cuadrado)
  private speedMps = 0;
  private bearing = 90;
  private accuracy = 5.0;
  private timestampMs = 0;
  private isInitialized = false;

  private processNoise: number;
  private minAccuracy: number;

  constructor(processNoise = 4.0, minAccuracy = 3.0) {
    this.processNoise = processNoise;
    this.minAccuracy = minAccuracy;
  }

  public filter(
    measuredLat: number,
    measuredLon: number,
    measuredAccuracy = 5.0,
    timestampMs = Date.now()
  ): FilteredLocation {
    const accuracy = Math.max(measuredAccuracy, this.minAccuracy);

    if (!this.isInitialized) {
      this.lat = measuredLat;
      this.lon = measuredLon;
      this.accuracy = accuracy;
      this.variance = accuracy * accuracy;
      this.timestampMs = timestampMs;
      this.isInitialized = true;
      return this.getState();
    }

    const dtSeconds = Math.max(0.1, (timestampMs - this.timestampMs) / 1000);

    // 1. Predicción: La varianza se incrementa con el paso del tiempo y el ruido de proceso
    this.variance += dtSeconds * this.processNoise * this.processNoise;

    // 2. Ganancia de Kalman
    const measurementVariance = accuracy * accuracy;
    const kalmanGain = this.variance / (this.variance + measurementVariance);

    // 3. Actualización de coordenadas estimadas
    const prevLat = this.lat;
    const prevLon = this.lon;

    this.lat += kalmanGain * (measuredLat - this.lat);
    this.lon += kalmanGain * (measuredLon - this.lon);

    // 4. Actualización de la covarianza del error
    this.variance = (1 - kalmanGain) * this.variance;
    this.accuracy = Math.sqrt(this.variance);

    // 5. Cálculo de velocidad y rumbo
    const distMeters = haversineDistanceMeters(prevLat, prevLon, this.lat, this.lon);
    if (distMeters > 0.5) {
      this.speedMps = Number((distMeters / dtSeconds).toFixed(2));
      this.bearing = Math.round(calculateBearing(prevLat, prevLon, this.lat, this.lon));
    } else {
      // Amortiguación de velocidad en reposo
      this.speedMps = 0;
    }

    this.timestampMs = timestampMs;
    return this.getState();
  }

  public getState(): FilteredLocation {
    return {
      lat: Number(this.lat.toFixed(6)),
      lon: Number(this.lon.toFixed(6)),
      accuracy: Number(this.accuracy.toFixed(1)),
      speedMps: this.speedMps,
      bearing: this.bearing,
      timestampMs: this.timestampMs || Date.now(),
    };
  }

  public reset(lat = -1.7925, lon = -79.6790) {
    this.lat = lat;
    this.lon = lon;
    this.variance = 25.0;
    this.speedMps = 0;
    this.bearing = 90;
    this.accuracy = 5.0;
    this.timestampMs = Date.now();
    this.isInitialized = true;
  }
}
