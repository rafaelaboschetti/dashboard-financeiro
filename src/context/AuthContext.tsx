import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { insertDemoData } from '@/db/seed';
import { friendlyError, supabase, webAppUrl } from '@/lib/supabase';
import { Company, Invitation, Role, User } from '@/types';

type ProfileRow = { user_id: string; company_id: string; name: string; email: string; role: Role };
type SignupMetadata = { name?: string; company_name?: string; with_demo?: boolean };

interface AuthContextValue {
  loading: boolean;
  /** Há uma sessão (pessoa logada), mesmo que o cadastro ainda não esteja completo. */
  signedIn: boolean;
  /** Logado, mas ainda sem empresa (ex.: confirmou o e-mail e falta concluir o cadastro). */
  needsProfile: boolean;
  /** Abriu o link de "redefinir senha" recebido por e-mail. */
  recoveringPassword: boolean;
  user: User | null;
  company: Company | null;
  members: User[];
  invitations: Invitation[];
  isAdmin: boolean;
  /** Administrador e Financeiro podem editar; Leitura só visualiza. */
  canEdit: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  /** Cria a conta. Retorna um erro, ou um aviso em `info` (ex.: confirmar e-mail). */
  register: (input: { companyName?: string; name: string; email: string; password: string; withDemo: boolean }) => Promise<{ error?: string; info?: string }>;
  completeProfile: (input: { name: string; companyName?: string; withDemo: boolean }) => Promise<string | null>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  changePassword: (password: string) => Promise<string | null>;
  updateMyName: (name: string) => Promise<string | null>;
  inviteMember: (input: { email: string; role: Role }) => Promise<string | null>;
  cancelInvitation: (id: string) => Promise<string | null>;
  setMemberRole: (userId: string, role: Role) => Promise<string | null>;
  removeMember: (userId: string) => Promise<string | null>;
  refreshTeam: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toUser = (p: ProfileRow): User => ({ id: p.user_id, companyId: p.company_id, name: p.name, email: p.email, role: p.role });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const loadedUserId = useRef<string | null>(null);

  const clear = useCallback(() => {
    loadedUserId.current = null;
    setUser(null);
    setCompany(null);
    setMembers([]);
    setInvitations([]);
  }, []);

  /** Carrega empresa, equipe e convites do usuário logado. */
  const loadTeam = useCallback(async (profile: User) => {
    const [comp, team, invites] = await Promise.all([
      supabase.from('companies').select('id, name, created_at').eq('id', profile.companyId).single(),
      supabase.from('profiles').select('user_id, company_id, name, email, role').order('created_at'),
      profile.role === 'admin' ? supabase.from('invitations').select('id, email, role, created_at').is('accepted_at', null).order('created_at') : Promise.resolve({ data: [], error: null }),
    ]);
    if (comp.data) setCompany({ id: comp.data.id, name: comp.data.name, createdAt: comp.data.created_at });
    setMembers(((team.data ?? []) as ProfileRow[]).map(toUser));
    setInvitations(((invites.data ?? []) as { id: string; email: string; role: Role; created_at: string }[]).map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.created_at })));
  }, []);

  /** Conclui o cadastro no banco (entra pelo convite ou cria a empresa) e, se pedido, cria os dados de exemplo. */
  const runCompleteSignup = useCallback(async (meta: SignupMetadata): Promise<ProfileRow> => {
    const { data, error } = await supabase.rpc('complete_signup', { p_name: meta.name?.trim() || 'Usuário', p_company_name: meta.company_name?.trim() || null });
    if (error) throw error;
    const profile = data as ProfileRow;
    if (meta.with_demo && profile.role === 'admin' && meta.company_name) {
      try {
        await insertDemoData(profile.company_id);
      } catch {
        // dados de exemplo são opcionais: se falhar, a empresa continua criada
      }
    }
    return profile;
  }, []);

  /** Lê o perfil do usuário logado; se ainda não existir, tenta concluir o cadastro com os dados enviados no signUp. */
  const loadProfile = useCallback(
    async (s: Session | null) => {
      if (!s) {
        clear();
        return;
      }
      setProfileLoading(true);
      try {
        const { data } = await supabase.from('profiles').select('user_id, company_id, name, email, role').eq('user_id', s.user.id).maybeSingle();
        let row = data as ProfileRow | null;
        if (!row) {
          try {
            row = await runCompleteSignup((s.user.user_metadata ?? {}) as SignupMetadata);
          } catch {
            row = null; // ex.: sem convite e sem nome de empresa -> tela "Concluir cadastro"
          }
        }
        if (!row) {
          clear();
          return;
        }
        const profile = toUser(row);
        loadedUserId.current = profile.id;
        setUser(profile);
        await loadTeam(profile);
      } finally {
        setProfileLoading(false);
      }
    },
    [clear, loadTeam, runCompleteSignup],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true);
      if (event === 'SIGNED_OUT') {
        setRecoveringPassword(false);
        clear();
      }
      // Não chamar o Supabase direto dentro deste callback (recomendação da biblioteca): agenda para depois.
      if (event === 'SIGNED_IN' && s && s.user.id !== loadedUserId.current) setTimeout(() => loadProfile(s), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [clear, loadProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) return friendlyError(error);
      await loadProfile(data.session);
      return null;
    },
    [loadProfile],
  );

  const register = useCallback(
    async (input: { companyName?: string; name: string; email: string; password: string; withDemo: boolean }) => {
      const meta: SignupMetadata = { name: input.name.trim(), company_name: input.companyName?.trim() || undefined, with_demo: input.withDemo };
      const { data, error } = await supabase.auth.signUp({ email: input.email.trim().toLowerCase(), password: input.password, options: { data: meta } });
      if (error) return { error: friendlyError(error) };
      if (!data.session) {
        return { info: 'Conta criada! Enviamos um e-mail de confirmação. Abra o link e depois entre com seu e-mail e senha.' };
      }
      setSession(data.session);
      await loadProfile(data.session);
      return {};
    },
    [loadProfile],
  );

  const completeProfile = useCallback(
    async (input: { name: string; companyName?: string; withDemo: boolean }) => {
      try {
        await runCompleteSignup({ name: input.name, company_name: input.companyName, with_demo: input.withDemo });
        await loadProfile(session);
        return null;
      } catch (e) {
        return friendlyError(e);
      }
    },
    [runCompleteSignup, loadProfile, session],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    clear();
  }, [clear]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : webAppUrl;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    return error ? friendlyError(error) : null;
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return friendlyError(error);
    setRecoveringPassword(false);
    return null;
  }, []);

  const refreshTeam = useCallback(async () => {
    if (user) await loadTeam(user);
  }, [user, loadTeam]);

  const updateMyName = useCallback(
    async (name: string) => {
      if (!user) return 'Sessão expirada.';
      const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('user_id', user.id);
      if (error) return friendlyError(error);
      const updated = { ...user, name: name.trim() };
      setUser(updated);
      await loadTeam(updated);
      return null;
    },
    [user, loadTeam],
  );

  const inviteMember = useCallback(
    async (input: { email: string; role: Role }) => {
      if (!user) return 'Sessão expirada.';
      const email = input.email.trim().toLowerCase();
      if (members.some((m) => m.email === email)) return 'Essa pessoa já faz parte da equipe.';
      const { error } = await supabase.from('invitations').insert({ company_id: user.companyId, email, role: input.role, invited_by: user.id });
      if (error) return friendlyError(error);
      await loadTeam(user);
      return null;
    },
    [user, members, loadTeam],
  );

  const cancelInvitation = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('invitations').delete().eq('id', id);
      if (error) return friendlyError(error);
      await refreshTeam();
      return null;
    },
    [refreshTeam],
  );

  const setMemberRole = useCallback(
    async (userId: string, role: Role) => {
      const { error } = await supabase.rpc('set_member_role', { p_user_id: userId, p_role: role });
      if (error) return friendlyError(error);
      await refreshTeam();
      return null;
    },
    [refreshTeam],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      const { error } = await supabase.rpc('remove_member', { p_user_id: userId });
      if (error) return friendlyError(error);
      await refreshTeam();
      return null;
    },
    [refreshTeam],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading: loading || (!!session && profileLoading && !user),
      signedIn: !!session,
      needsProfile: !!session && !user && !loading && !profileLoading,
      recoveringPassword,
      user,
      company,
      members,
      invitations,
      isAdmin: user?.role === 'admin',
      canEdit: user?.role === 'admin' || user?.role === 'financeiro',
      login,
      register,
      completeProfile,
      logout,
      sendPasswordReset,
      changePassword,
      updateMyName,
      inviteMember,
      cancelInvitation,
      setMemberRole,
      removeMember,
      refreshTeam,
    }),
    [loading, session, profileLoading, recoveringPassword, user, company, members, invitations, login, register, completeProfile, logout, sendPasswordReset, changePassword, updateMyName, inviteMember, cancelInvitation, setMemberRole, removeMember, refreshTeam],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
