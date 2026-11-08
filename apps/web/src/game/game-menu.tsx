import { Dialog } from 'radix-ui';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import styles from './game-menu.module.css';

interface GameMenuProps {
  readonly isHost: boolean;
  /** Whether the player already reported the dilemma on screen; undefined without one. */
  readonly reported: boolean | undefined;
  readonly onLaunchReveal: () => void;
  readonly onShowGroup: () => void;
  readonly onReport: () => void;
  readonly onLeave: () => void;
}

/** «Más opciones» and the menu of the game it opens. */
export function GameMenu({
  isHost,
  reported,
  onLaunchReveal,
  onShowGroup,
  onReport,
  onLeave,
}: GameMenuProps) {
  const { t } = useTranslation();

  return (
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
            {isHost && (
              <MenuItem
                icon="playCircle"
                title={t('gameMenu.launchReveal')}
                subtitle={t('gameMenu.onlyHost')}
                onSelect={onLaunchReveal}
              />
            )}
            <MenuItem icon="groups" title={t('gameMenu.showGroup')} onSelect={onShowGroup} />
            {reported === false && (
              <MenuItem
                icon="flag"
                title={t('gameMenu.report')}
                subtitle={t('gameMenu.reportSubtitle')}
                onSelect={onReport}
              />
            )}
            {reported === true && (
              <li>
                <span className={styles.done} aria-disabled="true">
                  <Icon name="checkCircle" size={22} />
                  <span className={styles.itemTitle}>{t('gameMenu.reported')}</span>
                </span>
              </li>
            )}
          </ul>
          <hr className={styles.divider} />
          <ul className={styles.items}>
            <MenuItem icon="logout" title={t('gameMenu.leave')} onSelect={onLeave} />
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
