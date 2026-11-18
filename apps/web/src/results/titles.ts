import type { GameStateDto, TitleDto } from '@thelever-app/protocol';
import type { IconName } from '../components/icon.tsx';

export type Results = NonNullable<GameStateDto['results']>;
export type GameTitle = Results['titles'][number];
export type TitleHolder = GameTitle['winners'][number];

/** The symbol of each title, on its screen and as its badge in the ranking. */
export const TITLE_ICONS: Readonly<Record<TitleDto, IconName>> = {
  'almas-gemelas': 'favorite',
  'verso-suelto': 'callSplit',
  'la-voz-del-grupo': 'campaign',
  'iman-de-reacciones': 'addReaction',
  enigma: 'help',
  'libro-abierto': 'menuBook',
  'el-mentalista': 'psychology',
};

/** How many screens the results have: each title won, who knows you best and the ranking; the ranking alone in an anonymous room. */
export function resultsScreens(game: Pick<GameStateDto, 'results'>, anonymous: boolean): number {
  return anonymous ? 1 : (game.results?.titles.length ?? 0) + 2;
}

/** The titles each player won, in the order they are shown. */
export function titlesOf(results: Results | null, playerId: string): GameTitle[] {
  return (results?.titles ?? []).filter(({ winners }) =>
    winners.some(({ playerIds }) => playerIds.includes(playerId)),
  );
}

/** Who shares Almas gemelas with the player, if they won it. */
export function soulmatesOf(results: Results | null, playerId: string): string[] {
  const title = results?.titles.find(({ title: name }) => name === 'almas-gemelas');
  return (title?.winners ?? []).flatMap(({ playerIds }) =>
    playerIds.includes(playerId) ? playerIds.filter((other) => other !== playerId) : [],
  );
}
