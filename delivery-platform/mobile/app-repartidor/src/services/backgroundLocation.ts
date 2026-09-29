import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK_NAME = 'DELIVERY_COURIER_BACKGROUND_GPS_TASK';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Error en tarea GPS en segundo plano:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latestLocation = locations[locations.length - 1];

    if (latestLocation) {
      const payload = {
        type: 'REPARTIDOR_LOCATION_UPDATE',
        lat: latestLocation.coords.latitude,
        lon: latestLocation.coords.longitude,
        heading: latestLocation.coords.heading,
        speed: latestLocation.coords.speed,
        timestamp: latestLocation.timestamp,
      };

      try {
        console.log('[GPS TRANSMITTING]:', payload.lat, payload.lon, `Speed: ${payload.speed}m/s`);
      } catch (err) {
        console.error('Error transmitiendo ubicación GPS:', err);
      }
    }
  }
});

export const BackgroundLocationService = {
  iniciarRastreo: async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Permiso de ubicación en primer plano denegado');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Permiso en segundo plano no otorgado; operando solo en primer plano.');
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
      deferredUpdatesInterval: 5000,
      foregroundService: {
        notificationTitle: 'DeliveryYa - Turno Activo',
        notificationBody: 'Transmitiendo tu ruta a clientes y comercios en tiempo real.',
        notificationColor: '#e11d48',
      },
    });
  },

  detenerRastreo: async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  },
};
