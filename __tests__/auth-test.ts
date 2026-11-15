/**
 * Login e armazenamento local: hash de senha, bloqueio por tentativas, sessão com prazo
 * e dados criptografados (AES-GCM) que rejeitam adulteração.
 * Os módulos nativos são simulados: AsyncStorage e SecureStore em memória e o AES
 * do expo-crypto com o WebCrypto do Node.
 */
import { createHash } from 'node:crypto';

const mockStore = new Map<string, string>();
const mockSecure = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getAllKeys: async () => [...mockStore.keys()],
    getItem: async (k: string) => mockStore.get(k) ?? null,
    setItem: async (k: string, v: string) => void mockStore.set(k, v),
    removeItem: async (k: string) => void mockStore.delete(k),
  },
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'x',
  getItemAsync: async (k: string) => mockSecure.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockSecure.set(k, v),
}));

jest.mock('expo-crypto', () => require('../test-utils/expoCryptoMock'));

// Importados depois dos mocks.
// eslint-disable-next-line import/first
import * as auth from '@/db/auth';
// eslint-disable-next-line import/first
import * as storage from '@/db/storage';

jest.setTimeout(30000);

describe('migração de dados antigos (sem criptografia)', () => {
  beforeAll(() => {
    const salt = 'old-salt';
    const oldHash = createHash('sha256').update(`${salt}:senha-antiga`).digest('hex');
    mockStore.set('fin:users', JSON.stringify([{ id: 'u-old', companyId: 'c1', name: 'Ana', email: 'ana@x.com', role: 'admin', salt, passwordHash: oldHash }]));
    mockStore.set('fin:session', JSON.stringify('u-old'));
    mockStore.set('fin:lixo', 'nao-e-json');
  });

  it('criptografa os dados antigos e descarta sessão sem prazo e valores inválidos', async () => {
    expect(await auth.getSessionUserId()).toBeNull();
    expect((await auth.getUsers())[0].email).toBe('ana@x.com');
    expect(mockStore.get('fin:users')).toMatch(/^enc1:/);
    expect(mockStore.get('fin:users')).not.toContain('ana@x.com');
    expect(mockStore.has('fin:lixo')).toBe(false);
  });

  it('senha antiga (SHA-256 simples) funciona e é atualizada para PBKDF2', async () => {
    const r = await auth.verifyLogin(' ANA@x.com ', 'senha-antiga');
    expect(r.user?.id).toBe('u-old');
    expect((await auth.getUsers())[0].passwordHash).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect((await auth.verifyLogin('ana@x.com', 'senha-antiga')).user).toBeDefined();
  });
});

describe('login', () => {
  it('cadastra empresa, abre sessão e faz login', async () => {
    const u = await auth.registerCompany({ companyName: 'Loja', name: 'Bia', email: 'bia@x.com', password: 'segredo123', withDemo: true });
    await auth.setSessionUserId(u.id);
    expect(await auth.getSessionUserId()).toBe(u.id);
    expect((await auth.verifyLogin('bia@x.com', 'segredo123')).user?.id).toBe(u.id);
    const data = await storage.read<{ bills: unknown[] } | null>(`fin:data:${u.companyId}`, null);
    expect(data?.bills.length).toBeGreaterThan(0);
  });

  it('não permite dois usuários com o mesmo e-mail', async () => {
    await expect(auth.createUser({ companyId: 'c1', name: 'X', email: 'BIA@x.com', password: '123456', role: 'leitura' })).rejects.toThrow('Já existe');
  });

  it('bloqueia depois de 5 senhas erradas, mesmo com a senha certa', async () => {
    for (let i = 0; i < 5; i++) expect((await auth.verifyLogin('bia@x.com', 'errada')).error).toBe('E-mail ou senha incorretos.');
    expect((await auth.verifyLogin('bia@x.com', 'segredo123')).error).toMatch(/Muitas tentativas.*30 segundos/);
  });

  it('e-mail inexistente recebe a mesma mensagem de senha errada', async () => {
    expect((await auth.verifyLogin('ninguem@x.com', 'x')).error).toBe('E-mail ou senha incorretos.');
  });
});

describe('conta e equipe', () => {
  it('troca a senha só com a senha atual correta', async () => {
    const id = (await auth.getUsers()).find((x) => x.email === 'bia@x.com')!.id;
    expect(await auth.changePassword(id, 'errada', 'novaSenha1')).toBe('A senha atual está incorreta.');
    expect(await auth.changePassword(id, 'segredo123', 'novaSenha1')).toBeNull();
    const login = async (pw: string) => {
      mockStore.delete('fin:login-attempts'); // isola do bloqueio testado acima
      return auth.verifyLogin('bia@x.com', pw);
    };
    expect((await login('novaSenha1')).user?.id).toBe(id);
    expect((await login('segredo123')).error).toBe('E-mail ou senha incorretos.');
  });

  it('altera nome/perfil e remove usuário (que deixa de conseguir entrar)', async () => {
    const membro = await auth.createUser({ companyId: 'c1', name: 'Caio', email: 'caio@x.com', password: 'senha123', role: 'leitura' });
    expect((await auth.updateUser(membro.id, { role: 'financeiro', name: ' Caio S. ' })).name).toBe('Caio S.');
    expect((await auth.getUsers()).find((x) => x.id === membro.id)?.role).toBe('financeiro');
    await auth.deleteUser(membro.id);
    expect((await auth.verifyLogin('caio@x.com', 'senha123')).user).toBeUndefined();
  });
});

describe('sessão e adulteração', () => {
  let saved = '';
  beforeAll(async () => {
    await auth.setSessionUserId('u-old');
    saved = mockStore.get('fin:session')!;
  });

  it('rejeita valor copiado de outra chave', async () => {
    mockStore.set('fin:session', mockStore.get('fin:users')!);
    expect(await auth.getSessionUserId()).toBeNull();
  });

  it('rejeita valor criptografado alterado', async () => {
    mockStore.set('fin:session', saved.slice(0, -6) + (saved.endsWith('AAAA==') ? 'BBBB==' : 'AAAA=='));
    expect(await auth.getSessionUserId()).toBeNull();
  });

  it('rejeita sessão forjada em texto puro', async () => {
    mockStore.set('fin:session', JSON.stringify({ userId: 'u-old', expiresAt: Date.now() + 1e9 }));
    expect(await auth.getSessionUserId()).toBeNull();
  });

  it('a sessão expira depois de 7 dias', async () => {
    mockStore.set('fin:session', saved);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 8 * 864e5);
    expect(await auth.getSessionUserId()).toBeNull();
    jest.restoreAllMocks();
  });
});

describe('armazenamento', () => {
  it('guarda acentos e emoji', async () => {
    await storage.write('fin:k', { t: 'Ação — café ☕ 😀' });
    expect((await storage.read<{ t: string } | null>('fin:k', null))?.t).toBe('Ação — café ☕ 😀');
  });

  it('mantém a ordem de gravações seguidas', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => storage.write('fin:seq', i)));
    expect(await storage.read('fin:seq', -1)).toBe(19);
  });
});
