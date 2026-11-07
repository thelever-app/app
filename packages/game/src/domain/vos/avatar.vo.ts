import { InvalidAvatarError } from '../errors/invalid-avatar.error.ts';

/** The faces of the avatars: each one names a Notionists face the web draws. */
export const AVATAR_FACES = [
  'face-01',
  'face-02',
  'face-03',
  'face-04',
  'face-05',
  'face-06',
  'face-07',
  'face-08',
  'face-09',
  'face-10',
  'face-11',
  'face-12',
] as const;

/** The colours of the players in the design system. */
export const PLAYER_COLORS = [
  'khaki',
  'teal',
  'brown',
  'slate',
  'cyan',
  'rust',
  'olive',
  'stone',
] as const;

export type AvatarFace = (typeof AVATAR_FACES)[number];
export type PlayerColor = (typeof PLAYER_COLORS)[number];

/** A face and a colour; no two players of a room share both. */
export class AvatarVO {
  readonly face: AvatarFace;
  readonly color: PlayerColor;

  constructor(face: string, color: string) {
    if (!isFace(face) || !isColor(color)) throw new InvalidAvatarError(face, color);
    this.face = face;
    this.color = color;
  }

  /** Every avatar there is, face by face. */
  static all(): AvatarVO[] {
    return AVATAR_FACES.flatMap((face) => PLAYER_COLORS.map((color) => new AvatarVO(face, color)));
  }

  equals(other: AvatarVO): boolean {
    return this.face === other.face && this.color === other.color;
  }
}

function isFace(face: string): face is AvatarFace {
  return (AVATAR_FACES as readonly string[]).includes(face);
}

function isColor(color: string): color is PlayerColor {
  return (PLAYER_COLORS as readonly string[]).includes(color);
}
