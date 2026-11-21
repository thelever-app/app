import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
// The same confirmation as revealing early: a choice of the host that changes every screen.
import styles from './reveal-early-dialog.module.css';

interface RestartGameDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRestart: () => void;
}

/** «¿Reiniciar la partida?»: the host confirms they take everyone back to the lobby. */
export function RestartGameDialog({ open, onOpenChange, onRestart }: RestartGameDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog}>
          <div aria-hidden="true" className={styles.hazard} />
          <Dialog.Title className={styles.title}>{t('restartGame.title')}</Dialog.Title>
          <Dialog.Description className={styles.body}>{t('restartGame.body')}</Dialog.Description>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.launch}
              onClick={() => {
                onRestart();
                onOpenChange(false);
              }}
            >
              {t('restartGame.restart')}
            </button>
            <Dialog.Close asChild>
              <button type="button" className={styles.wait}>
                {t('restartGame.keepPlaying')}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
