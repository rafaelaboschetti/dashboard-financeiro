import { Role } from '@/types';

export const roleInfo: Record<Role, { label: string; description: string }> = {
  admin: { label: 'Administrador', description: 'Acesso total: edita tudo e gerencia a equipe.' },
  financeiro: { label: 'Financeiro', description: 'Cadastra e edita contas, caixa, metas e lembretes.' },
  leitura: { label: 'Leitura', description: 'Apenas visualiza as informações (ex.: sócio, contador).' },
};
