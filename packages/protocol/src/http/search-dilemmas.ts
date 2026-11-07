import { z } from 'zod';

/**
 * GET /rooms/:roomId/dilemmas?category=…&q=…: the dilemmas of the catalog that suit the room, to
 * pick or add one; with a text, looked for in the text and the tags, the best matches first. Only
 * a player of the room may ask.
 */
export const SearchDilemmasQueryDto = z.strictObject({
  category: z.string().min(1).optional(),
  q: z.string().min(1).max(100).optional(),
});

export const SearchDilemmasResponseDto = z.strictObject({
  dilemmas: z.array(
    z.strictObject({
      dilemmaId: z.string().min(1),
      text: z.string().min(1),
      minimumAge: z.union([z.literal(16), z.literal(18)]),
      category: z.string().min(1),
      tags: z.array(z.string().min(1)),
    }),
  ),
});

export type SearchDilemmasQueryDto = z.infer<typeof SearchDilemmasQueryDto>;
export type SearchDilemmasResponseDto = z.infer<typeof SearchDilemmasResponseDto>;
