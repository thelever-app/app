import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { useRoom } from '../room/room-provider.tsx';

type Player = GameStateDto['players'][number];

/** Whether the player answered the dilemma of the round, as the server sends it; never known in an anonymous room. */
export function hasAnswered(player: Player): boolean {
  return player.answered === true;
}

/** Whether the game is of an anonymous room, which never tells who answered, only how many. */
export function isAnonymous(game: Pick<GameStateDto, 'players'>): boolean {
  return game.players.some(({ answered }) => answered === null);
}

/** How many of those still in the game have not answered the dilemma of the round yet. */
export function pendingCountOf(game: Pick<GameStateDto, 'players' | 'answeredCount'>): number {
  const inGame = game.players.filter(({ left }) => !left).length;
  return Math.max(0, inGame - game.answeredCount);
}

/** The id of the player using the screen, as the room says, in the lobby or in the game. */
export function useSelfPlayerId(): string {
  const { lobby, game } = useRoom();
  const playerId = game?.playerId ?? lobby?.playerId;
  if (playerId === undefined) throw new Error('useSelfPlayerId needs the lobby or the game');
  return playerId;
}

/** How to call each player on screen: «Ana (tú)» for the one using it, the nickname for everyone else. */
export function usePlayerName(): (player: Pick<Player, 'playerId' | 'nickname'>) => string {
  const { t } = useTranslation();
  const selfPlayerId = useSelfPlayerId();
  return (player) =>
    player.playerId === selfPlayerId
      ? t('playerList.you', { name: player.nickname })
      : player.nickname;
}
