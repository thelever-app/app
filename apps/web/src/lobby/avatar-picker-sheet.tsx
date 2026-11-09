import type { AvatarDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, faceUri } from '../avatar/avatar.tsx';
import { COLORS, FACE_IDS } from '../avatar/faces.ts';
import { sameAvatar } from '../avatar/random-avatar.ts';
import styles from './avatar-picker-sheet.module.css';
import sheet from './sheet.module.css';

interface AvatarPickerSheetProps {
  readonly current: AvatarDto;
  /** The avatars the player may not take: those of whoever has the same nickname. */
  readonly taken: readonly AvatarDto[];
  readonly onChoose: (avatar: AvatarDto) => void;
  readonly onClose: () => void;
}

/** The player picks a face and a colour, but none that someone with the same nickname has. */
export function AvatarPickerSheet({ current, taken, onChoose, onClose }: AvatarPickerSheetProps) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<AvatarDto>(current);
  const isTaken = (avatar: AvatarDto) => taken.some((other) => sameAvatar(other, avatar));
  // A colour that leaves the chosen face taken moves the choice to the first face still free.
  const withColor = (avatar: AvatarDto, color: AvatarDto['color']): AvatarDto => {
    if (!isTaken({ ...avatar, color })) return { ...avatar, color };
    const face = FACE_IDS.find((other) => !isTaken({ face: other, color })) ?? avatar.face;
    return { face, color };
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={`${sheet.sheet} ${sheet.roomy}`}>
          <div aria-hidden="true" className={sheet.handle} />
          <div className={styles.heading}>
            <Avatar avatar={chosen} size="xl" />
            <Dialog.Title className={sheet.title}>{t('avatarPicker.title')}</Dialog.Title>
          </div>
          <div className={styles.faces} role="group" aria-label={t('avatarPicker.title')}>
            {FACE_IDS.map((face, index) => {
              const avatar = { face, color: chosen.color };
              return (
                <button
                  key={face}
                  type="button"
                  className={styles.face}
                  aria-label={t('avatarPicker.face', { number: index + 1 })}
                  aria-pressed={chosen.face === face}
                  disabled={isTaken(avatar)}
                  onClick={() => setChosen(avatar)}
                >
                  <img alt="" src={faceUri(face)} />
                </button>
              );
            })}
          </div>
          <div className={styles.colors} role="group" aria-label={t('avatarPicker.title')}>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={styles.color}
                style={{ '--swatch': `var(--color-player-${color})` } as CSSProperties}
                aria-label={t(`avatarPicker.colors.${color}`)}
                aria-pressed={chosen.color === color}
                onClick={() => setChosen(withColor(chosen, color))}
              />
            ))}
          </div>
          <Dialog.Description className={sheet.hint}>{t('avatarPicker.hint')}</Dialog.Description>
          <button
            type="button"
            className={sheet.primary}
            disabled={isTaken(chosen)}
            onClick={() => {
              if (!sameAvatar(chosen, current)) onChoose(chosen);
              onClose();
            }}
          >
            {t('avatarPicker.use')}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
