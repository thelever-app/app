import type { SearchDilemmasResponseDto } from '@thelever-app/protocol';
import { useEffect, useState } from 'react';
import { useRoomApi } from '../room/room-api-context.tsx';

export type FoundDilemma = SearchDilemmasResponseDto['dilemmas'][number];

export interface DilemmaCriteria {
  readonly category?: string | undefined;
  /** As the player types them, separated by spaces or commas. */
  readonly tags: string;
}

export type DilemmaSearch =
  | { readonly status: 'searching' }
  | { readonly status: 'found'; readonly dilemmas: readonly FoundDilemma[] }
  | { readonly status: 'failed' };

/** The tags as the catalog keeps them: lower case, without the # a player may type. */
function tagsOf(typed: string): string[] {
  return typed
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}

/**
 * The dilemmas of the catalog that suit the room, searched again whenever the criteria change.
 * The server decides what suits the room; the screen only shows what it answers.
 */
export function useDilemmaSearch(
  roomId: string,
  { category, tags }: DilemmaCriteria,
): DilemmaSearch {
  const api = useRoomApi();
  const tagList = tagsOf(tags).join(',');
  const request = `${roomId}|${category ?? ''}|${tagList}`;
  // Each answer keeps the search it answers: while the last one answers another, it is searching.
  const [answer, setAnswer] = useState<{
    readonly request: string;
    readonly search: DilemmaSearch;
  }>();

  useEffect(() => {
    // A slower answer to an older search must not replace the newer one.
    let current = true;
    api
      .searchDilemmas(roomId, {
        ...(category && { category }),
        ...(tagList && { tags: tagList.split(',') }),
      })
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
  }, [api, roomId, category, tagList, request]);

  return answer?.request === request ? answer.search : { status: 'searching' };
}
