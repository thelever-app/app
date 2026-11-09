import type { AvatarDto } from '@thelever-app/protocol';
import { COLORS, FACE_IDS } from './faces.ts';

/** Any avatar, each as likely as the others: for a room nobody is in yet. */
export function randomAvatar(random: () => number = Math.random): AvatarDto {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  return { face: pick(FACE_IDS), color: pick(COLORS) };
}

export function sameAvatar(one: AvatarDto, other: AvatarDto): boolean {
  return one.face === other.face && one.color === other.color;
}
