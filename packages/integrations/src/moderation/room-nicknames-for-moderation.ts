import type { WithdrawNickname } from '@thelever-app/game/published';
import type { ModeratedNicknames } from '@thelever-app/moderation';

/**
 * The anticorruption layer between Moderation and Game: a nickname the team withdraws leaves
 * every room where that player goes by it.
 */
export class RoomNicknamesForModeration implements ModeratedNicknames {
  readonly #withdrawNickname: WithdrawNickname;

  constructor(withdrawNickname: WithdrawNickname) {
    this.#withdrawNickname = withdrawNickname;
  }

  async withdraw(owner: string, nickname: string): Promise<void> {
    await this.#withdrawNickname.execute({ identity: owner, nickname });
  }
}
