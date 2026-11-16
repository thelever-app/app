import { z } from 'zod';
import { CategoryDto, LanguageDto } from '../client-messages.ts';

/**
 * GET /dilemmas/:publicId: what the screen to play a dilemma with the group shows of it, from the
 * public id a link carries; with the id of the dilemma, which the room is created with.
 */
export const DilemmaPreviewResponseDto = z.strictObject({
  dilemmaId: z.string().min(1),
  name: z.string().min(1).optional(),
  category: CategoryDto,
  optionCount: z.number().int().min(2).max(4),
  minimumAge: z.union([z.literal(16), z.literal(18)]),
  /** The language of the dilemma, which the room plays its dilemmas in. */
  language: LanguageDto,
});

export type DilemmaPreviewResponseDto = z.infer<typeof DilemmaPreviewResponseDto>;
