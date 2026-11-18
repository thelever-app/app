import { createAvatar } from '@dicebear/core';
import * as notionistsNeutral from '@dicebear/notionists-neutral';
import type { Options } from '@dicebear/notionists-neutral';

type Variant<K extends keyof Options> =
  NonNullable<Options[K]> extends readonly (infer V)[] ? V : never;

/** The parts of a Notionists face the design fixes for each face of the room. */
interface FaceVariants {
  readonly brows: Variant<'brows'>;
  readonly eyes: Variant<'eyes'>;
  readonly lips: Variant<'lips'>;
  readonly nose: Variant<'nose'>;
  readonly glasses?: Variant<'glasses'>;
}

/**
 * The twelve faces of the artboard «AvatarPicker», as variants of `@dicebear/notionists-neutral`:
 * generated with them at scale 125 and without background, they are the very faces of the design.
 */
export const FACES = {
  'face-01': { brows: 'variant09', eyes: 'variant01', lips: 'variant21', nose: 'variant09' },
  'face-02': {
    brows: 'variant05',
    eyes: 'variant04',
    lips: 'variant05',
    nose: 'variant06',
    glasses: 'variant09',
  },
  'face-03': { brows: 'variant09', eyes: 'variant03', lips: 'variant14', nose: 'variant18' },
  'face-04': { brows: 'variant03', eyes: 'variant05', lips: 'variant18', nose: 'variant17' },
  'face-05': { brows: 'variant04', eyes: 'variant01', lips: 'variant21', nose: 'variant12' },
  'face-06': { brows: 'variant12', eyes: 'variant01', lips: 'variant24', nose: 'variant05' },
  'face-07': { brows: 'variant12', eyes: 'variant03', lips: 'variant21', nose: 'variant03' },
  'face-08': { brows: 'variant03', eyes: 'variant02', lips: 'variant11', nose: 'variant19' },
  'face-09': { brows: 'variant03', eyes: 'variant05', lips: 'variant21', nose: 'variant12' },
  'face-10': { brows: 'variant08', eyes: 'variant04', lips: 'variant24', nose: 'variant04' },
  'face-11': { brows: 'variant11', eyes: 'variant02', lips: 'variant20', nose: 'variant03' },
  'face-12': {
    brows: 'variant11',
    eyes: 'variant04',
    lips: 'variant06',
    nose: 'variant11',
    glasses: 'variant08',
  },
} as const satisfies Readonly<Record<string, FaceVariants>>;

/** One of the twelve faces a player can have. */
export type Face = keyof typeof FACES;

/** The face drawn as the design draws it, without background, so the colour of the player shows behind it. */
function drawn(face: Face) {
  const { glasses, ...parts } = FACES[face] as FaceVariants;
  return createAvatar(notionistsNeutral, {
    scale: 125,
    // The colour of the player shows behind the face: the style would paint it white.
    backgroundColor: ['transparent'],
    brows: [parts.brows],
    eyes: [parts.eyes],
    lips: [parts.lips],
    nose: [parts.nose],
    ...(glasses ? { glasses: [glasses], glassesProbability: 100 } : { glassesProbability: 0 }),
  });
}

/** The face as an SVG file, for the public web: the same face draws the same as in the app. */
export function faceSvg(face: Face): string {
  return drawn(face).toString();
}

/** The face as an address an image can show, for the app. */
export function faceDataUri(face: Face): string {
  return drawn(face).toDataUri();
}
