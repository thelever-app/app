import { z } from 'zod';

/** Where the device is, as the first access keeps it: never its address. */
export const RegionDto = z.enum(['eea', 'rest-of-world', 'blocked']);

/** The legal documents the first access asks for, in the order it asks for them. */
export const LegalDocumentDto = z.enum(['terms-of-use', 'game-consent']);

/**
 * GET /first-access, POST /first-access/age and POST /first-access/documents: where the first
 * access of whoever calls is. The first GET begins it, in the region of the address of the call.
 */
export const FirstAccessResponseDto = z.strictObject({
  region: RegionDto,
  /** Stopped in a blocked country or under the minimum age, waiting for the age or the documents, or done. */
  step: z.enum(['blocked-country', 'age', 'under-minimum-age', 'documents', 'done']),
  /** Still to accept, in the order they are asked for. */
  pending: z.array(LegalDocumentDto),
  /** Of those, the ones accepted before in a version that is no longer enough. */
  changed: z.array(LegalDocumentDto),
  /** The version of each document to show and accept. */
  current: z.strictObject({
    'terms-of-use': z.number().int().nonnegative(),
    'game-consent': z.number().int().nonnegative(),
  }),
  underEighteen: z.boolean(),
});

/** POST /first-access/age: once and for good; the month only of who may be under 18. */
export const DeclareAgeRequestDto = z.strictObject({
  birthYear: z.number().int(),
  birthMonth: z.number().int().min(1).max(12).optional(),
});

/** POST /first-access/documents: the version of the document the app showed. */
export const AcceptDocumentRequestDto = z.strictObject({
  document: LegalDocumentDto,
  version: z.number().int().positive(),
});

export type RegionDto = z.infer<typeof RegionDto>;
export type LegalDocumentDto = z.infer<typeof LegalDocumentDto>;
export type FirstAccessResponseDto = z.infer<typeof FirstAccessResponseDto>;
export type DeclareAgeRequestDto = z.infer<typeof DeclareAgeRequestDto>;
export type AcceptDocumentRequestDto = z.infer<typeof AcceptDocumentRequestDto>;
