# Finanças da Empresa

Aplicativo mobile para organizar as finanças de uma pequena empresa: contas a pagar, fluxo de caixa, metas, lembretes e relatórios, com vários usuários e permissões.

Feito com **React Native + Expo (SDK 57)**, **TypeScript** e **Expo Router**. Roda no Android, iOS e navegador.

## Funcionalidades

- **Painel inicial**: saldo em caixa, alerta de contas vencidas, atalhos, próximas contas, metas e gráfico dos últimos 6 meses.
- **Contas a pagar**: vencimento, categoria, recorrência (mensal/anual) e aviso antecipado. Ao marcar como paga, a saída é lançada no caixa.
- **Caixa**: entradas e saídas por categoria.
- **Metas**: objetivos financeiros com progresso.
- **Lembretes** gerais da empresa.
- **Relatórios**: resultado do mês, margem e despesas por categoria.
- **Categorias** personalizáveis, com cor.
- **Equipe e permissões**: perfis Administrador, Financeiro e Leitura.
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

```bash
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

## Estrutura

```
src/
  app/          rotas (Expo Router): (auth)/ login e cadastro, (app)/ telas do app
  components/   componentes de interface reutilizáveis
  context/      AuthContext (usuários e sessão) e DataContext (dados da empresa)
  db/           persistência local, usuários e dados de exemplo
  lib/          formatação, regras financeiras e hooks
  theme/        cores, espaçamentos e breakpoints
assets/         ícones e imagem da tela de abertura
```

Valores monetários são guardados em **centavos (inteiros)** e datas em ISO (`AAAA-MM-DD`).
