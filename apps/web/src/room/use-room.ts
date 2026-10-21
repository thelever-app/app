import { useEffect, useReducer, useCallback } from 'react';
import { roomReducer } from './room-reducer.ts';
import { useRoomConnection } from './room-context.tsx';

export function useRoom() {
  const connection = useRoomConnection();
  const [game, dispatch] = useReducer(roomReducer, undefined);

  useEffect(() => connection.subscribe(dispatch), [connection]);

  const answerDilemma = useCallback(
    (dilemmaId: string, vote: string) => {
      connection.send({ type: 'answer-dilemma', dilemmaId, vote });
    },
    [connection],
  );

  return { game, answerDilemma };
}
