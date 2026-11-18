import type { GameStateDto } from '@thelever-app/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { usePlayerName } from '../components/players.ts';
import { TITLE_ICONS, type GameTitle, type TitleHolder } from './titles.ts';
import styles from './results.module.css';

type Player = GameStateDto['players'][number];

/**
 * One title of the game on a screen of its own: who won it, with their avatars and the fact that
 * earned it, and who came right after. On a tie, every winner.
 */
export function TitleScreen({
  game,
  title,
}: {
  readonly game: GameStateDto;
  readonly title: GameTitle;
}) {
  const { t, i18n } = useTranslation();
  const nameOf = usePlayerName();
  const titleId = useId();
  const playerOf = (playerId: string) =>
    game.players.find((player) => player.playerId === playerId);
  const namesOf = (holder: TitleHolder) =>
    new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
      holder.playerIds.flatMap((playerId) => {
        const player = playerOf(playerId);
        return player ? nameOf(player) : [];
      }),
    );
  const factOf = (holder: TitleHolder) =>
    t(`results.facts.${title.title}`, { count: holder.count, of: holder.of ?? 0 });

  return (
    <section className={styles.titleScreen} aria-labelledby={titleId} data-title={title.title}>
      <span className={styles.titleIcon}>
        <Icon name={TITLE_ICONS[title.title]} size={36} />
      </span>
      <h1 id={titleId} className={styles.titleName}>
        {t(`results.titles.${title.title}`)}
      </h1>
      <p className={styles.titleMeaning}>{t(`results.meanings.${title.title}`)}</p>
      <ul className={styles.winners}>
        {title.winners.map((holder) => (
          <li key={holder.playerIds.join()} className={styles.winner} data-testid="title-winner">
            <span className={styles.winnerAvatars}>
              {holder.playerIds.flatMap((playerId) => {
                const player: Player | undefined = playerOf(playerId);
                return player ? <Avatar key={playerId} avatar={player.avatar} size="md" /> : [];
              })}
            </span>
            <span className={styles.winnerName}>{namesOf(holder)}</span>
            <span className={styles.fact}>{factOf(holder)}</span>
          </li>
        ))}
      </ul>
      {title.runnersUp.length > 0 && (
        <p className={styles.runnerUp} data-testid="title-runner-up">
          {t('results.runnerUp', {
            names: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
              title.runnersUp.map(namesOf),
            ),
            fact: factOf(title.runnersUp[0]!),
          })}
        </p>
      )}
    </section>
  );
}
