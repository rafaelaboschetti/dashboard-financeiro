import { currentMonthKey, monthKey, shiftMonthKey, todayISO } from '@/lib/format';
import { Bill, Transaction } from '@/types';

export type BillStatus = 'paid' | 'overdue' | 'today' | 'soon' | 'later';

export function billStatus(bill: Bill, today = todayISO()): BillStatus {
  if (bill.paid) return 'paid';
  if (bill.dueDate < today) return 'overdue';
  if (bill.dueDate === today) return 'today';
  const days = (Date.parse(bill.dueDate) - Date.parse(today)) / 86400000;
  return days <= 7 ? 'soon' : 'later';
}

export function totals(transactions: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'in') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function transactionsOfMonth(transactions: Transaction[], key: string) {
  return transactions.filter((t) => monthKey(t.date) === key);
}

/** Entradas e saídas dos últimos `count` meses (o último é o mês atual). */
export function lastMonths(transactions: Transaction[], count = 6) {
  const now = currentMonthKey();
  return Array.from({ length: count }, (_, i) => {
    const key = shiftMonthKey(now, i - (count - 1));
    const { income, expense } = totals(transactionsOfMonth(transactions, key));
    return { key, income, expense };
  });
}
