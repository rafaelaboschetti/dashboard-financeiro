import { firstAction, guideSteps } from '@/domain/guide';

const ids = (role: 'admin' | 'financeiro' | 'leitura', web = false) => guideSteps({ role, web }).map((s) => s.id);

describe('guia de primeiros passos', () => {
  it('administrador no celular vê todos os passos, inclusive equipe e avisos', () => {
    expect(ids('admin')).toEqual(['boas-vindas', 'inicio', 'contas', 'caixa', 'metas', 'lembretes', 'relatorios', 'avisos', 'equipe', 'conta']);
  });

  it('perfil Leitura recebe o aviso de que só visualiza e não vê o passo de equipe', () => {
    const l = ids('leitura');
    expect(l[1]).toBe('leitura');
    expect(l).not.toContain('equipe');
  });

  it('Financeiro não vê equipe nem o passo de Leitura', () => {
    expect(ids('financeiro')).not.toContain('equipe');
    expect(ids('financeiro')).not.toContain('leitura');
  });

  it('na web não aparece o passo de avisos no celular', () => {
    expect(ids('admin', true)).not.toContain('avisos');
  });

  it('todo passo tem título, introdução e dicas; atalhos apontam para telas do app', () => {
    for (const s of guideSteps({ role: 'admin', web: false })) {
      expect(s.title && s.intro && s.tips.length).toBeTruthy();
      if (s.href) expect(s.href.startsWith('/')).toBe(true);
    }
  });

  it('a primeira ação sugerida depende do perfil', () => {
    expect(firstAction('admin').href).toBe('/contas?novo=1');
    expect(firstAction('leitura').href).toBe('/');
  });
});
