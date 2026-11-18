import type { AvatarDto } from '@thelever-app/protocol';
import { type CSSProperties, useMemo } from 'react';
import { faceDataUri } from '@thelever-app/ui';
import styles from './avatar.module.css';

/**
 * xs (28 px) for the predictions, the chips and the dialogs of the game, s (32 px) for its strip and
 * its lists, sm for the lobby, md for the picker, lg (64 px) for the face the player enters with,
 * xl (72 px) for the face being chosen in the picker.
 */
export type AvatarSize = 'xs' | 's' | 'sm' | 'md' | 'lg' | 'xl';

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
  const uri = faceDataUri(face);
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
