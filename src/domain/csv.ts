/**
 * Geração de planilhas CSV (funções puras). Formato pensado para o Excel em português:
 * separador ";", vírgula decimal, datas DD/MM/AAAA e marca UTF-8 (BOM) para acentos.
 */
import { billStatus } from '@/lib/finance';
import { isoToBR } from '@/lib/format';
import { Bill, Transaction } from '@/types';

const SEPARATOR = ';';
/** Marca no início do arquivo que faz o Excel reconhecer acentos (UTF-8). */
export const UTF8_BOM = '﻿';

/** Coloca o valor entre aspas quando ele contém separador, aspas ou quebra de linha. */
function cell(value: string | number): string {
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Centavos em número com vírgula decimal, sem "R$" (para o Excel poder somar): 123456 → "1234,56". */
export function centsToDecimal(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  return `${neg ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return UTF8_BOM + [header, ...rows].map((r) => r.map(cell).join(SEPARATOR)).join('\r\n') + '\r\n';
}

const TYPE_LABEL = { in: 'Entrada', out: 'Saída' } as const;

/** Movimentações (em ordem de data), com uma linha final de saldo. */
export function transactionsCsv(transactions: Transaction[]): string {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const rows: (string | number)[][] = sorted.map((t) => [isoToBR(t.date), TYPE_LABEL[t.type], t.description, t.category, centsToDecimal(t.type === 'in' ? t.amount : -t.amount), t.billId ? 'Sim' : 'Não']);
  const balance = sorted.reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);
  rows.push(['', '', 'Saldo do período', '', centsToDecimal(balance), '']);
  return toCsv(['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)', 'Pagamento de conta'], rows);
}

const STATUS_LABEL = { paid: 'Paga', overdue: 'Vencida', today: 'Vence hoje', soon: 'A vencer', later: 'A vencer' } as const;
const RECURRENCE_LABEL = { none: 'Não repete', monthly: 'Mensal', yearly: 'Anual' } as const;

/** Contas a pagar (em ordem de vencimento), com a situação calculada para `today`. */
export function billsCsv(bills: Bill[], today: string): string {
  const sorted = [...bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const rows = sorted.map((b) => [
    isoToBR(b.dueDate),
    b.description,
    b.category,
    b.supplier ?? '',
    centsToDecimal(b.amount),
    STATUS_LABEL[billStatus(b, today)],
    b.paidAt ? isoToBR(b.paidAt) : '',
    RECURRENCE_LABEL[b.recurrence],
  ]);
  return toCsv(['Vencimento', 'Descrição', 'Categoria', 'Fornecedor', 'Valor (R$)', 'Situação', 'Pago em', 'Repetição'], rows);
}
