/**
 * Versão web: navegadores não suportam agendar notificações do expo-notifications,
 * então os avisos de contas a vencer existem só no app de celular.
 */
import { Bill } from '@/types';

export const notificationsSupported = false;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  return 'denied';
}

export async function requestPermission(): Promise<boolean> {
  return false;
}

export function openSystemSettings() {}

export async function syncBillNotifications(_bills: Bill[]): Promise<number> {
  return 0;
}

export function onNotificationTap(_onOpen: (url: string) => void): () => void {
  return () => {};
}

export async function cancelBillNotifications(): Promise<void> {}
