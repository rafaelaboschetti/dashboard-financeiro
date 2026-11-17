/**
 * Roteiro do tutorial ilustrado (função pura): capítulos e passos, qual réplica de tela
 * cada passo mostra (`scene`) e qual parte dela o robô Fin aponta (`target`).
 * A tela fica em src/app/(app)/guia.tsx e as réplicas em src/components/tutorial/.
 */
import type { Role } from '@/types';

export type SceneId =
  | 'hello'
  | 'dashboard'
  | 'bills-screen'
  | 'bill-form'
  | 'bill-card'
  | 'confirm-delete'
  | 'cash'
  | 'cash-form'
  | 'goal'
  | 'reminder'
  | 'reports'
  | 'alerts'
  | 'team'
  | 'login'
  | 'profile'
  | 'done';

export type ChapterId = 'comeco' | 'contas' | 'caixa' | 'metas' | 'lembretes' | 'relatorios' | 'avisos' | 'equipe' | 'conta';

export const CHAPTERS: Record<ChapterId, string> = {
  comeco: 'Começando',
  contas: 'Contas a pagar',
  caixa: 'Caixa',
  metas: 'Metas',
  lembretes: 'Lembretes',
  relatorios: 'Relatórios',
  avisos: 'Avisos',
  equipe: 'Equipe',
  conta: 'Sua conta',
};

export interface TutorialStep {
  id: string;
  chapter: ChapterId;
  scene: SceneId;
  /** Parte da réplica que fica destacada e para onde o robô aponta. */
  target?: string;
  title: string;
  /** O que o robô diz. */
  text: string;
  /** Onde fica no app (mostrado como dica de caminho). */
  where?: string;
}

type Rule = { editor?: boolean; admin?: boolean; mobile?: boolean; readOnly?: boolean };

const STEPS: (TutorialStep & Rule)[] = [
  // ---------------- começando ----------------
  { id: 'oi', chapter: 'comeco', scene: 'hello', title: 'Oi! Eu sou o Fin', text: 'Vou te mostrar, passo a passo, como usar o app. Leva uns 3 minutos. Toque em "Próximo" para seguir ou escolha um assunto lá em cima.' },
  { id: 'leitura', chapter: 'comeco', scene: 'hello', readOnly: true, title: 'Seu perfil é Leitura', text: 'Você pode ver tudo, mas não pode criar, editar nem excluir. Os passos que mostram essas ações ficam de fora para você.' },
  { id: 'saldo', chapter: 'comeco', scene: 'dashboard', target: 'saldo', title: 'Tela Início', text: 'Este é o saldo em caixa: tudo o que entrou menos tudo o que saiu. Logo abaixo ficam as entradas e saídas do mês.', where: 'Início' },
  { id: 'alerta', chapter: 'comeco', scene: 'dashboard', target: 'alerta', title: 'Contas vencidas', text: 'Quando alguma conta vence sem ser paga, aparece esta faixa vermelha. Toque nela para ver quais são.', where: 'Início' },
  { id: 'atalhos', chapter: 'comeco', scene: 'dashboard', target: 'atalhos', editor: true, title: 'Atalhos rápidos', text: 'Estes botões criam uma conta, uma movimentação, uma meta ou um lembrete sem precisar trocar de tela.', where: 'Início' },

  // ---------------- contas a pagar ----------------
  { id: 'nova-conta', chapter: 'contas', scene: 'bills-screen', target: 'fab', editor: true, title: 'Adicionar uma conta', text: 'Na aba Contas, toque no botão "+ Nova conta" para cadastrar um boleto, aluguel, fatura ou qualquer conta a pagar.', where: 'Contas' },
  { id: 'form-descricao', chapter: 'contas', scene: 'bill-form', target: 'descricao', editor: true, title: 'Descrição e valor', text: 'Escreva o que é a conta (ex.: "Aluguel do escritório") e o valor. No valor, digite só os números: o app coloca vírgula e "R$" sozinho.' },
  { id: 'form-vencimento', chapter: 'contas', scene: 'bill-form', target: 'vencimento', editor: true, title: 'Data de vencimento', text: 'Digite a data (DD/MM/AAAA) ou use os atalhos "Hoje", "+7 dias" e "+30 dias".' },
  { id: 'form-categoria', chapter: 'contas', scene: 'bill-form', target: 'categoria', editor: true, title: 'Categoria', text: 'Escolha a categoria para os relatórios separarem os gastos. Não achou a certa? Toque em "+ Nova" para criar.' },
  { id: 'form-repetir', chapter: 'contas', scene: 'bill-form', target: 'repetir', editor: true, title: 'Contas que se repetem', text: 'Para contas fixas, como aluguel ou internet, escolha "Todo mês" (ou "Todo ano"). Quando você pagar, a do próximo período é criada sozinha.' },
  { id: 'form-avisar', chapter: 'contas', scene: 'bill-form', target: 'avisar', editor: true, title: 'Avisar quantos dias antes', text: 'Escolha quando quer ser lembrado: no dia, 1, 3 ou 7 dias antes do vencimento. Com os avisos ligados, o celular avisa às 9h nesse dia.' },
  { id: 'form-salvar', chapter: 'contas', scene: 'bill-form', target: 'salvar', editor: true, title: 'Salvar', text: 'Confira os dados e toque em "Salvar conta". Pronto, ela aparece na lista de pendentes.' },
  { id: 'dias', chapter: 'contas', scene: 'bill-card', target: 'status', title: 'Dias para vencer', text: 'Cada conta mostra quanto falta: "Vence em 5 dias", "Vence hoje" ou, se passou, "Atrasada há 2 dias", em vermelho.', where: 'Contas' },
  { id: 'filtros', chapter: 'contas', scene: 'bills-screen', target: 'filtros', title: 'Filtros', text: 'Use os filtros para ver só as pendentes, só as vencidas, as pagas ou todas. Os cartões do topo somam o mês.', where: 'Contas' },
  { id: 'pagar', chapter: 'contas', scene: 'bill-card', target: 'pagar', editor: true, title: 'Marcar como paga', text: 'Pagou? Toque em "Marcar como paga". A saída vai para o Caixa sozinha e, se a conta se repete, a próxima já é criada.' },
  { id: 'desfazer', chapter: 'contas', scene: 'bill-card', target: 'desfazer', editor: true, title: 'Desfazer um pagamento', text: 'Marcou por engano? Na conta paga, toque em "Desfazer". A saída sai do Caixa e a conta volta para pendente.' },
  { id: 'editar', chapter: 'contas', scene: 'bill-card', target: 'editar', editor: true, title: 'Editar uma conta', text: 'Toque no lápis para mudar valor, data, categoria ou aviso. Se a conta já foi paga, a saída no Caixa é corrigida junto.' },
  { id: 'excluir', chapter: 'contas', scene: 'bill-card', target: 'excluir', editor: true, title: 'Excluir uma conta', text: 'Toque na lixeira para apagar a conta.' },
  { id: 'confirmar', chapter: 'contas', scene: 'confirm-delete', target: 'confirmar', editor: true, title: 'Confirmar a exclusão', text: 'O app sempre pergunta antes de apagar. Se a conta estava paga, a saída no Caixa também é apagada. Toque em "Cancelar" se mudou de ideia.' },

  // ---------------- caixa ----------------
  { id: 'caixa-nova', chapter: 'caixa', scene: 'cash', target: 'fab', editor: true, title: 'Registrar entrada ou saída', text: 'Na aba Caixa, toque em "+ Nova movimentação" para lançar uma venda, um serviço recebido ou uma despesa.', where: 'Caixa' },
  { id: 'caixa-tipo', chapter: 'caixa', scene: 'cash-form', target: 'tipo', editor: true, title: 'Entrada ou Saída', text: 'Primeiro escolha se o dinheiro entrou ou saiu. Depois preencha descrição, valor, data e categoria, como nas contas.' },
  { id: 'caixa-mes', chapter: 'caixa', scene: 'cash', target: 'mes', title: 'Trocar de mês', text: 'Use as setas para ver os meses anteriores. Os cartões mostram entradas, saídas e o saldo daquele mês.', where: 'Caixa' },
  { id: 'caixa-editar', chapter: 'caixa', scene: 'cash', target: 'acoes', editor: true, title: 'Editar ou excluir', text: 'Em cada lançamento, o lápis edita e a lixeira apaga. Se for o pagamento de uma conta, a conta volta para "a pagar" ao apagar.', where: 'Caixa' },

  // ---------------- metas ----------------
  { id: 'meta-nova', chapter: 'metas', scene: 'goal', target: 'fab', editor: true, title: 'Criar uma meta', text: 'Na aba Metas, toque em "+ Nova meta", dê um nome (ex.: "Reserva de emergência"), o valor a alcançar e o prazo.', where: 'Metas' },
  { id: 'meta-valor', chapter: 'metas', scene: 'goal', target: 'adicionar', editor: true, title: 'Guardar dinheiro na meta', text: 'Sempre que guardar dinheiro, toque em "Adicionar valor". A barra mostra o progresso e o app calcula quanto guardar por mês.', where: 'Metas' },
  { id: 'meta-editar', chapter: 'metas', scene: 'goal', target: 'acoes', editor: true, title: 'Editar ou excluir a meta', text: 'O lápis muda nome, valor ou prazo. A lixeira apaga a meta.', where: 'Metas' },

  // ---------------- lembretes ----------------
  { id: 'lembrete-novo', chapter: 'lembretes', scene: 'reminder', target: 'fab', editor: true, title: 'Criar um lembrete', text: 'Em Mais → Lembretes, toque em "+ Novo lembrete" para anotar reuniões, renovações e cobranças, com data e prioridade.', where: 'Mais → Lembretes' },
  { id: 'lembrete-concluir', chapter: 'lembretes', scene: 'reminder', target: 'concluir', editor: true, title: 'Concluir', text: 'Toque no círculo quando terminar. O lembrete vai para "Concluídos".', where: 'Mais → Lembretes' },
  { id: 'lembrete-editar', chapter: 'lembretes', scene: 'reminder', target: 'acoes', editor: true, title: 'Editar ou excluir', text: 'O lápis edita e a lixeira apaga o lembrete.', where: 'Mais → Lembretes' },

  // ---------------- relatórios ----------------
  { id: 'relatorio', chapter: 'relatorios', scene: 'reports', target: 'resumo', title: 'Resultado do mês', text: 'Em Mais → Relatórios você vê entradas, saídas, resultado, margem e quanto foi gasto em cada categoria.', where: 'Mais → Relatórios' },
  { id: 'exportar', chapter: 'relatorios', scene: 'reports', target: 'exportar', title: 'Planilha para o contador', text: 'Toque num botão de exportar para gerar uma planilha do Excel. No celular, escolha onde enviar (WhatsApp, e-mail…); no computador, o arquivo é baixado.', where: 'Mais → Relatórios' },

  // ---------------- avisos ----------------
  { id: 'avisos', chapter: 'avisos', scene: 'alerts', target: 'switch', mobile: true, title: 'Ligar os avisos no celular', text: 'Em Meu perfil, ligue "Avisos de contas e lembretes" e toque em "Permitir" quando o celular perguntar. Os avisos chegam às 9h.', where: 'Mais → Meu perfil' },

  // ---------------- equipe ----------------
  { id: 'equipe-add', chapter: 'equipe', scene: 'team', target: 'adicionar', admin: true, title: 'Dar acesso a outra pessoa', text: 'Em Mais → Equipe, toque em "+ Adicionar usuário", informe nome, e-mail, uma senha provisória e o perfil.', where: 'Mais → Equipe' },
  { id: 'equipe-perfis', chapter: 'equipe', scene: 'team', target: 'acoes', admin: true, title: 'Perfis e remoção', text: 'Administrador faz tudo; Financeiro lança e edita; Leitura só vê. O lápis muda o perfil e o ícone ao lado remove quem saiu da empresa.', where: 'Mais → Equipe' },

  // ---------------- sua conta ----------------
  { id: 'manter', chapter: 'conta', scene: 'login', target: 'manter', title: 'Manter conectado', text: 'Com esta opção marcada no login, você não precisa digitar a senha por 30 dias. Em aparelho compartilhado, deixe desmarcada.' },
  { id: 'senha', chapter: 'conta', scene: 'profile', target: 'senha', title: 'Trocar a senha', text: 'Em Meu perfil, toque em "Trocar senha". A nova senha precisa de 8 caracteres, com letras e números.', where: 'Mais → Meu perfil' },
  { id: 'dados', chapter: 'conta', scene: 'profile', target: 'sair', title: 'Seus dados', text: 'Os dados ficam guardados neste aparelho. Desinstalar o app ou limpar o navegador apaga tudo. Ao terminar num aparelho compartilhado, toque em "Sair da conta".', where: 'Mais → Meu perfil' },
  { id: 'fim', chapter: 'conta', scene: 'done', title: 'Pronto!', text: 'Agora é com você. Para ver este tutorial de novo, vá em Mais → Como usar o app. Bom trabalho!' },
];

/** Passos do tutorial para o perfil e a plataforma de quem está usando. */
export function tutorialSteps(options: { role: Role; web: boolean }): TutorialStep[] {
  const canEdit = options.role !== 'leitura';
  return STEPS.filter(
    (s) => (!s.editor || canEdit) && (!s.admin || options.role === 'admin') && (!s.mobile || !options.web) && (!s.readOnly || !canEdit),
  ).map(({ editor: _e, admin: _a, mobile: _m, readOnly: _r, ...step }) => step);
}

/** Capítulos que têm passos, na ordem, com o índice do primeiro passo de cada um. */
export function chaptersOf(steps: TutorialStep[]): { id: ChapterId; title: string; first: number }[] {
  const seen = new Set<ChapterId>();
  const out: { id: ChapterId; title: string; first: number }[] = [];
  steps.forEach((s, i) => {
    if (seen.has(s.chapter)) return;
    seen.add(s.chapter);
    out.push({ id: s.chapter, title: CHAPTERS[s.chapter], first: i });
  });
  return out;
}

/** Primeira ação sugerida ao terminar, conforme o perfil. */
export function firstAction(role: Role): { label: string; href: string } {
  return role === 'leitura' ? { label: 'Ver o resumo da empresa', href: '/' } : { label: 'Cadastrar a primeira conta', href: '/contas?novo=1' };
}
