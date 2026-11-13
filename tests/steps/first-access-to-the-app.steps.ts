import { Given, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { SOMEONE, type GameWorld } from '../support/world.ts';

const HOUR = 60 * 60;

// The deletion of the game data

Given(
  'a room where the player played closed {int} hours ago',
  async function (this: GameWorld, hours: number) {
    this.player = SOMEONE.player;
    await this.isInTheRoom(this.player);
    this.requestGame();
    // Votes, vote predictions and points: the reveal of a round has them all.
    await this.toRevealOf(1);
    for (const player of this.present()) {
      await this.driver.leave(player);
      this.away.add(player);
    }
    await this.driver.letTimePass(hours * HOUR);
    await this.driver.deleteClosedRooms();
  },
);

Then(
  'no vote, prediction, reaction or point of any player from that game is kept',
  async function (this: GameWorld) {
    assert.equal(await this.driver.isGameDataKept(), false);
  },
);
