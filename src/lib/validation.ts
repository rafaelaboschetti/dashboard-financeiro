/** Regras de validação de formulários usadas em mais de uma tela. */

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

/**
 * Regra para senhas NOVAS (cadastro, novo membro, troca de senha): pelo menos
 * 8 caracteres, com letras e números. Retorna a mensagem de erro, ou null se estiver ok.
 * (O login não usa esta regra, para quem já tem senha antiga mais curta continuar entrando.)
 */
export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return 'A senha precisa ter letras e números.';
  return null;
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

/**
 * Força aproximada da senha, para o indicador enquanto a pessoa digita.
 * 0 = vazia; 1 = fraca; 2 = razoável; 3 = boa; 4 = forte.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '' };
  // Senhas óbvias, ou que não cumprem a regra mínima, são sempre "fracas".
  const obvious = /^(.)\1+$/.test(password) || /^(1234|abcd|qwer|senha|password)/i.test(password);
  if (obvious || passwordError(password)) return { score: 1, label: 'Fraca' };
  // Cumpriu a regra mínima: "razoável". Cada extra sobe um nível (até "forte").
  const extras = [password.length >= 12, /[a-zà-ÿ]/.test(password) && /[A-ZÀ-Þ]/.test(password), /[^A-Za-zÀ-ÿ0-9]/.test(password)].filter(Boolean).length;
  const score = Math.min(4, 2 + extras) as 2 | 3 | 4;
  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  return { score, label: labels[score] };
}
