import { Dialog } from 'radix-ui';
import { useActionState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import { forgetDevice } from '../identity/forget-device.ts';
import sheet from '../lobby/sheet.module.css';
import { useRoomApi } from '../room/room-api-context.tsx';
import styles from './settings.module.css';

/** What deleting the data does, and what it keeps, point by point. */
const POINTS: readonly (readonly [
  'games' | 'consent' | 'public' | 'history' | 'device',
  IconName,
])[] = [
  ['games', 'delete'],
  ['consent', 'gavel'],
  ['public', 'public'],
  ['history', 'history'],
  ['device', 'restartAlt'],
];

interface DeleteDataSheetProps {
  readonly onClose: () => void;
  /** The deletion is asked for and the device has started from scratch. */
  readonly onDeleted: () => void;
}

/**
 * Before deleting the data the player is told what is deleted and what is kept. Confirmed, the
 * room server keeps the request and the device forgets everything of the player at once.
 */
export function DeleteDataSheet({ onClose, onDeleted }: DeleteDataSheetProps) {
  const { t } = useTranslation();
  const api = useRoomApi();
  const [failed, confirm, pending] = useActionState(async () => {
    try {
      await api.requestDataDeletion();
      await forgetDevice();
      onDeleted();
      return false;
    } catch {
      return true;
    }
  }, false);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={`${sheet.sheet} ${sheet.roomy}`}>
          <form action={confirm} className={styles.sheetForm}>
            <div aria-hidden="true" className={sheet.handle} />
            <Dialog.Title className={sheet.title}>{t('deleteData.title')}</Dialog.Title>
            <Dialog.Description asChild>
              <ul className={styles.points}>
                {POINTS.map(([point, icon]) => (
                  <li key={point} className={styles.point}>
                    <Icon name={icon} size={20} />
                    <span>{t(`deleteData.${point}`)}</span>
                  </li>
                ))}
              </ul>
            </Dialog.Description>
            <p className={styles.cardText}>{t('deleteData.undo')}</p>
            {failed && (
              <p className={styles.cardText} role="alert">
                {t('deleteData.failed')}
              </p>
            )}
            <button type="submit" className={sheet.dark} disabled={pending}>
              {t('deleteData.confirm')}
            </button>
            <Dialog.Close className={sheet.secondary}>{t('deleteData.cancel')}</Dialog.Close>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
