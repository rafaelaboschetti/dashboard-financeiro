import { billStatus, totals, transactionsOfMonth } from '@/lib/finance';
import { Bill, Transaction } from '@/types';

const bill = (dueDate: string, paid = false): Bill => ({ id: 'b', description: 'x', amount: 100, dueDate, category: 'Outros', recurrence: 'none', remindDaysBefore: 1, paid });
const tx = (type: 'in' | 'out', amount: number, date = '2026-11-10'): Transaction => ({ id: Math.random().toString(), type, description: 'x', amount, date, category: 'Outros' });

describe('situação da conta', () => {
  const today = '2026-11-15';
  it.each([
    ['2026-11-01', false, 'overdue'],
    ['2026-11-15', false, 'today'],
    ['2026-11-22', false, 'soon'],
    ['2026-11-23', false, 'later'],
    ['2026-11-01', true, 'paid'],
  ])('vencimento %s (paga=%s) → %s', (due, paid, expected) => {
    expect(billStatus(bill(due as string, paid as boolean), today)).toBe(expected);
  });
});

describe('totais do caixa', () => {
  it('soma entradas, saídas e saldo', () => {
    expect(totals([tx('in', 1000), tx('in', 500), tx('out', 300)])).toEqual({ income: 1500, expense: 300, balance: 1200 });
    expect(totals([])).toEqual({ income: 0, expense: 0, balance: 0 });
  });

  it('filtra as movimentações do mês', () => {
    const list = [tx('in', 1, '2026-11-01'), tx('in', 2, '2026-11-30'), tx('in', 3, '2026-12-01')];
    expect(transactionsOfMonth(list, '2026-11').map((t) => t.amount)).toEqual([1, 2]);
  });
});
