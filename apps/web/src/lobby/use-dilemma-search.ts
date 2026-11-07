import type { SearchDilemmasResponseDto } from '@thelever-app/protocol';
import { useEffect, useState } from 'react';
import { useRoomApi } from '../room/room-api-context.tsx';

export type FoundDilemma = SearchDilemmasResponseDto['dilemmas'][number];

export interface DilemmaCriteria {
  readonly category?: string | undefined;
  /** As the player types it: looked for in the text and the tags of each dilemma. */
  readonly text: string;
}

/**
 * What the search shows. While it searches again, the dilemmas it found last stay on screen, so
 * the list does not empty and fill at every key.
 */
export type DilemmaSearch =
  | {
      readonly status: 'searching' | 'found';
      readonly dilemmas: readonly FoundDilemma[];
    }
  | { readonly status: 'failed' };

/** How long the player has to stop typing before the search goes out. */
export const TYPING_PAUSE_MS = 300;

/**
 * The dilemmas of the catalog that suit the room, searched again whenever the criteria change: a
 * category at once, what the player types once they stop typing. The server decides what suits
 * the room and in which order; the screen only shows what it answers.
 */
export function useDilemmaSearch(
  roomId: string,
  { category, text }: DilemmaCriteria,
): DilemmaSearch {
  const api = useRoomApi();
  const typed = text.trim();
  // What the player had typed when they last stopped typing.
  const [settled, setSettled] = useState(typed);
  const request = `${roomId}|${category ?? ''}|${settled}`;
  // Each answer keeps the search it answers: while the last one answers another, it is searching.
  const [answer, setAnswer] = useState<{
    readonly request: string;
    readonly search: DilemmaSearch;
  }>();

  useEffect(() => {
    if (typed === settled) return;
    const pause = setTimeout(() => setSettled(typed), TYPING_PAUSE_MS);
    return () => clearTimeout(pause);
  }, [typed, settled]);

  useEffect(() => {
    // A slower answer to an older search must not replace the newer one.
    let current = true;
    api
      .searchDilemmas(roomId, { ...(category && { category }), ...(settled && { q: settled }) })
      .then(
        (dilemmas) => {
          if (current) setAnswer({ request, search: { status: 'found', dilemmas } });
        },
        () => {
          if (current) setAnswer({ request, search: { status: 'failed' } });
        },
      );
    return () => {
      current = false;
    };
  }, [api, roomId, category, settled, request]);

  if (answer?.request === request) return answer.search;
  const before = answer?.search.status === 'found' ? answer.search.dilemmas : [];
  return { status: 'searching', dilemmas: before };
}
