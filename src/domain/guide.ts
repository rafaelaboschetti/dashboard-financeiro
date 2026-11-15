/**
 * Conteúdo do guia de primeiros passos (função pura): quais passos mostrar
 * para cada perfil e plataforma. A tela fica em src/app/(app)/guia.tsx.
 */
import type { Role } from '@/types';

export interface GuideStep {
  id: string;
  /** Nome de um ícone do Ionicons. */
  icon: string;
  title: string;
  /** Frase de abertura do passo. */
  intro: string;
  /** Como fazer, em tópicos curtos. */
  tips: string[];
  /** Tela do app que o passo explica (botão "Ver na tela"). */
  href?: string;
}

const STEPS: (GuideStep & { only?: (o: { role: Role; web: boolean }) => boolean })[] = [
  {
    id: 'boas-vindas',
    icon: 'sparkles-outline',
    title: 'Bem-vindo(a) ao Finanças da Empresa',
    intro: 'Aqui você organiza as contas a pagar, o dinheiro que entra e sai, as metas e os lembretes da empresa, tudo num só lugar.',
    tips: [
      'Este guia leva uns 2 minutos.',
      'Use "Próximo" para avançar ou "Pular" se já conhece o app.',
      'Para ver o guia de novo: Mais → Como usar o app.',
    ],
  },
  {
    id: 'leitura',
    icon: 'eye-outline',
    title: 'Seu perfil é Leitura',
    intro: 'Você pode ver todas as informações da empresa, mas não pode criar, editar ou excluir nada.',
    tips: ['Ideal para sócios e contador acompanharem os números.', 'Se precisar alterar algo, peça a um administrador para mudar seu perfil em Equipe.'],
    only: ({ role }) => role === 'leitura',
  },
  {
    id: 'inicio',
    icon: 'home-outline',
    title: 'Início: o resumo da empresa',
    intro: 'A primeira tela mostra a situação da empresa num relance.',
    tips: [
      'Saldo em caixa: tudo o que entrou menos tudo o que saiu.',
      'Faixa vermelha no topo: contas vencidas. Toque para ver quais são.',
      'Atalhos rápidos para criar conta, movimentação, meta ou lembrete.',
      'Gráfico de entradas e saídas dos últimos 6 meses.',
    ],
    href: '/',
  },
  {
    id: 'contas',
    icon: 'receipt-outline',
    title: 'Contas a pagar',
    intro: 'Cadastre cada conta com o vencimento e o app avisa o que está para vencer.',
    tips: [
      'Toque em "+ Nova conta" e preencha descrição, valor, vencimento e categoria.',
      'Para aluguel, internet e outras contas fixas, escolha "Repetir: todo mês".',
      'Ao pagar, toque em "Marcar como paga": a saída entra no caixa sozinha e, se for fixa, a conta do próximo mês é criada.',
      'Pagou por engano? Toque em "Desfazer". Para corrigir dados, use o lápis.',
    ],
    href: '/contas',
  },
  {
    id: 'caixa',
    icon: 'swap-vertical-outline',
    title: 'Caixa: entradas e saídas',
    intro: 'Registre o dinheiro que entra (vendas, serviços) e o que sai (compras, despesas).',
    tips: [
      'Toque em "+ Nova movimentação", escolha Entrada ou Saída e preencha.',
      'Use as setas no topo para ver outros meses.',
      'As contas pagas aparecem aqui automaticamente, marcadas como "conta paga".',
    ],
    href: '/caixa',
  },
  {
    id: 'metas',
    icon: 'flag-outline',
    title: 'Metas',
    intro: 'Defina objetivos, como uma reserva de emergência ou comprar um equipamento.',
    tips: [
      'Crie a meta com o valor a alcançar e o prazo.',
      'Sempre que guardar dinheiro, toque em "Adicionar valor".',
      'O app mostra o progresso e quanto guardar por mês para chegar lá.',
    ],
    href: '/metas',
  },
  {
    id: 'lembretes',
    icon: 'notifications-outline',
    title: 'Lembretes',
    intro: 'Anote compromissos da empresa que não são contas, como reuniões e renovações.',
    tips: ['Fica em Mais → Lembretes.', 'Escolha a data e a prioridade.', 'Toque no círculo ao lado para marcar como concluído.'],
    href: '/lembretes',
  },
  {
    id: 'relatorios',
    icon: 'bar-chart-outline',
    title: 'Relatórios e planilha para o contador',
    intro: 'Veja o resultado do mês e envie os dados para quem cuida da contabilidade.',
    tips: [
      'Fica em Mais → Relatórios: resultado, margem e despesas por categoria.',
      'Em "Exportar para Excel (CSV)", gere a planilha do mês, de todas as movimentações ou das contas.',
      'No celular, escolha onde enviar (WhatsApp, e-mail, Drive); no computador, o arquivo é baixado.',
    ],
    href: '/relatorios',
  },
  {
    id: 'avisos',
    icon: 'alarm-outline',
    title: 'Avisos no celular',
    intro: 'Receba uma notificação às 9h antes do vencimento de cada conta e no dia de cada lembrete.',
    tips: [
      'Vá em Meu perfil e ligue "Avisos de contas e lembretes".',
      'Quando o celular perguntar, toque em "Permitir".',
      'Quantos dias antes avisar é escolhido em cada conta, no campo "Avisar antes".',
    ],
    href: '/perfil',
    only: ({ web }) => !web,
  },
  {
    id: 'equipe',
    icon: 'people-outline',
    title: 'Equipe e permissões',
    intro: 'Dê acesso a outras pessoas da empresa, cada uma com o perfil certo.',
    tips: [
      'Em Mais → Equipe, toque em "+ Adicionar usuário" e informe nome, e-mail, senha provisória e perfil.',
      'Administrador: faz tudo e gerencia a equipe. Financeiro: lança e edita. Leitura: só visualiza.',
      'Use o lápis para mudar o perfil de alguém, ou remova quem saiu da empresa.',
    ],
    href: '/equipe',
    only: ({ role }) => role === 'admin',
  },
  {
    id: 'conta',
    icon: 'shield-checkmark-outline',
    title: 'Sua conta e seus dados',
    intro: 'Alguns cuidados para usar o app com segurança.',
    tips: [
      'Com "Manter conectado" marcado no login, você não precisa digitar a senha por 30 dias.',
      'Em aparelho compartilhado, deixe essa opção desmarcada ou toque em "Sair" ao terminar.',
      'Troque sua senha em Meu perfil.',
      'Os dados ficam guardados neste aparelho: desinstalar o app ou limpar o navegador apaga tudo.',
    ],
    href: '/perfil',
  },
];

/** Passos do guia para quem está usando o app. */
export function guideSteps(options: { role: Role; web: boolean }): GuideStep[] {
  return STEPS.filter((s) => !s.only || s.only(options)).map(({ only: _only, ...step }) => step);
}

/** Últimos passos ao terminar: o que fazer primeiro, conforme o perfil. */
export function firstAction(role: Role): { label: string; href: string } {
  return role === 'leitura' ? { label: 'Ver o resumo da empresa', href: '/' } : { label: 'Cadastrar a primeira conta', href: '/contas?novo=1' };
}
