/**
 * @thelever-app/game/published
 *
 * The published language of the Game context: all another context may use of it (ADR 0001).
 * Plain data and the interfaces of its commands; its domain stays inside.
 */
export type {
  WithdrawNickname,
  WithdrawNicknameInput,
} from './application/use-cases/withdraw-nickname.use-case.ts';
export type {
  FindNicknameOfReference,
  NicknameOfReference,
} from './application/use-cases/find-nickname-of-reference.use-case.ts';
export type { EraseGameData } from './application/use-cases/erase-game-data.use-case.ts';
export type {
  ExportLikes,
  ForgetLikes,
  LikeData,
} from './application/use-cases/likes-personal-data.use-case.ts';
