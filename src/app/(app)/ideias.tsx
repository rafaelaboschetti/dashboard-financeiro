import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Badge, Card, IconCircle, Muted, SectionHeader, Tone } from '@/components/ui';
import { colors, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Status = 'feito' | 'proximo' | 'futuro';

const statusUI: Record<Status, { label: string; tone: Tone }> = {
  feito: { label: 'No app', tone: 'success' },
  proximo: { label: 'Próxima etapa', tone: 'info' },
  futuro: { label: 'Futuro', tone: 'neutral' },
};

const items: { icon: IconName; title: string; text: string; status: Status }[] = [
  // Pedidos originais
  { icon: 'receipt-outline', title: 'Contas a pagar com lembrete', text: 'Vencimento, recorrência mensal/anual, status e baixa automática no caixa.', status: 'feito' },
  { icon: 'swap-vertical-outline', title: 'Entradas e saídas (fluxo de caixa)', text: 'Lançamentos por mês, categorias e saldo.', status: 'feito' },
  { icon: 'flag-outline', title: 'Metas', text: 'Valor alvo, prazo, progresso e quanto guardar por mês.', status: 'feito' },
  { icon: 'notifications-outline', title: 'Lembretes gerais da empresa', text: 'Compromissos com data e prioridade.', status: 'feito' },
  { icon: 'people-outline', title: 'Login de vários usuários', text: 'Cadastro da empresa, login e perfis: Administrador, Financeiro e Leitura.', status: 'feito' },
  // Sugestões já incluídas no layout
  { icon: 'speedometer-outline', title: 'Painel inicial (dashboard)', text: 'Saldo, contas vencidas, próximas contas, metas e gráfico de 6 meses.', status: 'feito' },
  { icon: 'bar-chart-outline', title: 'Relatórios', text: 'Resultado do mês, margem e despesas por categoria.', status: 'feito' },
  { icon: 'pricetags-outline', title: 'Categorias personalizadas', text: 'Classifique cada entrada e saída.', status: 'feito' },
  { icon: 'phone-portrait-outline', title: 'Layout responsivo', text: 'Celular (abas), tablet e desktop (menu lateral).', status: 'feito' },
  { icon: 'create-outline', title: 'Editar registros', text: 'Editar contas, movimentações, metas, lembretes e categorias (contas pagas e o caixa ficam sincronizados).', status: 'feito' },
  { icon: 'cloud-outline', title: 'Banco de dados na nuvem (Supabase)', text: 'A equipe compartilha os mesmos dados em todos os aparelhos, com atualização em tempo real. Regras de acesso conferidas no servidor.', status: 'feito' },
  { icon: 'lock-closed-outline', title: 'Convites, recuperar e trocar senha', text: 'Convite por e-mail, mudança de perfil, remoção de membros, "esqueci minha senha" e troca de senha.', status: 'feito' },
  // Próximas etapas
  { icon: 'alarm-outline', title: 'Notificações push', text: 'Avisar contas a vencer e lembretes no horário certo (o campo "avisar antes" já é salvo).', status: 'proximo' },
  { icon: 'camera-outline', title: 'Anexar boleto ou comprovante', text: 'Foto/PDF ligado à conta paga.', status: 'proximo' },
  { icon: 'document-text-outline', title: 'Exportar PDF / Excel', text: 'Relatórios para enviar ao contador.', status: 'proximo' },
  // Futuro
  { icon: 'business-outline', title: 'Clientes e fornecedores', text: 'Cadastro com contato e histórico de pagamentos/recebimentos.', status: 'futuro' },
  { icon: 'cash-outline', title: 'Contas a receber', text: 'Controle de faturas de clientes e cobranças em atraso.', status: 'futuro' },
  { icon: 'pie-chart-outline', title: 'Orçamento por categoria', text: 'Limite mensal de gastos com alertas.', status: 'futuro' },
  { icon: 'trending-up-outline', title: 'Projeção de caixa', text: 'Saldo previsto considerando contas futuras.', status: 'futuro' },
  { icon: 'finger-print-outline', title: 'Biometria / PIN', text: 'Proteção extra ao abrir o app.', status: 'futuro' },
  { icon: 'moon-outline', title: 'Modo escuro', text: 'Tema escuro automático.', status: 'futuro' },
  { icon: 'git-network-outline', title: 'Várias empresas / filiais', text: 'Alternar entre CNPJs no mesmo login.', status: 'futuro' },
  { icon: 'time-outline', title: 'Histórico de alterações', text: 'Quem criou/alterou cada lançamento (auditoria).', status: 'futuro' },
];

export default function RoadmapScreen() {
  const groups: { status: Status; title: string }[] = [
    { status: 'feito', title: 'Já está no layout' },
    { status: 'proximo', title: 'Próximas etapas (recomendado)' },
    { status: 'futuro', title: 'Ideias para depois' },
  ];

  return (
    <Screen title="Roadmap" subtitle="O que já existe e o que sugerimos adicionar" back>
      {groups.map((g) => (
        <View key={g.status}>
          <SectionHeader title={g.title} />
          <Card style={{ padding: 0 }}>
            {items
              .filter((i) => i.status === g.status)
              .map((it, idx) => (
                <View key={it.title} style={[styles.row, idx > 0 && styles.border]}>
                  <IconCircle icon={it.icon} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.title}>{it.title}</Text>
                    <Muted>{it.text}</Muted>
                    <Badge label={statusUI[it.status].label} tone={statusUI[it.status].tone} />
                  </View>
                </View>
              ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, alignItems: 'flex-start' },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
});
