import { MAX_SCHEDULED, planAllAlerts, planBillReminders, planGeneralReminders } from '@/domain/alerts';
import { Bill, Reminder } from '@/types';

const bill = (over: Partial<Bill>): Bill => ({
  id: over.id ?? 'b1',
  description: 'Aluguel',
  amount: 350000,
  dueDate: '2026-11-20',
  category: 'Aluguel',
  recurrence: 'none',
  remindDaysBefore: 3,
  paid: false,
  ...over,
});

/** 15/11/2026 às 8h (horário local). */
const now = new Date(2026, 10, 15, 8, 0, 0);
const local = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

describe('avisos de contas a vencer', () => {
  it('avisa às 9h do dia "X dias antes" do vencimento', () => {
    const [r] = planBillReminders([bill({})], now);
    expect(local(r.date)).toEqual([2026, 11, 17, 9, 0]);
    expect(r.title).toBe('Conta a pagar: Aluguel');
    expect(r.body).toBe('R$ 3.500,00 — vence em 3 dias (20/11/2026)');
  });

  it('"no dia" e "1 dia antes" usam os textos certos e mostram o fornecedor', () => {
    const [noDia] = planBillReminders([bill({ remindDaysBefore: 0, supplier: 'Imobiliária' })], now);
    expect(local(noDia.date)).toEqual([2026, 11, 20, 9, 0]);
    expect(noDia.body).toBe('R$ 3.500,00 — vence hoje · Imobiliária');
    expect(planBillReminders([bill({ remindDaysBefore: 1 })], now)[0].body).toContain('vence amanhã');
  });

  it('se o dia do aviso já passou, avisa no dia do vencimento', () => {
    const [r] = planBillReminders([bill({ dueDate: '2026-11-16', remindDaysBefore: 7 })], now);
    expect(local(r.date)).toEqual([2026, 11, 16, 9, 0]);
    expect(r.body).toContain('vence hoje');
  });

  it('conta que vence hoje ainda é avisada se ainda não deu 9h; depois das 9h, não', () => {
    expect(planBillReminders([bill({ dueDate: '2026-11-15' })], now)).toHaveLength(1);
    expect(planBillReminders([bill({ dueDate: '2026-11-15' })], new Date(2026, 10, 15, 10, 0))).toHaveLength(0);
  });

  it('não avisa contas pagas nem vencidas', () => {
    expect(planBillReminders([bill({ paid: true }), bill({ id: 'b2', dueDate: '2026-11-10' })], now)).toHaveLength(0);
  });

  it('ordena do mais próximo e respeita o limite de avisos agendados', () => {
    const many = Array.from({ length: 70 }, (_, i) => bill({ id: `b${i}`, dueDate: `2027-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}` }));
    const planned = planBillReminders(many, now);
    expect(planned).toHaveLength(MAX_SCHEDULED);
    expect(planned.every((r, i) => i === 0 || planned[i - 1].date <= r.date)).toBe(true);
  });
});

describe('avisos de lembretes', () => {
  const lembrete = (over: Partial<Reminder>): Reminder => ({ id: 'r1', title: 'Reunião com contador', date: '2026-11-18', priority: 'alta', done: false, ...over });

  it('avisa às 9h do dia do lembrete, com as observações', () => {
    const [r] = planGeneralReminders([lembrete({ notes: 'Levar extratos' })], now);
    expect(local(r.date)).toEqual([2026, 11, 18, 9, 0]);
    expect(r).toMatchObject({ url: '/lembretes', title: 'Lembrete: Reunião com contador', body: 'Levar extratos · prioridade alta' });
  });

  it('não avisa lembretes concluídos ou que já passaram', () => {
    expect(planGeneralReminders([lembrete({ done: true }), lembrete({ id: 'r2', date: '2026-11-10' })], now)).toHaveLength(0);
  });

  it('contas e lembretes juntos, em ordem e com o tocar levando à tela certa', () => {
    const all = planAllAlerts([bill({ dueDate: '2026-11-25' })], [lembrete({})], now);
    expect(all.map((a) => a.url)).toEqual(['/lembretes', '/contas']);
  });
});
