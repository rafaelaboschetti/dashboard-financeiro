import { addMonths, brToISO, centsFromInput, daysBetween, dueText, formatMoney, maskDate, monthLabel, shiftMonthKey } from '@/lib/format';

describe('dinheiro', () => {
  it('formata centavos em reais', () => {
    expect(formatMoney(0)).toBe('R$ 0,00');
    expect(formatMoney(5)).toBe('R$ 0,05');
    expect(formatMoney(123456789)).toBe('R$ 1.234.567,89');
    expect(formatMoney(-150)).toBe('-R$ 1,50');
  });

  it('extrai centavos do que foi digitado', () => {
    expect(centsFromInput('R$ 12,34')).toBe(1234);
    expect(centsFromInput('')).toBe(0);
    expect(centsFromInput('abc')).toBe(0);
    expect(centsFromInput('9'.repeat(20))).toBe(999999999999); // limita a 12 dígitos
  });
});

describe('datas', () => {
  it('converte DD/MM/AAAA para ISO e recusa datas inexistentes', () => {
    expect(brToISO('15/11/2026')).toBe('2026-11-15');
    expect(brToISO('29/02/2028')).toBe('2028-02-29');
    expect(brToISO('29/02/2027')).toBeNull();
    expect(brToISO('31/04/2026')).toBeNull();
    expect(brToISO('1/1/2026')).toBeNull();
  });

  it('aplica a máscara enquanto digita', () => {
    expect(maskDate('1')).toBe('1');
    expect(maskDate('151')).toBe('15/1');
    expect(maskDate('15112026999')).toBe('15/11/2026');
  });

  it('soma meses sem pular para o mês seguinte em dias 29-31', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-05-10', 12)).toBe('2027-05-10');
  });

  it('calcula dias entre datas, inclusive na troca de horário de verão', () => {
    expect(daysBetween('2026-11-15', '2026-11-20')).toBe(5);
    expect(daysBetween('2026-11-20', '2026-11-15')).toBe(-5);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });

  it('descreve o vencimento', () => {
    const today = '2026-11-15';
    expect(dueText('2026-11-15', today)).toBe('Vence hoje');
    expect(dueText('2026-11-16', today)).toBe('Vence amanhã');
    expect(dueText('2026-11-20', today)).toBe('Vence em 5 dias');
    expect(dueText('2026-11-14', today)).toBe('Atrasada há 1 dia');
    expect(dueText('2026-11-10', today)).toBe('Atrasada há 5 dias');
  });

  it('navega e nomeia meses', () => {
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(monthLabel('2026-03')).toBe('Março de 2026');
  });
});
