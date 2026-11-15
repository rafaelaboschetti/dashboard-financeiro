/**
 * Planejamento dos avisos no celular (funções puras, sem notificações de verdade):
 * decide quando e com qual texto avisar cada conta a vencer e cada lembrete.
 * Quem agenda no celular é src/lib/alerts.ts.
 */
import { addDays, daysBetween, formatMoney, isoToBR, parseISO } from '@/lib/format';
import { Bill, Reminder } from '@/types';

/** Hora do dia em que os avisos aparecem. */
export const REMINDER_HOUR = 9;

/** O iOS só guarda 64 avisos agendados por app; fica uma folga. */
export const MAX_SCHEDULED = 50;

export interface PlannedReminder {
  /** Conta ou lembrete que gerou o aviso. */
  sourceId: string;
  /** Tela aberta ao tocar no aviso. */
  url: '/contas' | '/lembretes';
  date: Date;
  title: string;
  body: string;
}

function at(iso: string, hour: number): Date {
  const d = parseISO(iso);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function whenText(dueDate: string, onDay: string): string {
  const days = daysBetween(onDay, dueDate);
  if (days <= 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  return `vence em ${days} dias (${isoToBR(dueDate)})`;
}

/**
 * Para cada conta não paga, um aviso às 9h do dia "X dias antes do vencimento".
 * Se esse horário já passou mas a conta ainda não venceu, avisa às 9h do dia do vencimento.
 * Contas pagas, vencidas ou com aviso já passado não geram aviso.
 * Retorna os mais próximos primeiro, no máximo `MAX_SCHEDULED`.
 */
export function planBillReminders(bills: Bill[], now: Date): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const bill of bills) {
    if (bill.paid) continue;
    const options = [addDays(bill.dueDate, -Math.max(0, bill.remindDaysBefore)), bill.dueDate];
    const day = options.find((iso) => at(iso, REMINDER_HOUR) > now);
    if (!day) continue;
    planned.push({
      sourceId: bill.id,
      url: '/contas',
      date: at(day, REMINDER_HOUR),
      title: `Conta a pagar: ${bill.description}`,
      body: `${formatMoney(bill.amount)} — ${whenText(bill.dueDate, day)}${bill.supplier ? ` · ${bill.supplier}` : ''}`,
    });
  }
  return planned.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

const PRIORITY_LABEL: Record<Reminder['priority'], string> = { alta: 'prioridade alta', media: 'prioridade média', baixa: 'prioridade baixa' };

/** Um aviso às 9h do dia de cada lembrete ainda não concluído (se esse horário ainda não passou). */
export function planGeneralReminders(reminders: Reminder[], now: Date): PlannedReminder[] {
  return reminders
    .filter((r) => !r.done && at(r.date, REMINDER_HOUR) > now)
    .map((r) => ({
      sourceId: r.id,
      url: '/lembretes' as const,
      date: at(r.date, REMINDER_HOUR),
      title: `Lembrete: ${r.title}`,
      body: r.notes ? `${r.notes} · ${PRIORITY_LABEL[r.priority]}` : `Hoje · ${PRIORITY_LABEL[r.priority]}`,
    }));
}

/** Contas e lembretes juntos, do mais próximo ao mais distante, dentro do limite de avisos agendados. */
export function planAllAlerts(bills: Bill[], reminders: Reminder[], now: Date): PlannedReminder[] {
  return [...planBillReminders(bills, now), ...planGeneralReminders(reminders, now)]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED);
}
