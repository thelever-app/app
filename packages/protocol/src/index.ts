/**
 * @thelever-app/protocol
 *
 * Versioned client-server messages. Each one is a Zod schema, to validate at runtime
 * what arrives from the network, and the type inferred from it, both with the `Dto` suffix.
 */
export {
  ConnectionChangedDto,
  ErrorCodeDto,
  ErrorDto,
  GameStateDto,
  ProgressUpdatedDto,
  ServerMessageDto,
} from './server-messages.ts';
export {
  AnswerDilemmaDto,
  ClientMessageDto,
  ClientMessageTypeDto,
  CONTRACT_VERSION,
  ConnectDto,
  LanguageDto,
} from './client-messages.ts';
