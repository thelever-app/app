import type { GameStateDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import styles from './reveal-early-dialog.module.css';

interface RevealEarlyDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** How many have not answered the dilemma of the round, whom the reveal will not wait for. */
  readonly pendingCount: number;
  /** Who they are, in a nominal room; an anonymous room never tells. */
  readonly pending: readonly GameStateDto['players'][number][] | undefined;
  readonly onReveal: () => void;
}

/** «¿Revelar el dilema ya?»: the host confirms they will not wait for those who have not answered it. */
export function RevealEarlyDialog({
  open,
  onOpenChange,
  pendingCount,
  pending,
  onReveal,
}: RevealEarlyDialogProps) {
  const { t, i18n } = useTranslation();
  const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    (pending ?? []).map(({ nickname }) => nickname),
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog}>
          <div aria-hidden="true" className={styles.hazard} />
          <Dialog.Title className={styles.title}>{t('revealEarly.title')}</Dialog.Title>
          <Dialog.Description className={styles.body}>
            {t('revealEarly.body', { count: pendingCount })}
          </Dialog.Description>
          {pending && pending.length > 0 && (
            <div className={styles.who}>
              <span className={styles.avatars}>
                {pending.map((player) => (
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
          <div className={styles.actions}>
            <button type="button" className={styles.launch} onClick={onReveal}>
              {t('revealEarly.reveal')}
            </button>
            <Dialog.Close asChild>
              <button type="button" className={styles.wait}>
                {t('revealEarly.wait')}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
