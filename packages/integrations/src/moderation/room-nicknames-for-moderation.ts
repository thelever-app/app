import type { FindNicknameOfReference, WithdrawNickname } from '@thelever-app/game/published';
import type { ModeratedNicknames } from '@thelever-app/moderation';

/**
 * The anticorruption layer between Moderation and Game: the nickname a notice of the web form
 * points to by its room, and a nickname the team withdraws leaves every room where that player
 * goes by it.
 */
export class RoomNicknamesForModeration implements ModeratedNicknames {
  readonly #findNicknameOfReference: FindNicknameOfReference;
  readonly #withdrawNickname: WithdrawNickname;

  constructor(ports: {
    readonly findNicknameOfReference: FindNicknameOfReference;
    readonly withdrawNickname: WithdrawNickname;
  }) {
    this.#findNicknameOfReference = ports.findNicknameOfReference;
    this.#withdrawNickname = ports.withdrawNickname;
  }

  async nicknameOf(
    reference: string,
  ): Promise<{ readonly nickname: string; readonly owner: string } | null> {
    return this.#findNicknameOfReference.execute(reference);
  }

  async withdraw(owner: string, nickname: string): Promise<void> {
    await this.#withdrawNickname.execute({ identity: owner, nickname });
  }
}
