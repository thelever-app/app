import { Dialog } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import { shareInvitation } from '../lobby/invitation.ts';
import { QrScreen } from '../lobby/qr-screen.tsx';
import { useMuted } from '../sound/sound-context.tsx';
import styles from './game-menu.module.css';

interface GameMenuProps {
  /** The code of the room, to invite others during the game. */
  readonly code: string;
  /** Only for the host, in the decision of a round: reveals its dilemma without waiting. */
  readonly onRevealEarly?: (() => void) | undefined;
  /** Whether the player already reported the dilemma on screen. */
  readonly reported?: boolean;
  readonly onShowGroup: () => void;
  /** Where the dilemma on screen can be reported: in the decision of its round, not in its reveal. */
  readonly onReport?: (() => void) | undefined;
  readonly onLeave: () => void;
}

/** «Más opciones» and the menu of the game it opens. */
export function GameMenu({
  code,
  onRevealEarly,
  reported,
  onShowGroup,
  onReport,
  onLeave,
}: GameMenuProps) {
  const { t } = useTranslation();
  const [isQrOpen, setIsQrOpen] = useState(false);

  return (
    <>
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button type="button" className={styles.trigger} aria-label={t('gameMenu.open')}>
            <Icon name="moreVert" size={22} />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
            <div aria-hidden="true" className={styles.handle} />
            <Dialog.Title className={styles.hidden}>{t('gameMenu.title')}</Dialog.Title>
            <ul className={styles.items}>
              {onRevealEarly && (
                <MenuItem
                  icon="visibilityOutline"
                  title={t('gameMenu.revealEarly')}
                  subtitle={t('gameMenu.onlyHost')}
                  onSelect={onRevealEarly}
                />
              )}
              <MenuItem icon="groups" title={t('gameMenu.showGroup')} onSelect={onShowGroup} />
              <ShareRow code={code} />
              <MenuItem
                icon="qrCode"
                title={t('gameMenu.showQr')}
                onSelect={() => setIsQrOpen(true)}
              />
              {onReport && !reported && (
                <MenuItem
                  icon="flag"
                  title={t('gameMenu.report')}
                  subtitle={t('gameMenu.reportSubtitle')}
                  onSelect={onReport}
                />
              )}
              {onReport && reported && (
                <li>
                  <span className={styles.done} aria-disabled="true">
                    <Icon name="checkCircle" size={22} />
                    <span className={styles.itemTitle}>{t('gameMenu.reported')}</span>
                  </span>
                </li>
              )}
              <SoundRow />
            </ul>
            <hr className={styles.divider} />
            <ul className={styles.items}>
              <MenuItem icon="logout" title={t('gameMenu.leave')} onSelect={onLeave} />
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {isQrOpen && <QrScreen code={code} onClose={() => setIsQrOpen(false)} />}
    </>
  );
}

/**
 * Shares the invitation link with the code under it, as the lobby does; it stays open to say so
 * when it copied the link instead.
 */
function ShareRow({ code }: { readonly code: string }) {
  const { t } = useTranslation();
  const subtitleId = useId();
  const [copied, setCopied] = useState(false);
  const title = copied ? t('gameMenu.copied') : t('gameMenu.share');
  const share = async () => {
    const shared = await shareInvitation(code, t('lobby.shareText', { code }));
    if (shared === 'copied') setCopied(true);
  };
  return (
    <li>
      <button
        type="button"
        className={styles.item}
        aria-label={title}
        aria-describedby={subtitleId}
        onClick={() => void share()}
      >
        <Icon name="iosShare" size={22} />
        <span className={styles.itemText}>
          <span className={styles.itemTitle}>{title}</span>
          <span id={subtitleId} className={styles.itemSubtitle} data-testid="game-room-code">
            {t('gameMenu.code', { code })}
          </span>
        </span>
      </button>
    </li>
  );
}

interface MenuItemProps {
  readonly icon: IconName;
  readonly title: string;
  readonly subtitle?: string;
  readonly onSelect: () => void;
}

/** Closes the menu and then does what it says, so a sheet it opens is the only one on screen. */
function MenuItem({ icon, title, subtitle, onSelect }: MenuItemProps) {
  const subtitleId = useId();
  return (
    <li>
      <Dialog.Close asChild>
        <button
          type="button"
          className={styles.item}
          aria-label={title}
          aria-describedby={subtitle ? subtitleId : undefined}
          onClick={onSelect}
        >
          <Icon name={icon} size={22} />
          <span className={styles.itemText}>
            <span className={styles.itemTitle}>{title}</span>
            {subtitle && (
              <span id={subtitleId} className={styles.itemSubtitle}>
                {subtitle}
              </span>
            )}
          </span>
        </button>
      </Dialog.Close>
    </li>
  );
}

/** One setting for sound and vibration alike; it does not close the menu. */
function SoundRow() {
  const { t } = useTranslation();
  const labelId = useId();
  const hintId = useId();
  const [muted, setMuted] = useMuted();
  return (
    <li className={styles.soundRow}>
      <Icon name={muted ? 'volumeOff' : 'volumeUp'} size={22} />
      <span className={styles.itemText}>
        <span id={labelId} className={styles.itemTitle}>
          {t('sound.label')}
        </span>
        <span id={hintId} className={styles.itemSubtitle}>
          {t('sound.hint')}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!muted}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className={styles.switch}
        onClick={() => setMuted(!muted)}
      />
    </li>
  );
}
