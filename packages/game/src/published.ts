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
