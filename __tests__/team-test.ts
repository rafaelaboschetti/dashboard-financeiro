import { checkRemoval, checkRoleChange, Member } from '@/domain/team';
import { Role } from '@/types';

const u = (id: string, role: Role, companyId = 'c1'): Member => ({ id, companyId, role });

describe('equipe', () => {
  const ana = u('ana', 'admin');
  const caio = u('caio', 'financeiro');
  const lia = u('lia', 'leitura');
  const outra = u('bia', 'admin', 'c2');
  const members = [ana, caio, lia];

  it('só administradores alteram perfis e removem membros', () => {
    expect(checkRoleChange(members, caio, 'lia', 'admin')).toMatch(/Somente administradores/);
    expect(checkRemoval(members, lia, 'caio')).toMatch(/Somente administradores/);
  });

  it('administrador promove e rebaixa membros', () => {
    expect(checkRoleChange(members, ana, 'lia', 'financeiro')).toBeNull();
    expect(checkRoleChange(members, ana, 'caio', 'admin')).toBeNull();
  });

  it('a empresa nunca fica sem administrador', () => {
    expect(checkRoleChange(members, ana, 'ana', 'leitura')).toMatch(/pelo menos um administrador/);
    const twoAdmins = [...members, u('rui', 'admin')];
    expect(checkRoleChange(twoAdmins, ana, 'ana', 'leitura')).toBeNull();
    expect(checkRemoval(twoAdmins, ana, 'rui')).toBeNull();
  });

  it('administradores de outra empresa não contam', () => {
    expect(checkRoleChange([...members, outra], ana, 'ana', 'leitura')).toMatch(/pelo menos um administrador/);
  });

  it('ninguém remove a si mesmo', () => {
    expect(checkRemoval(members, ana, 'ana')).toMatch(/a si mesmo/);
  });

  it('não mexe em membros de outra empresa', () => {
    expect(checkRoleChange([...members, outra], ana, 'bia', 'leitura')).toBe('Membro não encontrado.');
    expect(checkRemoval([...members, outra], ana, 'bia')).toBe('Membro não encontrado.');
  });
});
