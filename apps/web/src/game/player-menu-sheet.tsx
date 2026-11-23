import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import styles from './player-menu-sheet.module.css';

interface PlayerMenuSheetProps {
  /** The nickname of the player whose avatar was touched. */
  readonly nickname: string;
  readonly onReport: () => void;
  /** Only for the host, in the lobby. */
  readonly onExpel?: (() => void) | undefined;
  readonly onClose: () => void;
}

/** What touching the avatar of another player offers: reporting their nickname, and for the host, expelling them. */
export function PlayerMenuSheet({ nickname, onReport, onExpel, onClose }: PlayerMenuSheetProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <div aria-hidden="true" className={styles.handle} />
          <Dialog.Title className={styles.title}>{nickname}</Dialog.Title>
          <button type="button" className={styles.item} onClick={onReport}>
            <Icon name="flag" size={22} />
            {t('playerMenu.report')}
          </button>
          {onExpel && (
            <button type="button" className={styles.item} onClick={onExpel}>
              <Icon name="personRemove" size={22} />
              {t('playerMenu.expel')}
            </button>
          )}
          <p className={styles.note}>{t('playerMenu.note')}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
