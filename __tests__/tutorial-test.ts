import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chaptersOf, firstAction, tutorialSteps } from '@/domain/tutorial';

const ids = (role: 'admin' | 'financeiro' | 'leitura', web = false) => tutorialSteps({ role, web }).map((s) => s.id);

describe('tutorial ilustrado', () => {
  it('ensina o ciclo completo de uma conta: adicionar, dias de aviso, pagar, editar e excluir', () => {
    const steps = ids('admin');
    const ordem = ['nova-conta', 'form-descricao', 'form-vencimento', 'form-avisar', 'dias', 'pagar', 'desfazer', 'editar', 'excluir', 'confirmar'];
    const pos = ordem.map((id) => steps.indexOf(id));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it('administrador no celular vê todos os capítulos, inclusive Avisos e Equipe', () => {
    expect(chaptersOf(tutorialSteps({ role: 'admin', web: false })).map((c) => c.title)).toEqual([
      'Começando', 'Contas a pagar', 'Caixa', 'Metas', 'Lembretes', 'Relatórios', 'Avisos', 'Equipe', 'Sua conta',
    ]);
  });

  it('perfil Leitura não vê passos de criar/editar/excluir e recebe o aviso de que só visualiza', () => {
    const l = ids('leitura');
    expect(l).toContain('leitura');
    for (const id of ['nova-conta', 'pagar', 'editar', 'excluir', 'caixa-nova', 'meta-nova', 'lembrete-novo', 'equipe-add']) expect(l).not.toContain(id);
    expect(l).toContain('dias'); // ver quanto falta para vencer continua valendo
  });

  it('Financeiro edita, mas não vê Equipe nem o aviso de Leitura', () => {
    const f = ids('financeiro');
    expect(f).toContain('editar');
    expect(f).not.toContain('equipe-add');
    expect(f).not.toContain('leitura');
  });

  it('na web não aparece o capítulo de avisos no celular', () => {
    expect(ids('admin', true)).not.toContain('avisos');
  });

  it('o capítulo leva ao primeiro passo dele', () => {
    const steps = tutorialSteps({ role: 'admin', web: false });
    for (const c of chaptersOf(steps)) expect(steps[c.first].chapter).toBe(c.id);
  });

  it('todo destaque pedido existe na réplica da cena (o robô nunca aponta para o nada)', () => {
    const scenes = readFileSync(join(__dirname, '../src/components/tutorial/Scenes.tsx'), 'utf8');
    for (const s of tutorialSteps({ role: 'admin', web: false })) {
      expect(scenes).toContain(`case '${s.scene}'`);
      if (s.target === 'desfazer' || !s.target) continue;
      expect(scenes).toContain(`on('${s.target}')`);
    }
  });

  it('primeira ação sugerida ao terminar depende do perfil', () => {
    expect(firstAction('admin').href).toBe('/contas?novo=1');
    expect(firstAction('leitura').href).toBe('/');
  });
});
