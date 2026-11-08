import type { GameStateDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import styles from './launch-reveal-dialog.module.css';

interface LaunchRevealDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Who has not finished, who the reveal will not wait for. */
  readonly stragglers: readonly GameStateDto['players'][number][];
  readonly onLaunch: () => void;
}

/** «¿Lanzar el reveal ya?»: the host confirms they will not wait for those who have not finished. */
export function LaunchRevealDialog({
  open,
  onOpenChange,
  stragglers,
  onLaunch,
}: LaunchRevealDialogProps) {
  const { t, i18n } = useTranslation();
  const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    stragglers.map(({ nickname }) => nickname),
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog}>
          <div aria-hidden="true" className={styles.hazard} />
          <Dialog.Title className={styles.title}>{t('launchReveal.title')}</Dialog.Title>
          <Dialog.Description className={styles.body}>
            {t('launchReveal.body', { count: stragglers.length })}
          </Dialog.Description>
          {stragglers.length > 0 && (
            <div className={styles.who}>
              <span className={styles.avatars}>
                {stragglers.map((player) => (
                  <Avatar
                    key={player.playerId}
                    avatar={player.avatar}
                    size="xs"
                    dimmed={!player.connected}
                  />
                ))}
              </span>
              <span className={styles.names}>{names}</span>
            </div>
          )}
          <button type="button" className={styles.launch} onClick={onLaunch}>
            {t('launchReveal.launch')}
          </button>
          <Dialog.Close asChild>
            <button type="button" className={styles.wait}>
              {t('launchReveal.wait')}
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
