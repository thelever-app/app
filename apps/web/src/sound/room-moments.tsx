import { useEffect, useRef } from 'react';
import { useSecondsLeft } from '../game/remaining-time.ts';
import { useRoom } from '../room/room-provider.tsx';
import { momentsBetween, remembered, type RoomSnapshot } from './moments.ts';
import { useSoundEffects } from './sound-context.tsx';

/**
 * Plays the moments of the game as the room changes on screen. It remembers what the room looked
 * like at the last render, never shown, so nothing plays when the screen opens or draws again
 * without a change, and each moment plays once, also when React runs the effect twice.
 */
export function RoomMoments() {
  const { lobby, game } = useRoom();
  const secondsLeft = useSecondsLeft(game);
  const { play } = useSoundEffects();
  const now: RoomSnapshot = { lobby, game, secondsLeft };
  const before = useRef(now);

  useEffect(() => {
    for (const moment of momentsBetween(before.current, now)) play(moment);
    before.current = remembered(before.current, now);
  });

  return null;
}
