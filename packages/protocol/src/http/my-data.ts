import { z } from 'zod';

/**
 * GET /my-data: what the privacy screens of the settings show the caller: their code for requests
 * by email, whether they gave the game consent or withdrew it, and whether they object to
 * product analytics.
 */
export const MyDataResponseDto = z.strictObject({
  /** In three groups of four, as `K7Q4-MD2X-9PRT`. */
  requestCode: z.string(),
  gameConsent: z.enum(['given', 'withdrawn', 'pending']),
  objectsToAnalytics: z.boolean(),
});

/** POST /my-data/analytics-objection: the caller objects to product analytics, or no longer. */
export const AnalyticsObjectionRequestDto = z.strictObject({
  objects: z.boolean(),
});

/**
 * GET /first-access, the first time: where the visit came from, as the link the app opened with
 * says it. Anything else of the address is ignored.
 */
export const VisitOriginQueryDto = z.object({
  utm_source: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  ref: z.string().max(200).optional(),
});

export type MyDataResponseDto = z.infer<typeof MyDataResponseDto>;
export type AnalyticsObjectionRequestDto = z.infer<typeof AnalyticsObjectionRequestDto>;
export type VisitOriginQueryDto = z.infer<typeof VisitOriginQueryDto>;
