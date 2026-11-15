import * as Crypto from 'expo-crypto';

const pad = (n: number) => String(n).padStart(2, '0');

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Identificador aleatório criptograficamente seguro (Math.random é previsível). */
export function uid(): string {
  return Crypto.randomUUID();
}

/* ---------- dinheiro (centavos) ---------- */

export function formatMoney(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const int = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}R$ ${int},${pad(abs % 100)}`;
}

/** Extrai os dígitos de um texto digitado e devolve centavos. */
export function centsFromInput(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, 12);
  return digits ? parseInt(digits, 10) : 0;
}

/* ---------- datas (ISO AAAA-MM-DD, sempre no fuso local) ---------- */

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  return Math.round((parseISO(toISOStr).getTime() - parseISO(fromISO).getTime()) / 86400000);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

export function isoToBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function shortDateBR(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Máscara DD/MM/AAAA enquanto digita. */
export function maskDate(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Converte DD/MM/AAAA em ISO; devolve null se a data não existir. */
export function brToISO(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return toISO(date);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKey(todayISO());
}

export function shiftMonthKey(key: string, n: number): string {
  return monthKey(addMonths(`${key}-01`, n));
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

export function monthShort(key: string): string {
  return MONTHS_SHORT[Number(key.split('-')[1]) - 1];
}

/** Texto amigável para vencimentos: "Vence hoje", "Vence em 3 dias", "Atrasada há 2 dias". */
export function dueText(dueISO: string, today = todayISO()): string {
  const diff = daysBetween(today, dueISO);
  if (diff === 0) return 'Vence hoje';
  if (diff === 1) return 'Vence amanhã';
  if (diff > 1) return `Vence em ${diff} dias`;
  if (diff === -1) return 'Atrasada há 1 dia';
  return `Atrasada há ${-diff} dias`;
}
