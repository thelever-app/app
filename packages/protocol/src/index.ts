/**
 * @thelever-app/protocol
 *
 * Versioned client-server messages. Each one is a Zod schema, to validate at runtime
 * what arrives from the network, and the type inferred from it, both with the `Dto` suffix.
 */
export { GameStateDto, ProgressUpdatedDto, ServerMessageDto } from './server-messages.ts';
export { AnswerDilemmaDto, ClientMessageDto } from './client-messages.ts';
