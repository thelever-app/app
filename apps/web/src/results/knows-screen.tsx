import type { GameStateDto } from '@thelever-app/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { usePlayerName } from '../components/players.ts';
import styles from './results.module.css';

/** Who knows the player best: only they see it. Everyone who shares it on a tie, or nobody. */
export function KnowsScreen({ game }: { readonly game: GameStateDto }) {
  const { t, i18n } = useTranslation();
  const nameOf = usePlayerName();
  const titleId = useId();
  const known = game.results?.knownBestBy;
  const knowers = (known?.playerIds ?? []).flatMap((playerId) =>
    game.players.filter((player) => player.playerId === playerId),
  );
  const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    knowers.map((player) => nameOf(player)),
  );

  return (
    <section className={styles.titleScreen} aria-labelledby={titleId} data-testid="known-best">
      <span className={styles.private}>
        <Icon name="lock" size={16} />
        {t('results.onlyYou')}
      </span>
      <h1 id={titleId} className={styles.knowsTitle}>
        {t('results.knowsTitle')}
      </h1>
      {knowers.length === 0 ? (
        <p className={styles.titleMeaning}>{t('results.knowsNobody')}</p>
      ) : (
        <div className={styles.winner}>
          <span className={styles.knowers}>
            {knowers.map((player) => (
              <Avatar key={player.playerId} avatar={player.avatar} size="xxl" />
            ))}
          </span>
          <span className={styles.winnerName} data-testid="known-best-names">
            {names}
          </span>
          <span className={styles.knowsFact}>
            {t('results.knowsFact', { count: known?.points ?? 0 })}
          </span>
        </div>
      )}
    </section>
  );
}
