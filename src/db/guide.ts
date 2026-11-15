import { KEYS, read, write } from './storage';

/** O guia de primeiros passos abre sozinho só na primeira vez de cada pessoa neste aparelho. */
export async function hasSeenGuide(userId: string): Promise<boolean> {
  return !!(await read<Record<string, boolean>>(KEYS.guideSeen, {}))[userId];
}

export async function markGuideSeen(userId: string): Promise<void> {
  const seen = await read<Record<string, boolean>>(KEYS.guideSeen, {});
  if (seen[userId]) return;
  await write(KEYS.guideSeen, { ...seen, [userId]: true });
}
