import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authDb from '@/db/auth';
import { createUser, getCompanies, getSessionUserId, getUsers, registerCompany, setSessionUserId, verifyLogin } from '@/db/auth';
import { checkRemoval, checkRoleChange } from '@/domain/team';
import { passwordError } from '@/lib/validation';
import { Company, Role, User } from '@/types';

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  company: Company | null;
  members: User[];
  isAdmin: boolean;
  /** Administrador e Financeiro podem editar; Leitura só visualiza. */
  canEdit: boolean;
  /** `remember`: manter conectado por 30 dias (senão, a sessão termina ao fechar o app). */
  login: (email: string, password: string, remember?: boolean) => Promise<string | null>;
  register: (input: { companyName: string; name: string; email: string; password: string; withDemo: boolean }) => Promise<string | null>;
  logout: () => Promise<void>;
  addMember: (input: { name: string; email: string; password: string; role: Role }) => Promise<string | null>;
  /** Só administradores; a empresa nunca fica sem administrador. Retorna o erro, ou null. */
  setMemberRole: (userId: string, role: Role) => Promise<string | null>;
  /** Só administradores; não remove a si mesmo nem o último administrador. Retorna o erro, ou null. */
  removeMember: (userId: string) => Promise<string | null>;
  updateMyName: (name: string) => Promise<string | null>;
  /** Troca a própria senha (confere a senha atual). Retorna o erro, ou null. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
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
    async (email: string, password: string, remember = true) => {
      const result = await verifyLogin(email, password);
      if (!result.user) return result.error;
      await setSessionUserId(result.user.id, { remember });
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

  const setMemberRole = useCallback(
    async (userId: string, role: Role) => {
      if (!user) return 'Sessão expirada.';
      const err = checkRoleChange(members, user, userId, role);
      if (err) return err;
      const updated = await authDb.updateUser(userId, { role });
      await hydrate(updated.id === user.id ? updated : user);
      return null;
    },
    [user, members, hydrate],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!user) return 'Sessão expirada.';
      const err = checkRemoval(members, user, userId);
      if (err) return err;
      await authDb.deleteUser(userId);
      await hydrate(user);
      return null;
    },
    [user, members, hydrate],
  );

  const updateMyName = useCallback(
    async (name: string) => {
      if (!user) return 'Sessão expirada.';
      if (!name.trim()) return 'Informe seu nome.';
      await hydrate(await authDb.updateUser(user.id, { name }));
      return null;
    },
    [user, hydrate],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) return 'Sessão expirada.';
      const err = passwordError(newPassword);
      if (err) return err;
      return authDb.changePassword(user.id, currentPassword, newPassword);
    },
    [user],
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
      setMemberRole,
      removeMember,
      updateMyName,
      changePassword,
    }),
    [loading, user, company, members, login, register, logout, addMember, setMemberRole, removeMember, updateMyName, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
