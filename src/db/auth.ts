import * as Crypto from 'expo-crypto';

import { uid } from '@/lib/format';
import { Company, Role, User } from '@/types';
import { demoCompanyData, emptyCompanyData } from './seed';
import { KEYS, read, remove, write } from './storage';

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function getUsers(): Promise<User[]> {
  return read<User[]>(KEYS.users, []);
}

export async function getCompanies(): Promise<Company[]> {
  return read<Company[]>(KEYS.companies, []);
}

export async function getSessionUserId(): Promise<string | null> {
  return read<string | null>(KEYS.session, null);
}

export async function setSessionUserId(id: string | null): Promise<void> {
  if (id) await write(KEYS.session, id);
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
    passwordHash: await hashPassword(input.password, salt),
  };
  await write(KEYS.users, [...users, user]);
  return user;
}

/** Cria uma empresa nova + o primeiro usuário (administrador). */
export async function registerCompany(input: { companyName: string; name: string; email: string; password: string; withDemo: boolean }): Promise<User> {
  const company: Company = { id: uid(), name: input.companyName.trim(), createdAt: new Date().toISOString() };
  const user = await createUser({ companyId: company.id, name: input.name, email: input.email, password: input.password, role: 'admin' });
  await write(KEYS.companies, [...(await getCompanies()), company]);
  await write(KEYS.data(company.id), input.withDemo ? demoCompanyData() : emptyCompanyData());
  return user;
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const user = (await getUsers()).find((u) => u.email === normalizeEmail(email));
  if (!user) return null;
  return (await hashPassword(password, user.salt)) === user.passwordHash ? user : null;
}
