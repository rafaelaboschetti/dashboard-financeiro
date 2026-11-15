/** Regras de validação de formulários usadas em mais de uma tela. */

export const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

/** Mensagem de erro da senha, ou null se estiver ok. */
export function passwordError(password: string): string | null {
  return password.length < MIN_PASSWORD_LENGTH ? `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` : null;
}
