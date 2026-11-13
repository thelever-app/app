import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { SOMEONE, type GameWorld } from '../support/world.ts';

const MINUTE = 60;

// The room

Given(
  'a room with players {string}, {string} and {string}',
  async function (this: GameWorld, first: string, second: string, third: string) {
    await this.hostIs(first);
    for (const guest of [second, third]) await this.isInTheRoom(guest);
    this.requestGame();
  },
);

Given('{string} is the host', async function (this: GameWorld, player: string) {
  await this.hostIs(player);
});

// The end of the game does not exist yet: the game goes as far as there is, the reveal of its last round.
Given('the game has ended', async function (this: GameWorld) {
  await this.game();
  await this.toRevealOf((await this.driver.dilemmasOfTheGame()).length);
});

// Closing the room

When('every player has left the room', async function (this: GameWorld) {
  for (const player of this.present()) {
    await this.driver.leave(player);
    this.away.add(player);
  }
});

Given(
  'no player has been connected to the room for {int} minutes',
  async function (this: GameWorld, minutes: number) {
    for (const player of this.present()) {
      await this.driver.disconnect(player);
      this.away.add(player);
    }
    await this.driver.letTimePass(minutes * MINUTE);
  },
);

Given('every player is still connected', function (this: GameWorld) {
  assert.deepEqual(this.present(), [...this.inRoom]);
});

Given(
  'nobody has done anything in the room for {int} minutes',
  async function (this: GameWorld, minutes: number) {
    await this.driver.letTimePass(minutes * MINUTE);
  },
);

Then('the room closes', async function (this: GameWorld) {
  for (const player of this.inRoom) {
    assert.equal(await this.driver.tryToReconnect(player), false, `${player} got back in`);
  }
});

Then('its invitation link no longer lets anyone in', async function (this: GameWorld) {
  await this.driver.openInvitation(SOMEONE.anotherPlayer, 'invitation link');
  assert.equal(await this.driver.joinRefusalSeenBy(SOMEONE.anotherPlayer), 'room-does-not-exist');
});

Then('the room is still open', async function (this: GameWorld) {
  await this.driver.openInvitation(SOMEONE.anotherPlayer, 'invitation link');
  assert.equal(
    (await this.driver.roomPreviewSeenBy(SOMEONE.anotherPlayer))?.host,
    await this.host(),
  );
  for (const player of this.inRoom) {
    assert.equal(await this.driver.tryToReconnect(player), true, `${player} could not get back in`);
  }
});
