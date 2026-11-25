import { z } from 'zod';
import { CategoryDto, LanguageDto } from '../client-messages.ts';

/**
 * The query of GET /dilemmas/:publicId: `for=room` asks for it to start a room with, which may be a
 * dilemma for adults; without it, to vote it alone, as the public web shows them.
 */
export const DilemmaPreviewQueryDto = z.strictObject({ for: z.literal('room').optional() });

/**
 * GET /dilemmas/:publicId: what the screens to play a dilemma with the group and to vote it alone
 * show of it, from the
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
  /** As it reads, to vote it alone, with the gap "someone in the group" as Dilemmas keeps it. */
  text: z.string().min(1),
  options: z
    .array(z.strictObject({ optionId: z.string().min(1), text: z.string().min(1) }))
    .min(2)
    .max(4),
  /** The version of the original its votes alone count for, which a new version starts again. */
  version: z.number().int().min(1),
});

export type DilemmaPreviewQueryDto = z.infer<typeof DilemmaPreviewQueryDto>;
export type DilemmaPreviewResponseDto = z.infer<typeof DilemmaPreviewResponseDto>;
