import { Linking, Alert, Platform } from 'react-native';
import { navigationUrls } from '../courierModel';

export const NavigationLauncher = {
  abrirWaze: async (lat: number, lon: number) => {
    try {
      const { waze: url, wazeWeb } = navigationUrls({ lat, lng: lon }, Platform.OS);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(wazeWeb);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la navegación con Waze.');
    }
  },

  abrirGoogleMaps: async (lat: number, lon: number) => {
    try {
      const { maps: url, mapsWeb } = navigationUrls({ lat, lng: lon }, Platform.OS);
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
      } else {
        await Linking.openURL(mapsWeb);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar Google Maps.');
    }
  },
};
