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

/** Who hosts the room: who created it, before the game; once it has ended, who the players see. */
Given('{string} is the host', async function (this: GameWorld, player: string) {
  if (!this.ended) {
    await this.hostIs(player);
    return;
  }
  for (const viewer of this.present()) {
    assert.equal(await this.driver.hostSeenBy(viewer), player, `${viewer} sees another host`);
  }
});

/** The game is played to its end at the first When or Then, once the Givens have set it up. */
Given('the game has ended', function (this: GameWorld) {
  this.dilemmaCount ??= 3;
  this.requestEnd();
});

Then(
  '{string} and {string} see at the end of the game that they are still in the room',
  async function (this: GameWorld, first: string, second: string) {
    this.viewers = [first, second];
    for (const viewer of this.viewers) {
      const end = await this.driver.endOfTheGameSeenBy(viewer);
      assert.ok(end, `${viewer} does not see the end of the game`);
      for (const player of [first, second]) {
        assert.ok(end.stillInTheRoom.includes(player), `${viewer} does not see ${player}`);
      }
    }
  },
);

Then('that {string} has left', async function (this: GameWorld, player: string) {
  for (const viewer of this.viewers) {
    const end = await this.driver.endOfTheGameSeenBy(viewer);
    assert.ok(end, `${viewer} does not see the end of the game`);
    assert.ok(end.gone.includes(player), `${viewer} does not see that ${player} has left`);
    assert.ok(!end.stillInTheRoom.includes(player), `${viewer} still sees ${player}`);
  }
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
    await this.endIfRequested();
    for (const player of this.present()) {
      await this.driver.disconnect(player);
      this.away.add(player);
    }
    await this.driver.letTimePass(minutes * MINUTE);
  },
);

Given('every player is still connected', async function (this: GameWorld) {
  await this.endIfRequested();
  assert.deepEqual(this.present(), [...this.inRoom]);
});

Given(
  'nobody has done anything in the room for {int} minutes',
  async function (this: GameWorld, minutes: number) {
    await this.endIfRequested();
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
