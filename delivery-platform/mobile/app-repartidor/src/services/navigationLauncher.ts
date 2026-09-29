import { Linking, Alert, Platform } from 'react-native';

export const NavigationLauncher = {
  abrirWaze: async (lat: number, lon: number) => {
    const url = `waze://?ll=${lat},${lon}&navigate=yes`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la navegación con Waze.');
    }
  },

  abrirGoogleMaps: async (lat: number, lon: number) => {
    const url = Platform.select({
      android: `google.navigation:q=${lat},${lon}&mode=d`,
      ios: `comgooglemaps://?daddr=${lat},${lon}&directionsmode=driving`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    });

    try {
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
      } else {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar Google Maps.');
    }
  },
};
