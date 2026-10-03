import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// Asegura que tanto en Expo Go como en builds nativas el entorno esté correctamente configurado.
registerRootComponent(App);
