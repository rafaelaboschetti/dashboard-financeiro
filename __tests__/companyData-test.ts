import * as domain from '@/domain/companyData';
import { CompanyData } from '@/types';

/** Contexto previsível: ids sequenciais e "hoje" fixo. */
function makeCtx(today = '2026-11-15'): domain.DomainContext {
  let n = 0;
  return { today, newId: () => `id${++n}` };
}

const base = (): CompanyData => ({
  categories: [
    { id: 'c-aluguel', name: 'Aluguel', type: 'out', color: '#000000' },
    { id: 'c-outros', name: 'Outros', type: 'out', color: '#111111' },
    { id: 'c-vendas', name: 'Vendas', type: 'in', color: '#222222' },
  ],
  bills: [],
  transactions: [],
  goals: [],
  reminders: [],
});

const aluguel: domain.NewBill = { description: 'Aluguel', amount: 350000, dueDate: '2026-11-20', category: 'Aluguel', recurrence: 'monthly', remindDaysBefore: 3 };

describe('contas a pagar', () => {
  it('pagar cria a saída no caixa e a próxima conta recorrente', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const id = d.bills[0].id;
    d = domain.payBill(d, id, ctx);

    const paid = d.bills.find((b) => b.id === id)!;
    expect(paid).toMatchObject({ paid: true, paidAt: '2026-11-15' });
    expect(d.transactions).toEqual([{ id: paid.transactionId, type: 'out', description: 'Aluguel', amount: 350000, date: '2026-11-15', category: 'Aluguel', billId: id }]);
    const next = d.bills.find((b) => b.id === paid.nextBillId)!;
    expect(next).toMatchObject({ dueDate: '2026-12-20', paid: false, amount: 350000 });
  });

  it('conta anual gera a próxima um ano depois; conta única não gera', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), { ...aluguel, recurrence: 'yearly' }, ctx);
    d = domain.payBill(d, d.bills[0].id, ctx);
    expect(d.bills[1].dueDate).toBe('2027-11-20');

    let e = domain.addBill(base(), { ...aluguel, recurrence: 'none' }, ctx);
    e = domain.payBill(e, e.bills[0].id, ctx);
    expect(e.bills).toHaveLength(1);
  });

  it('pagar duas vezes não duplica a saída', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const id = d.bills[0].id;
    d = domain.payBill(domain.payBill(d, id, ctx), id, ctx);
    expect(d.transactions).toHaveLength(1);
    expect(d.bills).toHaveLength(2);
  });

  it('desfazer o pagamento remove a saída e a próxima conta ainda não paga', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const id = d.bills[0].id;
    d = domain.unpayBill(domain.payBill(d, id, ctx), id);
    expect(d.transactions).toHaveLength(0);
    expect(d.bills).toHaveLength(1);
    expect(d.bills[0]).toMatchObject({ paid: false, paidAt: undefined, transactionId: undefined, nextBillId: undefined });
  });

  it('desfazer não apaga a próxima conta se ela já foi paga', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const first = d.bills[0].id;
    d = domain.payBill(d, first, ctx);
    const second = d.bills[1].id;
    d = domain.payBill(d, second, ctx);
    d = domain.unpayBill(d, first);
    expect(d.bills.find((b) => b.id === second)?.paid).toBe(true);
  });

  it('editar uma conta paga atualiza a saída no caixa', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const id = d.bills[0].id;
    d = domain.payBill(d, id, ctx);
    d = domain.updateBill(d, id, { description: 'Aluguel da sala', amount: 360000, category: 'Outros' });
    expect(d.transactions[0]).toMatchObject({ description: 'Aluguel da sala', amount: 360000, category: 'Outros' });
  });

  it('excluir uma conta paga exclui a saída junto (sem saída órfã)', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const id = d.bills[0].id;
    d = domain.payBill(d, id, ctx);
    d = domain.removeBill(d, id);
    expect(d.transactions).toHaveLength(0);
    expect(d.bills.every((b) => b.id !== id && b.nextBillId !== id)).toBe(true);
  });
});

describe('caixa', () => {
  it('editar a saída de um pagamento atualiza a conta e continua sendo saída', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const id = d.bills[0].id;
    d = domain.payBill(d, id, ctx);
    const txId = d.transactions[0].id;
    d = domain.updateTransaction(d, txId, { amount: 370000, date: '2026-11-18', type: 'in' });
    expect(d.transactions[0]).toMatchObject({ amount: 370000, type: 'out' });
    expect(d.bills.find((b) => b.id === id)).toMatchObject({ amount: 370000, paidAt: '2026-11-18' });
  });

  it('excluir a saída de um pagamento volta a conta para "a pagar"', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    const id = d.bills[0].id;
    d = domain.payBill(d, id, ctx);
    d = domain.removeTransaction(d, d.transactions[0].id);
    expect(d.transactions).toHaveLength(0);
    expect(d.bills.find((b) => b.id === id)?.paid).toBe(false);
    expect(d.bills).toHaveLength(1); // a próxima recorrente (não paga) também sai
  });

  it('movimentação comum pode trocar de tipo e é excluída normalmente', () => {
    const ctx = makeCtx();
    let d = domain.addTransaction(base(), { type: 'in', description: 'Venda', amount: 1000, date: '2026-11-10', category: 'Vendas' }, ctx);
    d = domain.updateTransaction(d, d.transactions[0].id, { type: 'out' });
    expect(d.transactions[0].type).toBe('out');
    expect(domain.removeTransaction(d, d.transactions[0].id).transactions).toHaveLength(0);
  });
});

describe('metas e lembretes', () => {
  it('o valor guardado da meta nunca fica negativo', () => {
    const ctx = makeCtx();
    let d = domain.addGoal(base(), { title: 'Reserva', target: 1000, current: 100, deadline: '2027-01-01' }, ctx);
    const id = d.goals[0].id;
    d = domain.contributeToGoal(d, id, 250);
    expect(d.goals[0].current).toBe(350);
    d = domain.contributeToGoal(d, id, -1000);
    expect(d.goals[0].current).toBe(0);
    d = domain.updateGoal(d, id, { current: -5 });
    expect(d.goals[0].current).toBe(0);
  });

  it('lembrete: criar, editar, concluir e excluir', () => {
    const ctx = makeCtx();
    let d = domain.addReminder(base(), { title: 'Contador', date: '2026-11-20', priority: 'alta' }, ctx);
    const id = d.reminders[0].id;
    d = domain.updateReminder(d, id, { title: 'Reunião com contador' });
    d = domain.toggleReminder(d, id);
    expect(d.reminders[0]).toMatchObject({ title: 'Reunião com contador', done: true });
    expect(domain.removeReminder(d, id).reminders).toHaveLength(0);
  });
});

describe('categorias', () => {
  it('não cria rótulo duplicado (ignora maiúsculas e espaços)', () => {
    const d = domain.addCategory(base(), { name: '  aluguel ', type: 'out', color: '#333333' }, makeCtx());
    expect(d.categories).toHaveLength(3);
  });

  it('o mesmo nome pode existir em entradas e em saídas', () => {
    const d = domain.addCategory(base(), { name: 'Aluguel', type: 'in', color: '#333333' }, makeCtx());
    expect(d.categories).toHaveLength(4);
  });

  it('renomear atualiza contas e movimentações do mesmo tipo', () => {
    const ctx = makeCtx();
    let d = domain.addBill(base(), aluguel, ctx);
    d = domain.addTransaction(d, { type: 'in', description: 'Sublocação', amount: 1, date: '2026-11-01', category: 'Aluguel' }, ctx);
    const r = domain.updateCategory(d, 'c-aluguel', { name: 'Aluguel e condomínio' });
    expect(r.error).toBeUndefined();
    expect(r.data!.bills[0].category).toBe('Aluguel e condomínio');
    expect(r.data!.transactions[0].category).toBe('Aluguel'); // entrada não é afetada
  });

  it('renomear para um nome existente é recusado', () => {
    expect(domain.updateCategory(base(), 'c-aluguel', { name: 'outros' }).error).toBe('Esse rótulo já existe.');
    expect(domain.updateCategory(base(), 'c-aluguel', { name: '  ' }).error).toBe('Digite o nome do rótulo.');
  });

  it('excluir um rótulo em uso move os lançamentos para "Outros" (sem órfãos)', () => {
    const ctx = makeCtx();
    const d = domain.addBill(base(), aluguel, ctx);
    const r = domain.removeCategory(d, 'c-aluguel', ctx, '#999999');
    expect(r.data!.categories.some((c) => c.name === 'Aluguel')).toBe(false);
    expect(r.data!.bills[0].category).toBe('Outros');
  });

  it('cria "Outras receitas" se precisar mover entradas e ele não existir', () => {
    const ctx = makeCtx();
    const d = domain.addTransaction(base(), { type: 'in', description: 'Venda', amount: 1, date: '2026-11-01', category: 'Vendas' }, ctx);
    const r = domain.removeCategory(d, 'c-vendas', ctx, '#999999');
    expect(r.data!.categories.find((c) => c.type === 'in')?.name).toBe('Outras receitas');
    expect(r.data!.transactions[0].category).toBe('Outras receitas');
  });

  it('não exclui o rótulo padrão enquanto estiver em uso; sem uso, exclui', () => {
    const ctx = makeCtx();
    const inUse = domain.addBill(base(), { ...aluguel, category: 'Outros' }, ctx);
    expect(domain.removeCategory(inUse, 'c-outros', ctx, '#999999').error).toMatch(/está em uso/);
    expect(domain.removeCategory(base(), 'c-outros', ctx, '#999999').data!.categories).toHaveLength(2);
  });
});
