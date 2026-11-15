import { Alert, Platform } from 'react-native';

/** Mostra uma mensagem simples (Alert no celular, window.alert na web). */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
