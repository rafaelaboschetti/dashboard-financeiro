/**
 * Regras da equipe (funções puras, sem armazenamento): quem pode mudar o perfil
 * de acesso ou remover alguém. Retornam a mensagem de erro, ou null se for permitido.
 */
import { Role, User } from '@/types';

/** Só o que as regras precisam saber de cada pessoa. */
export type Member = Pick<User, 'id' | 'companyId' | 'role'>;

const adminCount = (members: Member[], companyId: string) => members.filter((m) => m.companyId === companyId && m.role === 'admin').length;

export function checkRoleChange(members: Member[], actor: Member, targetId: string, newRole: Role): string | null {
  if (actor.role !== 'admin') return 'Somente administradores podem alterar perfis.';
  const target = members.find((m) => m.id === targetId && m.companyId === actor.companyId);
  if (!target) return 'Membro não encontrado.';
  if (target.role === 'admin' && newRole !== 'admin' && adminCount(members, actor.companyId) <= 1) {
    return 'A empresa precisa de pelo menos um administrador.';
  }
  return null;
}

export function checkRemoval(members: Member[], actor: Member, targetId: string): string | null {
  if (actor.role !== 'admin') return 'Somente administradores podem remover membros.';
  if (actor.id === targetId) return 'Você não pode remover a si mesmo. Peça a outro administrador.';
  const target = members.find((m) => m.id === targetId && m.companyId === actor.companyId);
  if (!target) return 'Membro não encontrado.';
  if (target.role === 'admin' && adminCount(members, actor.companyId) <= 1) return 'A empresa precisa de pelo menos um administrador.';
  return null;
}
