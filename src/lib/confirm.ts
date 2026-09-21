import { Alert, Platform } from 'react-native';

/** Confirmação que funciona no celular (Alert) e na versão web (window.confirm). */
export function confirmAction(title: string, message: string, onConfirm: () => void, confirmLabel = 'Excluir') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
