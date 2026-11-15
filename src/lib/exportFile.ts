/**
 * Salva um arquivo de texto e abre o menu "Compartilhar" do celular
 * (WhatsApp, e-mail, Drive...). Na web: ver exportFile.web.ts (download direto).
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Retorna uma mensagem de erro, ou null se deu certo. */
export async function shareTextFile(fileName: string, content: string, mimeType: string): Promise<string | null> {
  if (!(await Sharing.isAvailableAsync())) return 'Este aparelho não permite compartilhar arquivos.';
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName, UTI: 'public.comma-separated-values-text' });
  return null;
}
