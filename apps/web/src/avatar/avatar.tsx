import { createAvatar } from '@dicebear/core';
import * as notionistsNeutral from '@dicebear/notionists-neutral';
import type { AvatarDto } from '@thelever-app/protocol';
import { type CSSProperties, useMemo } from 'react';
import { FACES } from './faces.ts';
import styles from './avatar.module.css';

/**
 * xs (28 px) for the predictions, the chips and the dialogs of the game, s (32 px) for its strip and
 * its lists, sm for the lobby, md for the picker and the forms, lg for the face that is being chosen.
 */
export type AvatarSize = 'xs' | 's' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  readonly avatar: AvatarDto;
  readonly size?: AvatarSize;
  /** Dimmed while the player is disconnected. */
  readonly dimmed?: boolean;
}

/** The face as an image, generated once per face: the same face draws the same everywhere. */
const faceUris = new Map<AvatarDto['face'], string>();

export function faceUri(face: AvatarDto['face']): string {
  const cached = faceUris.get(face);
  if (cached) return cached;
  const { glasses, ...parts } = FACES[face];
  const uri = createAvatar(notionistsNeutral, {
    scale: 125,
    // The colour of the player shows behind the face: the style would paint it white.
    backgroundColor: ['transparent'],
    brows: [parts.brows],
    eyes: [parts.eyes],
    lips: [parts.lips],
    nose: [parts.nose],
    ...(glasses ? { glasses: [glasses], glassesProbability: 100 } : { glassesProbability: 0 }),
  }).toDataUri();
  faceUris.set(face, uri);
  return uri;
}

/** A player's face on their colour. Decorative: the name next to it says who it is. */
export function Avatar({ avatar, size = 'sm', dimmed = false }: AvatarProps) {
  const src = useMemo(() => faceUri(avatar.face), [avatar.face]);
  const style = { '--avatar-color': `var(--color-player-${avatar.color})` } as CSSProperties;
  return (
    <span
      className={`${styles.avatar} ${styles[size]}`}
      style={style}
      data-dimmed={dimmed || undefined}
      data-face={avatar.face}
      data-color={avatar.color}
    >
      <img alt="" src={src} className={styles.face} />
    </span>
  );
}
