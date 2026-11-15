# Finanças da Empresa

Aplicativo mobile para organizar as finanças de uma pequena empresa: contas a pagar, fluxo de caixa, metas, lembretes e relatórios, com vários usuários e permissões.

Feito com **React Native + Expo (SDK 57)**, **TypeScript** e **Expo Router**. Roda no Android, iOS e navegador.

## Funcionalidades

- **Painel inicial**: saldo em caixa, alerta de contas vencidas, atalhos, próximas contas, metas e gráfico dos últimos 6 meses.
- **Contas a pagar**: vencimento, categoria, recorrência (mensal/anual) e aviso antecipado. Ao marcar como paga, a saída é lançada no caixa.
- **Avisos de contas a vencer** (celular): notificação às 9h conforme o "avisar antes" de cada conta; ligar em *Meu perfil*. Reagendados sempre que as contas mudam e cancelados ao sair da conta. Na web não há avisos (o navegador não agenda).
- **Caixa**: entradas e saídas por categoria.
- **Metas**: objetivos financeiros com progresso.
- **Lembretes** gerais da empresa.
- **Relatórios**: resultado do mês, margem e despesas por categoria.
- **Categorias** personalizáveis, com cor.
- **Equipe e permissões**: perfis Administrador, Financeiro e Leitura; o administrador muda o perfil e remove membros (a empresa nunca fica sem administrador).
- **Minha conta**: trocar senha (conferindo a atual e recusando repetir a mesma) e nome; botão para mostrar/ocultar a senha.
- **Edição de registros**: contas, movimentações, metas, lembretes e categorias. Editar uma conta paga atualiza a saída no caixa (e vice-versa); renomear uma categoria atualiza os lançamentos.
- **Layout responsivo**: abas embaixo no celular, menu lateral em tablet/computador.

> Os dados ficam salvos **no próprio aparelho** (AsyncStorage). Cada celular tem os seus dados; ainda não há sincronização na nuvem. Veja o [PLANO.md](PLANO.md) para os próximos passos.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org/) instalado.

```bash
npm install
npm start          # abre o servidor; leia o QR code com o app Expo Go no celular
npm run web        # abre no navegador
```

Na tela de cadastro, deixe marcado **"Começar com dados de exemplo"** para ver o app já preenchido.

## Verificações

Os testes ficam em `__tests__/` e cobrem as regras de negócio (pagar/desfazer conta, recorrência, edição sincronizada, exclusões sem registros órfãos, categorias), a formatação de dinheiro e datas, e o login/armazenamento (hash de senha, bloqueio, sessão, criptografia e adulteração).

```bash
npm test           # testes automatizados (Jest)
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run doctor     # confere dependências e configuração do Expo
```

## Gerar o APK (Android)

O APK é gerado na nuvem pelo **EAS Build**, sem precisar de Android Studio. É preciso ter uma conta em [expo.dev](https://expo.dev/signup).

```bash
npm run eas:login   # login pelo navegador (mostra um link e um código)
npm run eas:whoami  # confere se o login deu certo
npm run apk         # envia o build (perfil "preview" do eas.json, que gera .apk)
npm run apk:status  # lista os últimos builds e o status de cada um
```

O build leva cerca de 10 a 20 minutos. No final aparece um link `https://expo.dev/accounts/.../builds/...`. Abra no celular, baixe o `.apk` e instale (o Android pede para permitir a instalação de fontes desconhecidas).

Configuração usada:

- `eas.json`: perfil `preview` com `android.buildType: "apk"`.
- `app.json`: pacote Android `com.financasempresa.app`, ícones, tela de abertura e `projectId` do EAS.

Dicas, caso o build falhe:

- Rode `npm run doctor` antes de enviar.
- Instale pacotes sempre com `npx expo install <pacote>` (e não `npm install <pacote>`), para pegar a versão compatível com o SDK.
- O EAS usa `npm ci`, então o `package-lock.json` precisa estar atualizado e commitado.

## Segurança

O app ainda não tem servidor: login, permissões e dados ficam no aparelho. Proteções atuais:

- **Dados criptografados** com AES-256-GCM. No Android/iOS a chave fica no Keystore/Keychain (`expo-secure-store`); valores adulterados ou forjados são rejeitados.
- **Senhas** com PBKDF2-SHA256 (100 mil iterações). Senhas novas exigem 8+ caracteres com letras e números, com indicador de força. Contas antigas são atualizadas no primeiro login.
- **Bloqueio** após 5 tentativas de login erradas (30 s, dobrando até 15 min).
- **Sessão**: com "Manter conectado", dura 30 dias sem uso (cada abertura renova); sem essa opção, termina ao fechar o app.
- **Perfis** conferidos também nas funções de gravação, não só escondendo botões.
- **Android**: backup desligado e permissões desnecessárias bloqueadas (sobrepor outros apps, armazenamento externo etc.).

Limitações conhecidas: na **versão web** a chave fica no próprio navegador, então quem tem acesso ao navegador consegue ler os dados. E, como tudo roda no aparelho, as regras podem ser contornadas por quem tem acesso total a ele (root). A correção definitiva é o backend (etapa 2 do [PLANO.md](PLANO.md)).

## Estrutura

```
src/
  app/          rotas (Expo Router): (auth)/ login e cadastro, (app)/ telas do app
  components/   componentes de interface reutilizáveis
  domain/       regras de negócio em funções puras (testáveis, sem React)
  context/      AuthContext (usuários e sessão) e DataContext (estado + permissões + gravação)
  db/           persistência local, usuários e dados de exemplo
  lib/          formatação, regras financeiras e hooks
  theme/        cores, espaçamentos e breakpoints
assets/         ícones e imagem da tela de abertura
__tests__/      testes automatizados (Jest)
test-utils/     simulações usadas pelos testes
```

Valores monetários são guardados em **centavos (inteiros)** e datas em ISO (`AAAA-MM-DD`).
