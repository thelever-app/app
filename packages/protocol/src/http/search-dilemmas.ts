import { z } from 'zod';
import { CategoryDto } from '../client-messages.ts';

/**
 * GET /rooms/:roomId/dilemmas?category=…&q=…&after=…: the dilemmas of the catalog that suit the
 * room, twenty at a time, to pick or add one; with a text, looked for in the text and the tags, the
 * best matches first. `after` is the `next` of the page before. Only a player of the room may ask.
 */
export const SearchDilemmasQueryDto = z.strictObject({
  category: CategoryDto.optional(),
  q: z.string().min(1).max(100).optional(),
  after: z.string().min(1).max(500).optional(),
});

export const SearchDilemmasResponseDto = z.strictObject({
  dilemmas: z.array(
    z.strictObject({
      dilemmaId: z.string().min(1),
      text: z.string().min(1),
      minimumAge: z.union([z.literal(16), z.literal(18)]),
      category: CategoryDto,
      tags: z.array(z.string().min(1)),
      optionCount: z.number().int().min(2).max(4),
    }),
  ),
  /** Where the next page starts; none when this one is the last. */
  next: z.string().min(1).optional(),
});

export type SearchDilemmasQueryDto = z.infer<typeof SearchDilemmasQueryDto>;
export type SearchDilemmasResponseDto = z.infer<typeof SearchDilemmasResponseDto>;
