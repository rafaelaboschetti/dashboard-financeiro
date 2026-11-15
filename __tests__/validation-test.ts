import { isValidEmail, passwordError, passwordStrength } from '@/lib/validation';

describe('validação', () => {
  it('e-mail', () => {
    expect(isValidEmail(' ana@empresa.com ')).toBe(true);
    expect(isValidEmail('ana@empresa')).toBe(false);
    expect(isValidEmail('ana empresa.com')).toBe(false);
  });

  it('senha nova: 8+ caracteres, com letras e números', () => {
    expect(passwordError('abc123')).toMatch(/pelo menos 8/);
    expect(passwordError('abcdefgh')).toMatch(/letras e números/);
    expect(passwordError('12345678')).toMatch(/letras e números/);
    expect(passwordError('café2026')).toBeNull();
  });

  it('força da senha', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc').label).toBe('Fraca');
    expect(passwordStrength('senha123').label).toBe('Fraca'); // óbvia
    expect(passwordStrength('maria2026').score).toBe(2);
    expect(passwordStrength('Maria2026').score).toBe(3);
    expect(passwordStrength('Maria#2026!loja').label).toBe('Forte');
  });
});
