import type { AvatarDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { Avatar } from './avatar.tsx';
import { FACE_IDS } from './faces.ts';
import styles from './avatar-button.module.css';

interface AvatarButtonProps {
  readonly avatar: AvatarDto;
  readonly onClick: () => void;
}

/** The avatar the player is about to enter with, said by its face and colour, which opens the picker to change it. */
export function AvatarButton({ avatar, onClick }: AvatarButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('avatarPicker.changeCurrent', {
        face: FACE_IDS.indexOf(avatar.face) + 1,
        color: t(`avatarPicker.colors.${avatar.color}`).toLowerCase(),
      })}
      data-face={avatar.face}
      data-color={avatar.color}
      onClick={onClick}
    >
      <Avatar avatar={avatar} size="lg" />
      <span aria-hidden="true" className={styles.badge}>
        <Icon name="sync" size={16} />
      </span>
    </button>
  );
}
