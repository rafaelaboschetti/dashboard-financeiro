# Finanças da Empresa — Plano do aplicativo

Aplicativo **React Native (Expo + TypeScript + Expo Router)** para organizar as finanças de uma empresa.
Este é o **primeiro escopo**: layout completo e navegável, já funcionando com armazenamento local.

## Como rodar

```bash
npm install
npx expo start          # abra no celular com o app Expo Go (QR code), ou:
npm run web             # versão no navegador (bom para conferir o layout responsivo)
npm run typecheck       # checagem de tipos
npx expo lint           # lint
```

A empresa começa vazia; o tutorial do app (Mais → Como usar o app) mostra como usar cada tela.

## O que você pediu → onde está

| Pedido | Tela | Arquivo |
|---|---|---|
| Lembretes de contas a pagar | Contas | `src/app/(app)/contas.tsx` |
| Valores que circulam (entradas/saídas) | Caixa | `src/app/(app)/caixa.tsx` |
| Metas a alcançar | Metas | `src/app/(app)/metas.tsx` |
| Login de diferentes usuários | Login / Cadastro / Equipe | `src/app/(auth)/*`, `equipe.tsx`, `src/db/auth.ts` |
| Lembretes gerais da empresa | Lembretes | `src/app/(app)/lembretes.tsx` |

## Extras que adicionei ao layout (para você avaliar)

- **Painel inicial**: saldo em caixa, alerta de contas vencidas, atalhos rápidos, próximas contas, metas, lembretes e gráfico de 6 meses.
- **Pagar conta = lançar saída**: ao marcar uma conta como paga, a saída é criada no caixa automaticamente (e desfaz se você desfizer).
- **Contas recorrentes** (mensal/anual): ao pagar, a próxima é gerada sozinha.
- **Relatórios**: resultado do mês, margem, despesas por categoria.
- **Categorias / rótulos** personalizáveis: campo para cadastrar novos rótulos de contas a pagar (e de entradas) com cor, na tela Categorias, e botão "+ Nova" dentro dos formulários de conta e de movimentação.
- **Equipe e permissões**: cada empresa tem vários usuários com perfil **Administrador**, **Financeiro** ou **Leitura** (o perfil Leitura não vê botões de edição).
- **Roadmap** dentro do app (`Mais → Roadmap e sugestões`) listando o que já existe, o que recomendo em seguida e ideias futuras.

## Layout responsivo

- **Celular (< 900 px)**: barra de abas embaixo (Início, Contas, Caixa, Metas, Mais); formulários abrem como *bottom sheet*; botão flutuante "+".
- **Tablet / computador (≥ 900 px)**: menu lateral com todas as seções; formulários em diálogo centralizado; cartões em várias colunas; botão de ação no cabeçalho.
- Áreas seguras (notch/barra de gestos), teclado numérico para valores/datas, máscara `R$` e `DD/MM/AAAA`, rótulos de acessibilidade.

## Estrutura do projeto

```
src/
  app/                 rotas (Expo Router)
    _layout.tsx          raiz: login obrigatório (Stack.Protected)
    (auth)/              login e cadastro
    (app)/               abas: index, contas, caixa, metas, mais + lembretes, relatórios, categorias, equipe, roadmap, perfil
  components/          Screen, ui (Card, Button, Badge...), Fields, FormModal, MonthlyBars, AuthShell
  context/             AuthContext (usuários/sessão) e DataContext (dados da empresa)
  db/                  storage.ts (persistência), auth.ts (usuários), seed.ts (categorias padrão)
  lib/                 formatação de dinheiro/datas, regras financeiras, hooks
  theme/               cores, espaçamentos, breakpoints
```

Valores em **centavos (inteiros)** para evitar erros de arredondamento; datas em ISO (`AAAA-MM-DD`).

## Passo a passo do desenvolvimento

**Etapa 1 — Layout e protótipo local ✅ (feita)**
1. Projeto Expo + TypeScript + Expo Router; tema e componentes base.
2. Login/cadastro com vários usuários e perfis (banco local no aparelho, senha com hash SHA-256 + salt).
3. Telas: Início, Contas, Caixa, Metas, Lembretes, Relatórios, Categorias, Equipe, Perfil, Roadmap.
4. Regras: baixa de conta → caixa, recorrência, permissões por perfil.
5. Verificado: tipos, lint, build web e fluxo completo (cadastro → pagar conta → logout/login → permissões).

**Etapa 2 — Dados de verdade (recomendada agora)**
1. **Backend na nuvem** (sugiro Supabase: login, banco Postgres e regras por empresa). Sem isso, cada aparelho tem seus próprios dados e "vários usuários" só vale no mesmo aparelho. Basta reimplementar `src/db/storage.ts` e `src/db/auth.ts`.
2. Recuperar/trocar senha por e-mail.
3. **Editar** registros (hoje é possível criar, marcar e excluir).
4. **Notificações push** (`expo-notifications`): usar o campo "avisar antes" já salvo em cada conta.

**Etapa 3 — Recursos financeiros**
1. Anexar boleto/comprovante (câmera/PDF).
2. Exportar relatórios em PDF/Excel.
3. Contas a receber e cadastro de clientes/fornecedores.
4. Orçamento por categoria e projeção de caixa.

**Etapa 4 — Acabamento e publicação**
1. Modo escuro, biometria/PIN, histórico de alterações, várias empresas por login.
2. Ícone e splash definitivos, testes automatizados.
3. Build com EAS (`eas build`) e publicação nas lojas.

## Pontos de atenção (decisões suas)

- **Segurança**: a etapa 1 guarda tudo no aparelho, adequado só para protótipo. Antes de usar dados reais da empresa, migre para o backend (etapa 2).
- **Datas**: usam campo com máscara + atalhos ("Hoje", "+7 dias"). Um seletor de calendário nativo pode ser adicionado depois.
- **Moeda**: fixa em Real (BRL).
