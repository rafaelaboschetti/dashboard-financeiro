import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createUser, getCompanies, getSessionUserId, getUsers, registerCompany, setSessionUserId, verifyLogin } from '@/db/auth';
import { Company, Role, User } from '@/types';

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  company: Company | null;
  members: User[];
  isAdmin: boolean;
  /** Administrador e Financeiro podem editar; Leitura só visualiza. */
  canEdit: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (input: { companyName: string; name: string; email: string; password: string; withDemo: boolean }) => Promise<string | null>;
  logout: () => Promise<void>;
  addMember: (input: { name: string; email: string; password: string; role: Role }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<User[]>([]);

  const hydrate = useCallback(async (u: User | null) => {
    if (!u) {
      setUser(null);
      setCompany(null);
      setMembers([]);
      return;
    }
    const [companies, users] = await Promise.all([getCompanies(), getUsers()]);
    setUser(u);
    setCompany(companies.find((c) => c.id === u.companyId) ?? null);
    setMembers(users.filter((x) => x.companyId === u.companyId));
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getSessionUserId();
      const users = await getUsers();
      await hydrate(users.find((u) => u.id === id) ?? null);
      setLoading(false);
    })();
  }, [hydrate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await verifyLogin(email, password);
      if (!result.user) return result.error;
      await setSessionUserId(result.user.id);
      await hydrate(result.user);
      return null;
    },
    [hydrate],
  );

  const register = useCallback(
    async (input: { companyName: string; name: string; email: string; password: string; withDemo: boolean }) => {
      try {
        const u = await registerCompany(input);
        await setSessionUserId(u.id);
        await hydrate(u);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Não foi possível criar a conta.';
      }
    },
    [hydrate],
  );

  const logout = useCallback(async () => {
    await setSessionUserId(null);
    await hydrate(null);
  }, [hydrate]);

  const addMember = useCallback(
    async (input: { name: string; email: string; password: string; role: Role }) => {
      if (!user) return 'Sessão expirada.';
      // Confere o perfil aqui também, e não só escondendo o botão na tela.
      if (user.role !== 'admin') return 'Somente administradores podem adicionar usuários.';
      try {
        await createUser({ ...input, companyId: user.companyId });
        await hydrate(user);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Não foi possível adicionar o membro.';
      }
    },
    [user, hydrate],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      company,
      members,
      isAdmin: user?.role === 'admin',
      canEdit: user?.role === 'admin' || user?.role === 'financeiro',
      login,
      register,
      logout,
      addMember,
    }),
    [loading, user, company, members, login, register, logout, addMember],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
