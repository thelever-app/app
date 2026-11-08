import type { GameStateDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Icon } from './icon.tsx';
import { PlayerList } from './player-list.tsx';
import styles from './group-progress-sheet.module.css';

interface GroupProgressSheetProps {
  readonly players: GameStateDto['players'];
  readonly dilemmaCount: number;
  /** Opened from elsewhere, such as the menu of the game: then it has no «Ver todos» of its own. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

/** «Ver todos» and the sheet it opens: everyone's progress, never what they answered. */
export function GroupProgressSheet({
  players,
  dilemmaCount,
  open,
  onOpenChange,
}: GroupProgressSheetProps) {
  const { t } = useTranslation();
  const controlled = open !== undefined;

  return (
    <Dialog.Root {...(controlled && { open, onOpenChange })}>
      {!controlled && (
        <Dialog.Trigger asChild>
          <button type="button" className={styles.trigger}>
            {t('progressStrip.showAll')}
            <Icon name="expandMore" size={18} />
          </button>
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet}>
          <div aria-hidden="true" className={styles.handle} />
          <div className={styles.top}>
            <div className={styles.heading}>
              <Dialog.Title className={styles.title}>{t('groupSheet.title')}</Dialog.Title>
              <Dialog.Description className={styles.summary}>
                {t('groupSheet.summary', { count: players.length })}
              </Dialog.Description>
            </div>
            <Dialog.Close className={styles.close} aria-label={t('groupSheet.close')}>
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <div className={styles.content}>
            <PlayerList players={players} dilemmaCount={dilemmaCount} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
