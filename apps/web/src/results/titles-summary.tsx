import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { usePlayerName } from '../components/players.ts';
import { TITLE_ICONS } from './titles.ts';
import styles from './end-screen.module.css';

/** Every title of the game, in its order, with its symbol and who won it, all of them on a tie. */
export function TitlesSummary({
  game,
  labelledBy,
}: {
  readonly game: GameStateDto;
  /** The id of the heading that names the list. */
  readonly labelledBy: string;
}) {
  const { t, i18n } = useTranslation();
  const nameOf = usePlayerName();
  const list = (names: readonly string[]) =>
    new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(names);
  const winnersOf = (playerIds: readonly string[]) =>
    playerIds.flatMap((playerId) =>
      game.players.filter((player) => player.playerId === playerId).map(nameOf),
    );

  return (
    <ul className={styles.titles} aria-labelledby={labelledBy}>
      {(game.results?.titles ?? []).map(({ title, winners }) => (
        <li key={title} className={styles.titleRow}>
          <span className={styles.titleSign}>
            <Icon name={TITLE_ICONS[title]} size={18} />
          </span>
          <span className={styles.titleName}>{t(`results.titles.${title}`)}</span>
          <span className={styles.titleWinners}>
            {list(winners.map(({ playerIds }) => list(winnersOf(playerIds))))}
          </span>
        </li>
      ))}
    </ul>
  );
}
