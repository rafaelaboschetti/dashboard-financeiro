import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import * as Crypto from 'expo-crypto';

import { uid } from '@/lib/format';
import { utf8Encode } from '@/lib/utf8';
import { Company, Role, User } from '@/types';
import { emptyCompanyData } from './seed';
import { KEYS, read, remove, write } from './storage';

/* ---------- senha ---------- */

/**
 * PBKDF2-SHA256: cada tentativa de senha custa 100 mil rodadas de hash, o que torna
 * testar senhas em massa muito mais lento que o SHA-256 simples usado antes.
 * O número de iterações fica gravado no próprio hash, então dá para aumentar depois.
 */
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2-sha256';

async function pbkdf2Hash(password: string, salt: string, iterations: number): Promise<string> {
  const derived = await pbkdf2Async(sha256, utf8Encode(password), utf8Encode(salt), { c: iterations, dkLen: 32 });
  return `${PBKDF2_PREFIX}$${iterations}$${bytesToHex(derived)}`;
}

/** Formato antigo (SHA-256 simples), mantido só para validar e atualizar contas existentes. */
async function legacySha256Hash(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

/** Compara sem parar no primeiro caractere diferente (não vaza quanto da senha acertou). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function checkPassword(user: User, password: string): Promise<{ ok: boolean; needsRehash: boolean }> {
  const parts = user.passwordHash.split('$');
  if (parts.length === 3 && parts[0] === PBKDF2_PREFIX) {
    const iterations = Number(parts[1]);
    const ok = safeEqual(await pbkdf2Hash(password, user.salt, iterations), user.passwordHash);
    return { ok, needsRehash: ok && iterations < PBKDF2_ITERATIONS };
  }
  const ok = safeEqual(await legacySha256Hash(password, user.salt), user.passwordHash);
  return { ok, needsRehash: ok };
}

/* ---------- limite de tentativas de login ---------- */

/** Depois de 5 erros seguidos, o e-mail fica bloqueado por 30 s, dobrando a cada novo erro (até 15 min). */
const MAX_FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;

type Attempts = Record<string, { fails: number; lockedUntil: number }>;

async function lockedSeconds(email: string): Promise<number> {
  const entry = (await read<Attempts>(KEYS.loginAttempts, {}))[email];
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.lockedUntil - Date.now()) / 1000));
}

async function registerFailure(email: string): Promise<void> {
  const attempts = await read<Attempts>(KEYS.loginAttempts, {});
  const fails = (attempts[email]?.fails ?? 0) + 1;
  const lockMs = fails >= MAX_FREE_ATTEMPTS ? Math.min(BASE_LOCK_MS * 2 ** (fails - MAX_FREE_ATTEMPTS), MAX_LOCK_MS) : 0;
  attempts[email] = { fails, lockedUntil: Date.now() + lockMs };
  await write(KEYS.loginAttempts, attempts);
}

async function clearFailures(email: string): Promise<void> {
  const attempts = await read<Attempts>(KEYS.loginAttempts, {});
  if (!attempts[email]) return;
  delete attempts[email];
  await write(KEYS.loginAttempts, attempts);
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} segundo${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
}

/* ---------- usuários, empresas e sessão ---------- */

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Com "Manter conectado", a sessão fica gravada e expira depois de 30 dias sem abrir o app
 * (cada abertura renova o prazo). Sem essa opção, nada é gravado: a sessão vive só na memória
 * e termina quando o app (ou a aba do navegador) é fechado.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

type Session = { userId: string; expiresAt: number };

export async function getUsers(): Promise<User[]> {
  return read<User[]>(KEYS.users, []);
}

export async function getCompanies(): Promise<Company[]> {
  return read<Company[]>(KEYS.companies, []);
}

/** Retorna o usuário da sessão atual (se ainda for válida) e renova o prazo dela. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await read<Session | string | null>(KEYS.session, null);
  // Sessões do formato antigo (só o id) não têm prazo: obriga a entrar de novo.
  if (!session || typeof session === 'string' || session.expiresAt < Date.now()) {
    if (session) await remove(KEYS.session);
    return null;
  }
  await setSessionUserId(session.userId);
  return session.userId;
}

/** Abre (ou renova) a sessão. Com `remember: false` a sessão não é gravada no aparelho. */
export async function setSessionUserId(id: string | null, options: { remember?: boolean } = {}): Promise<void> {
  const remember = options.remember ?? true;
  if (id && remember) await write<Session>(KEYS.session, { userId: id, expiresAt: Date.now() + SESSION_TTL_MS });
  else await remove(KEYS.session);
}

export async function createUser(input: { companyId: string; name: string; email: string; password: string; role: Role }): Promise<User> {
  const users = await getUsers();
  const email = normalizeEmail(input.email);
  if (users.some((u) => u.email === email)) throw new Error('Já existe um usuário com este e-mail.');
  const salt = Crypto.randomUUID();
  const user: User = {
    id: uid(),
    companyId: input.companyId,
    name: input.name.trim(),
    email,
    role: input.role,
    salt,
    passwordHash: await pbkdf2Hash(input.password, salt, PBKDF2_ITERATIONS),
  };
  await write(KEYS.users, [...(await getUsers()), user]);
  return user;
}

/** Altera nome e/ou perfil de acesso de um usuário (as regras de quem pode ficam em src/domain/team.ts). */
export async function updateUser(id: string, changes: { name?: string; role?: Role }): Promise<User> {
  const users = await getUsers();
  const current = users.find((u) => u.id === id);
  if (!current) throw new Error('Usuário não encontrado.');
  const updated: User = { ...current, ...(changes.name !== undefined && { name: changes.name.trim() }), ...(changes.role && { role: changes.role }) };
  await write(KEYS.users, users.map((u) => (u.id === id ? updated : u)));
  return updated;
}

/** Remove o usuário. Se ele estiver logado neste aparelho, a sessão deixa de valer (usuário inexistente). */
export async function deleteUser(id: string): Promise<void> {
  await write(KEYS.users, (await getUsers()).filter((u) => u.id !== id));
}

/** Troca a senha, conferindo a senha atual. */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<string | null> {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return 'Usuário não encontrado.';
  if (!(await checkPassword(user, currentPassword)).ok) return 'A senha atual está incorreta.';
  if (newPassword === currentPassword) return 'A nova senha precisa ser diferente da atual.';
  const salt = Crypto.randomUUID();
  const updated: User = { ...user, salt, passwordHash: await pbkdf2Hash(newPassword, salt, PBKDF2_ITERATIONS) };
  await write(KEYS.users, (await getUsers()).map((u) => (u.id === userId ? updated : u)));
  return null;
}

/** Cria uma empresa nova + o primeiro usuário (administrador). */
export async function registerCompany(input: { companyName: string; name: string; email: string; password: string }): Promise<User> {
  const company: Company = { id: uid(), name: input.companyName.trim(), createdAt: new Date().toISOString() };
  const user = await createUser({ companyId: company.id, name: input.name, email: input.email, password: input.password, role: 'admin' });
  await write(KEYS.companies, [...(await getCompanies()), company]);
  await write(KEYS.data(company.id), emptyCompanyData());
  return user;
}

export type LoginResult = { user: User; error?: undefined } | { user?: undefined; error: string };

export async function verifyLogin(emailInput: string, password: string): Promise<LoginResult> {
  const email = normalizeEmail(emailInput);

  const wait = await lockedSeconds(email);
  if (wait > 0) return { error: `Muitas tentativas incorretas. Tente de novo em ${formatWait(wait)}.` };

  const users = await getUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    // Calcula um hash mesmo assim, para a resposta demorar o mesmo que com um e-mail existente.
    await pbkdf2Hash(password, 'usuario-inexistente', PBKDF2_ITERATIONS);
    await registerFailure(email);
    return { error: 'E-mail ou senha incorretos.' };
  }

  const { ok, needsRehash } = await checkPassword(user, password);
  if (!ok) {
    await registerFailure(email);
    return { error: 'E-mail ou senha incorretos.' };
  }

  await clearFailures(email);
  if (needsRehash) {
    // Atualiza contas antigas (SHA-256 simples) para PBKDF2 no primeiro login bem-sucedido.
    const salt = Crypto.randomUUID();
    const upgraded: User = { ...user, salt, passwordHash: await pbkdf2Hash(password, salt, PBKDF2_ITERATIONS) };
    await write(KEYS.users, (await getUsers()).map((u) => (u.id === user.id ? upgraded : u)));
    return { user: upgraded };
  }
  return { user };
}
