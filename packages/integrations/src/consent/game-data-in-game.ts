import type { GameData } from '@thelever-app/consent';
import type { EraseGameData } from '@thelever-app/game/published';

/** The game data of Consent are the rooms and games of Game. */
export class GameDataInGame implements GameData {
  readonly #eraseGameData: EraseGameData;

  constructor(eraseGameData: EraseGameData) {
    this.#eraseGameData = eraseGameData;
  }

  async erase(identity: string): Promise<void> {
    await this.#eraseGameData.execute(identity);
  }
}
