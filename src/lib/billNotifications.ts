/**
 * Avisos de contas a vencer no celular (notificações locais, sem servidor).
 * O que avisar e quando vem de src/domain/billReminders.ts; aqui só se fala com o sistema.
 * Na web não há agendamento: ver billNotifications.web.ts.
 */
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { planBillReminders } from '@/domain/billReminders';
import { Bill } from '@/types';

export const notificationsSupported = true;

const CHANNEL_ID = 'contas-a-vencer';

// Mostra o aviso mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // No Android, sem som o aviso não aparece no topo da tela.
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** No Android 13+ o pedido de permissão só aparece depois que existe um canal. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Contas a vencer',
    description: 'Avisos antes do vencimento das contas a pagar',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  const { status, granted, ios } = await Notifications.getPermissionsAsync();
  if (granted || ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return status === 'denied' ? 'denied' : 'undetermined';
}

/** Pede a permissão (cria o canal antes). Retorna se ficou permitido. */
export async function requestPermission(): Promise<boolean> {
  await ensureChannel();
  if ((await getPermissionState()) === 'granted') return true;
  const result = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Depois de negar, o Android não pergunta de novo: só dá para liberar nas configurações. */
export function openSystemSettings() {
  Linking.openSettings();
}

/** Cancela os avisos agendados e agenda de novo a partir das contas atuais. */
export async function syncBillNotifications(bills: Bill[]): Promise<number> {
  if ((await getPermissionState()) !== 'granted') return 0;
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  const planned = planBillReminders(bills, new Date());
  for (const r of planned) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { billId: r.billId, url: '/contas' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL_ID },
    });
  }
  return planned.length;
}

/** Chama `onOpen` com o endereço da tela quando a pessoa toca num aviso. Retorna a função para parar de ouvir. */
export function onNotificationTap(onOpen: (url: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') onOpen(url);
  });
  return () => sub.remove();
}

export async function cancelBillNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
