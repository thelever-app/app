import { MINIMUM_PLAYERS, type RoomSettingsDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { Icon } from './icon.tsx';
import styles from './variant-badges.module.css';

interface VariantBadgesProps {
  readonly variant: RoomSettingsDto['variant'];
  /** Whether an anonymous room also carries the badge «Anónimo». */
  readonly withAnonymous?: boolean;
  /** Greyed out, as the rest of an option the player cannot choose. */
  readonly off?: boolean;
}

/**
 * The badges a variant carries: the fewest players a game starts with and, where the screen asks
 * for it, that the room is anonymous. Those of an anonymous room stand out, dark.
 */
export function VariantBadges({ variant, withAnonymous = false, off = false }: VariantBadgesProps) {
  const { t } = useTranslation();
  const tone = variant === 'anonymous' ? 'dark' : 'light';
  return (
    <span className={styles.badges}>
      <span
        className={styles.badge}
        data-tone={tone}
        data-off={off || undefined}
        data-testid="minimum-players"
      >
        <Icon name="group" size={15} />
        {t('badges.players', { minimum: MINIMUM_PLAYERS[variant] })}
      </span>
      {withAnonymous && variant === 'anonymous' && (
        <span
          className={styles.badge}
          data-tone={tone}
          data-off={off || undefined}
          data-testid="anonymous-badge"
        >
          <Icon name="visibilityOff" size={15} />
          {t('badges.anonymous')}
        </span>
      )}
    </span>
  );
}
