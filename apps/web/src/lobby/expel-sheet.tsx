import type { RoomStateDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import styles from './expel-sheet.module.css';
import sheet from './sheet.module.css';

interface ExpelSheetProps {
  readonly player: RoomStateDto['players'][number];
  readonly onExpel: () => void;
  readonly onClose: () => void;
}

/** The host confirms before expelling: the player cannot come back to this game. */
export function ExpelSheet({ player, onExpel, onClose }: ExpelSheetProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={sheet.sheet}>
          <div aria-hidden="true" className={sheet.handle} />
          <div className={styles.heading}>
            <Avatar avatar={player.avatar} size="md" />
            <Dialog.Title className={sheet.title}>
              {t('expel.title', { name: player.nickname })}
            </Dialog.Title>
          </div>
          <Dialog.Description className={styles.text}>{t('expel.text')}</Dialog.Description>
          <button
            type="button"
            className={sheet.dark}
            onClick={() => {
              onExpel();
              onClose();
            }}
          >
            {t('expel.confirm')}
          </button>
          <Dialog.Close className={sheet.secondary}>{t('expel.cancel')}</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
