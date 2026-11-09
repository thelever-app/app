/**
 * Two nicknames are the same when they match without counting case, accents or surrounding
 * spaces, as the room compares them. The room decides; this only warns and leaves out avatars.
 */
export function sameNickname(one: string, other: string): boolean {
  return folded(one) === folded(other);
}

/** The players whose nickname is the same as this one. */
export function namesakesOf<P extends { readonly nickname: string }>(
  nickname: string,
  players: readonly P[],
): P[] {
  if (nickname.trim() === '') return [];
  return players.filter((player) => sameNickname(player.nickname, nickname));
}

function folded(value: string): string {
  return value.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
