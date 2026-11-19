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
 * One title of the game on a screen of its own, as on a podium: which of the titles it is, its sign
 * and name, who won it, with their avatars and the fact that earned it, and who came right after.
 * On a tie, every winner.
 */
export function TitleScreen({
  game,
  title,
  position,
}: {
  readonly game: GameStateDto;
  readonly title: GameTitle;
  /** Where the title is among the titles of the game, from 0. */
  readonly position: number;
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
  // Next to the runner-up, only the figure: «10 de 12», or the reactions or the points.
  const figureOf = (holder: TitleHolder) =>
    holder.of === null
      ? factOf(holder)
      : t('results.runnerUpOf', { count: holder.count, of: holder.of });

  return (
    <section className={styles.titleScreen} aria-labelledby={titleId} data-title={title.title}>
      <p className={styles.titleCount}>
        {t('results.titleCount', {
          position: position + 1,
          total: game.results?.titles.length ?? 0,
        })}
      </p>
      <h1 id={titleId} className={styles.titleName}>
        <Icon name={TITLE_ICONS[title.title]} size={18} />
        {t(`results.titles.${title.title}`)}
      </h1>
      <p className={styles.titleMeaning}>{t(`results.meanings.${title.title}`)}</p>
      <ul className={styles.winners}>
        {title.winners.map((holder) => (
          <li key={holder.playerIds.join()} className={styles.winner} data-testid="title-winner">
            <span className={styles.podium}>
              {holder.playerIds.flatMap((playerId) => {
                const player: Player | undefined = playerOf(playerId);
                return player ? (
                  <span key={playerId} className={styles.ring}>
                    <Avatar avatar={player.avatar} size="xxl" />
                  </span>
                ) : (
                  []
                );
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
            position: t('ranking.position', { position: title.winners.length + 1 }),
            names: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
              title.runnersUp.map(namesOf),
            ),
            fact: figureOf(title.runnersUp[0]!),
          })}
        </p>
      )}
    </section>
  );
}
