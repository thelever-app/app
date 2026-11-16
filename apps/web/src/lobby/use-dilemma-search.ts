import type { SearchDilemmasResponseDto } from '@thelever-app/protocol';
import { useEffect, useState } from 'react';
import { useRoomApi } from '../room/room-api-context.tsx';
import type { Category } from './categories.ts';

export type FoundDilemma = SearchDilemmasResponseDto['dilemmas'][number];

export interface DilemmaCriteria {
  readonly category?: Category | undefined;
  /** As the player types it: looked for in the text and the tags of each dilemma. */
  readonly text: string;
}

/**
 * What the search shows. While it searches again, the dilemmas it found last stay on screen, so
 * the list does not empty and fill at every key. Once found, `more` asks for the next page, if
 * there is one, and adds it below; `moreFailed` says the last time it could not.
 */
export type DilemmaSearch =
  | {
      readonly status: 'searching';
      readonly dilemmas: readonly FoundDilemma[];
    }
  | {
      readonly status: 'found';
      readonly dilemmas: readonly FoundDilemma[];
      readonly more: (() => void) | undefined;
      readonly loadingMore: boolean;
      readonly moreFailed: boolean;
    }
  | { readonly status: 'failed' };

/** How long the player has to stop typing before the search goes out. */
export const TYPING_PAUSE_MS = 300;

/** What the search answered for a request, page after page. */
type Answer =
  | {
      readonly request: string;
      readonly status: 'found';
      readonly dilemmas: readonly FoundDilemma[];
      readonly next: string | undefined;
      readonly loadingMore: boolean;
      readonly moreFailed: boolean;
    }
  | { readonly request: string; readonly status: 'failed' };

/**
 * The dilemmas of the catalog that suit the room, searched again whenever the criteria change: a
 * category at once, what the player types once they stop typing; twenty at a time, the next ones
 * when the player asks for them. The server decides what suits the room and in which order; the
 * screen only shows what it answers.
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
  const [answer, setAnswer] = useState<Answer>();

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
        ({ dilemmas, next }) => {
          if (!current) return;
          setAnswer({
            request,
            status: 'found',
            dilemmas,
            next,
            loadingMore: false,
            moreFailed: false,
          });
        },
        () => {
          if (current) setAnswer({ request, status: 'failed' });
        },
      );
    return () => {
      current = false;
    };
  }, [api, roomId, category, settled, request]);

  if (answer?.request !== request) {
    const before = answer?.status === 'found' ? answer.dilemmas : [];
    return { status: 'searching', dilemmas: before };
  }
  if (answer.status === 'failed') return { status: 'failed' };

  const { dilemmas, next, loadingMore, moreFailed } = answer;
  const more =
    next === undefined
      ? undefined
      : () => {
          if (loadingMore) return;
          // Only onto the answer it continues: a new search in the meantime drops it.
          const onto = (change: (found: Extract<Answer, { status: 'found' }>) => Answer) =>
            setAnswer((latest) =>
              latest?.request === request && latest.status === 'found' && latest.next === next
                ? change(latest)
                : latest,
            );
          onto((found) => ({ ...found, loadingMore: true, moreFailed: false }));
          api
            .searchDilemmas(roomId, {
              ...(category && { category }),
              ...(settled && { q: settled }),
              after: next,
            })
            .then(
              (page) =>
                onto((found) => ({
                  ...found,
                  dilemmas: [...found.dilemmas, ...page.dilemmas],
                  next: page.next,
                  loadingMore: false,
                })),
              () => onto((found) => ({ ...found, loadingMore: false, moreFailed: true })),
            );
        };
  return { status: 'found', dilemmas, more, loadingMore, moreFailed };
}
