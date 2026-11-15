import { type Href, router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { KEYS, read, write } from '@/db/storage';
import * as alerts from '@/lib/alerts';
import { useData } from './DataContext';

interface NotificationsContextValue {
  /** Falso na web (navegador não agenda avisos). */
  supported: boolean;
  /** Avisos ligados neste aparelho (e com permissão do sistema). */
  enabled: boolean;
  /** Permissão negada no sistema: só dá para liberar nas configurações do celular. */
  blocked: boolean;
  /** Quantos avisos estão agendados agora. */
  scheduledCount: number;
  /** Liga/desliga. Ao ligar, pede a permissão; retorna se ficou ligado. */
  setEnabled: (on: boolean) => Promise<boolean>;
  openSettings: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** Mantém os avisos (contas a vencer e lembretes) agendados conforme os dados mudam. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { bills, reminders, ready } = useData();
  const [enabled, setEnabledState] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Lê a preferência e a permissão atual ao entrar.
  useEffect(() => {
    if (!alerts.notificationsSupported) return;
    let cancelled = false;
    Promise.all([read<{ enabled: boolean }>(KEYS.notifications, { enabled: false }), alerts.getPermissionState()]).then(([pref, permission]) => {
      if (cancelled) return;
      setBlocked(permission === 'denied');
      setEnabledState(pref.enabled && permission === 'granted');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tocar no aviso abre a tela de contas.
  useEffect(() => alerts.onNotificationTap((url) => router.push(url as Href)), []);

  // Reagenda sempre que as contas mudam (com uma pequena espera para agrupar alterações).
  useEffect(() => {
    if (!enabled || !ready) return;
    const timer = setTimeout(() => {
      alerts
        .syncNotifications(bills, reminders)
        .then(setScheduledCount)
        .catch(() => setScheduledCount(0));
    }, 800);
    return () => clearTimeout(timer);
  }, [enabled, ready, bills, reminders]);

  const setEnabled = useCallback(async (on: boolean) => {
    if (!on) {
      await alerts.cancelBillNotifications();
      await write(KEYS.notifications, { enabled: false });
      setEnabledState(false);
      setScheduledCount(0);
      return false;
    }
    const granted = await alerts.requestPermission();
    setBlocked(!granted && (await alerts.getPermissionState()) === 'denied');
    await write(KEYS.notifications, { enabled: granted });
    setEnabledState(granted);
    return granted;
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ supported: alerts.notificationsSupported, enabled, blocked, scheduledCount, setEnabled, openSettings: alerts.openSystemSettings }),
    [enabled, blocked, scheduledCount, setEnabled],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications deve ser usado dentro de <NotificationsProvider>');
  return ctx;
}
