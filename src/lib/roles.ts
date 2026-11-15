import type { Tone } from '@/components/ui';
import { Role } from '@/types';

/** Nome, descrição e cor de cada perfil de acesso (fonte única para todas as telas). */
export const roleInfo: Record<Role, { label: string; description: string; tone: Tone }> = {
  admin: { label: 'Administrador', description: 'Acesso total: edita tudo e gerencia a equipe.', tone: 'primary' },
  financeiro: { label: 'Financeiro', description: 'Cadastra e edita contas, caixa, metas e lembretes.', tone: 'info' },
  leitura: { label: 'Leitura', description: 'Apenas visualiza as informações (ex.: sócio, contador).', tone: 'neutral' },
};
