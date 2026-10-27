import { z } from 'zod';

/** The version of this contract. Client and server agree on it once, when the connection opens. */
export const CONTRACT_VERSION = 1;

/** The languages a player can read the dilemmas in. */
export const LanguageDto = z.enum(['es', 'en', 'fr', 'de', 'it', 'pt', 'ca']);

/**
 * The first message on every connection, and again after each reconnection.
 * Nothing travels in the URL, so the token never ends up in the request logs.
 */
export const ConnectDto = z.strictObject({
  type: z.literal('connect'),
  contractVersion: z.number().int().positive(),
  /** The Firebase ID token of the player. The server takes the player from it. */
  token: z.string().min(1),
  gameId: z.string().min(1),
  language: LanguageDto,
});

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
export const ClientMessageDto = z.discriminatedUnion('type', [ConnectDto, AnswerDilemmaDto]);

/** The type of every message a player sends, so the server can say which one it rejected. */
export const ClientMessageTypeDto = z.enum(['connect', 'answer-dilemma']);

export type LanguageDto = z.infer<typeof LanguageDto>;
export type ConnectDto = z.infer<typeof ConnectDto>;
export type AnswerDilemmaDto = z.infer<typeof AnswerDilemmaDto>;
export type ClientMessageDto = z.infer<typeof ClientMessageDto>;
export type ClientMessageTypeDto = z.infer<typeof ClientMessageTypeDto>;
