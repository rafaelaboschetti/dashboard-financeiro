/**
 * Versão web: o navegador não compartilha arquivos locais, então o arquivo é baixado
 * direto (vai para a pasta Downloads).
 */
export async function shareTextFile(fileName: string, content: string, mimeType: string): Promise<string | null> {
  if (typeof document === 'undefined') return 'Exportação indisponível.';
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return null;
}
