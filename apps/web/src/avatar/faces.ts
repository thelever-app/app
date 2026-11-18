import { FACES } from '@thelever-app/ui';
import type { AvatarDto } from '@thelever-app/protocol';

type Face = AvatarDto['face'];
type Color = AvatarDto['color'];

/** In the order the picker shows them. */
export const FACE_IDS = Object.keys(FACES) as Face[];

/** In the order the picker shows them. */
export const COLORS: readonly Color[] = [
  'khaki',
  'teal',
  'brown',
  'slate',
  'cyan',
  'rust',
  'olive',
  'stone',
];
