import { z } from 'zod';

/** POST /dilemmas/:publicId/vote: the option the caller votes alone, of the dilemma in that language. */
export const VoteAloneRequestDto = z.strictObject({ optionId: z.string().min(1) });

export type VoteAloneRequestDto = z.infer<typeof VoteAloneRequestDto>;

/**
 * GET /dilemmas/:publicId/world-result?option=…&prediction=…: the option the device voted and the
 * share of the world it predicted voted the same, which it keeps and sends; neither is kept.
 */
export const WorldResultQueryDto = z.strictObject({
  option: z.string().min(1),
  prediction: z.coerce.number().int().min(0).max(100),
});

export type WorldResultQueryDto = z.infer<typeof WorldResultQueryDto>;

const Percentage = z.number().int().min(0).max(100);

/** How the world voted the dilemma, as published once a day; no figures below 20 answers. */
export const WorldResultResponseDto = z.discriminatedUnion('shown', [
  z.strictObject({
    shown: z.literal(false),
    answers: z.number().int().min(0),
    /** The answers it needs to show its figures. */
    needed: z.number().int().min(1),
  }),
  z.strictObject({
    shown: z.literal(true),
    answers: z.number().int().min(20),
    options: z
      .array(z.strictObject({ optionId: z.string().min(1), percentage: Percentage }))
      .min(2)
      .max(4),
    yours: z.strictObject({ percentage: Percentage, predictionOff: Percentage }),
  }),
]);

export type WorldResultResponseDto = z.infer<typeof WorldResultResponseDto>;
