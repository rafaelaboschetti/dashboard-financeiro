import { billsCsv, centsToDecimal, toCsv, transactionsCsv, UTF8_BOM } from '@/domain/csv';
import { Bill, Transaction } from '@/types';

const lines = (csv: string) => csv.replace(UTF8_BOM, '').trimEnd().split('\r\n');

describe('CSV para o Excel', () => {
  it('começa com a marca UTF-8 e usa ";" e quebra de linha do Windows', () => {
    const csv = toCsv(['A', 'B'], [[1, 'x']]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv).toBe(`${UTF8_BOM}A;B\r\n1;x\r\n`);
  });

  it('protege textos com ponto e vírgula, aspas e quebra de linha', () => {
    expect(lines(toCsv(['T'], [['Silva; Cia'], ['diz "oi"'], ['linha1\nlinha2']])).slice(1, 3)).toEqual(['"Silva; Cia"', '"diz ""oi"""']);
  });

  it('valores com vírgula decimal e sem "R$"', () => {
    expect(centsToDecimal(123456)).toBe('1234,56');
    expect(centsToDecimal(5)).toBe('0,05');
    expect(centsToDecimal(-1999)).toBe('-19,99');
  });

  it('movimentações em ordem de data, saídas negativas e saldo no final', () => {
    const txs: Transaction[] = [
      { id: '2', type: 'out', description: 'Aluguel', amount: 350000, date: '2026-11-10', category: 'Aluguel', billId: 'b1' },
      { id: '1', type: 'in', description: 'Vendas', amount: 500000, date: '2026-11-03', category: 'Vendas' },
    ];
    expect(lines(transactionsCsv(txs))).toEqual([
      'Data;Tipo;Descrição;Categoria;Valor (R$);Pagamento de conta',
      '03/11/2026;Entrada;Vendas;Vendas;5000,00;Não',
      '10/11/2026;Saída;Aluguel;Aluguel;-3500,00;Sim',
      ';;Saldo do período;;1500,00;',
    ]);
  });

  it('contas a pagar com situação, data de pagamento e repetição', () => {
    const bill = (over: Partial<Bill>): Bill => ({ id: 'b', description: 'Internet', amount: 19990, dueDate: '2026-11-20', category: 'Internet', recurrence: 'monthly', remindDaysBefore: 1, paid: false, ...over });
    const csv = billsCsv([bill({ id: 'b2' }), bill({ id: 'b1', description: 'Luz', dueDate: '2026-11-01', paid: true, paidAt: '2026-11-01', recurrence: 'none', supplier: 'CPFL' }), bill({ id: 'b3', description: 'DAS', dueDate: '2026-11-10' })], '2026-11-15');
    expect(lines(csv)).toEqual([
      'Vencimento;Descrição;Categoria;Fornecedor;Valor (R$);Situação;Pago em;Repetição',
      '01/11/2026;Luz;Internet;CPFL;199,90;Paga;01/11/2026;Não repete',
      '10/11/2026;DAS;Internet;;199,90;Vencida;;Mensal',
      '20/11/2026;Internet;Internet;;199,90;A vencer;;Mensal',
    ]);
  });
});
