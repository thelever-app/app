import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { useRoom } from '../room/room-provider.tsx';

type Player = GameStateDto['players'][number];

/** A player has finished once their progress, as the server sends it, reaches every dilemma. */
export function hasFinished(player: Player, dilemmaCount: number): boolean {
  return player.progress >= dilemmaCount;
}

/** The id of the player using the screen, as the room says. */
export function useSelfPlayerId(): string {
  return useRoom().game.playerId;
}

/** How to call each player on screen: «Tú» for the one using it, the nickname for everyone else. */
export function usePlayerName(): (player: Player) => string {
  const { t } = useTranslation();
  const selfPlayerId = useSelfPlayerId();
  return (player) => (player.playerId === selfPlayerId ? t('playerList.you') : player.nickname);
}
