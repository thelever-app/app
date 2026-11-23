import { z } from 'zod';
import { LanguageDto } from '../client-messages.ts';

/**
 * POST /illegal-content-notices: anyone sends the web form, without the app. Who sends it comes
 * from their token, as anyone the app signs in without asking anything.
 */
export const IllegalContentNoticeRequestDto = z.strictObject({
  /** The link or code of the dilemma, or the room and the nickname, as the person writes it. */
  reference: z.string().trim().min(1).max(500),
  /** Why the person thinks it is illegal. */
  explanation: z.string().trim().min(1).max(2000),
  name: z.string().max(100).optional(),
  email: z.string().max(254).optional(),
  /** The language of the form, which the emails are written in. */
  language: LanguageDto,
  /** The declaration that what they say is accurate and complete; without it, no notice. */
  goodFaith: z.literal(true),
});

/** Why a player reported something, as a moderation notice says it. */
export const ModerationReasonDto = z.enum([
  'offensive',
  'confusing',
  'mistranslated',
  'impersonation',
  'illegal',
  'other',
]);

/**
 * A decision the app shows a player, only on their screen and once: on a report they made, or on
 * their nickname, with the facts in every language of the app.
 */
export const ModerationNoticeDto = z.strictObject({
  id: z.string().min(1),
  subject: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('report'),
      content: z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('dilemma'), text: z.string() }),
        z.strictObject({ kind: z.literal('nickname'), nickname: z.string() }),
      ]),
      reason: ModerationReasonDto,
      /** ISO 8601. */
      reportedAt: z.string(),
    }),
    z.strictObject({
      kind: z.literal('nickname'),
      nickname: z.string(),
      reason: ModerationReasonDto,
      facts: z.record(LanguageDto, z.string()),
    }),
  ]),
  outcome: z.enum(['withdrawn', 'kept']),
  /** The section of the terms of use. */
  rule: z.string(),
  /** ISO 8601. */
  decidedAt: z.string(),
});

/** GET /moderation-notices: the decisions the caller has not seen yet, the oldest first. */
export const ModerationNoticesResponseDto = z.strictObject({
  notices: z.array(ModerationNoticeDto),
});

export type IllegalContentNoticeRequestDto = z.infer<typeof IllegalContentNoticeRequestDto>;
export type ModerationReasonDto = z.infer<typeof ModerationReasonDto>;
export type ModerationNoticeDto = z.infer<typeof ModerationNoticeDto>;
export type ModerationNoticesResponseDto = z.infer<typeof ModerationNoticesResponseDto>;
