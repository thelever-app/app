import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';

type Player = GameStateDto['players'][number];

/** A player has finished once their progress, as the server sends it, reaches every dilemma. */
export function hasFinished(player: Player, dilemmaCount: number): boolean {
  return player.progress >= dilemmaCount;
}

/** How to call each player on screen: «Tú» for the one using it, the nickname for everyone else. */
export function usePlayerName(selfPlayerId: string): (player: Player) => string {
  const { t } = useTranslation();
  return (player) => (player.playerId === selfPlayerId ? t('playerList.you') : player.nickname);
}
