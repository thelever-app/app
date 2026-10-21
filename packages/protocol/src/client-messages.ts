import { z } from 'zod';

/**
 * The player answers a dilemma, or changes an answer they already gave.
 * Who answers and in which game come from the connection, never from the message.
 */
export const AnswerDilemmaDto = z.strictObject({
  type: z.literal('answer-dilemma'),
  dilemmaId: z.string().min(1),
  vote: z.string().min(1),
});

/** Every message a player sends to the room server. */
export const ClientMessageDto = z.discriminatedUnion('type', [AnswerDilemmaDto]);

export type AnswerDilemmaDto = z.infer<typeof AnswerDilemmaDto>;
export type ClientMessageDto = z.infer<typeof ClientMessageDto>;
