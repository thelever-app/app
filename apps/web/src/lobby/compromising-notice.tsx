import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import styles from './compromising-notice.module.css';
import sheet from './sheet.module.css';

interface CompromisingNoticeProps {
  /** The player stays, knowing what the game may ask. */
  readonly onUnderstood: () => void;
  /** The player leaves the room. */
  readonly onLeave: () => void;
}

/**
 * What compromising dilemmas are, before playing them: why the room is anonymous for them, and
 * that a small group may still give a vote away. The player stays or leaves the room.
 */
export function CompromisingNotice({ onUnderstood, onLeave }: CompromisingNoticeProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onUnderstood()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={`${sheet.sheet} ${styles.notice}`} aria-describedby={undefined}>
          <div aria-hidden="true" className={sheet.handle} />
          <span className={styles.icon}>
            <Icon name="heartBroken" size={26} />
          </span>
          <Dialog.Title className={styles.title}>{t('compromisingNotice.title')}</Dialog.Title>
          <p className={styles.text}>{t('compromisingNotice.text')}</p>
          <div className={styles.anonymous}>
            <Icon name="visibilityOff" size={22} />
            <span>{t('compromisingNotice.anonymous')}</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={sheet.primary} onClick={onUnderstood}>
              {t('compromisingNotice.understood')}
            </button>
            <button type="button" className={sheet.secondary} onClick={onLeave}>
              {t('compromisingNotice.leave')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
