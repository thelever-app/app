import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { InvitationMethod } from '../support/driver.ts';
import { SOMEONE, type GameWorld } from '../support/world.ts';

/** Test data: a valid code that no room of the scenario has, since the scenario creates none. */
const UNKNOWN_ROOM_CODE = 'ZZZZZ';

/** The name the steps give to someone who joins with a nickname another player already has. */
function namesakeOf(nickname: string): string {
  return `${nickname}, the second one`;
}

// Opening the room

Given('a device that has completed the first access', function (this: GameWorld) {
  // The first access does not exist yet: any device can join, as the room server allows today.
  this.player = SOMEONE.player;
});

Given('an existing room in the lobby', async function (this: GameWorld) {
  await this.host();
});

When(
  /^the player uses the room's (invitation link|code|QR)$/,
  async function (this: GameWorld, method: InvitationMethod) {
    await this.host();
    await this.driver.openInvitation(this.player, method);
  },
);

When('confirms a nickname', async function (this: GameWorld) {
  await this.driver.confirmNickname(this.player, this.player);
  this.inRoom.add(this.player);
});

Then('the player enters the lobby', async function (this: GameWorld) {
  assert.ok(await this.driver.isInTheLobby(this.player));
});

Then('sees who is in the room', async function (this: GameWorld) {
  const seen = (await this.driver.playersSeenBy(this.player)).map(({ nickname }) => nickname);
  assert.deepEqual(seen, [...this.inRoom]);
});

Given('a nominal room created by {string}', async function (this: GameWorld, host: string) {
  await this.hostIs(host);
  assert.equal((await this.driver.settingsSeenBy(host)).variant, 'nominal');
});

Given(
  'a room marked as adults only with {int} players',
  async function (this: GameWorld, count: number) {
    await this.driver.changeSettings(await this.host(), { adultsOnly: true });
    for (let number = 2; number <= count; number++) await this.isInTheRoom(`Player ${number}`);
  },
);

When('a player opens its invitation link', async function (this: GameWorld) {
  this.player = SOMEONE.anotherPlayer;
  await this.driver.openInvitation(this.player, 'invitation link');
});

Then(
  'the player sees that the room belongs to {string} and is nominal before entering',
  async function (this: GameWorld, host: string) {
    const preview = await this.driver.roomPreviewSeenBy(this.player);
    assert.equal(preview?.host, host);
    assert.equal(preview?.variant, 'nominal');
    assert.equal(await this.driver.isInTheRoom(this.player), false);
  },
);

Then(
  'the player sees that the room is for adults only and has {int} players before entering',
  async function (this: GameWorld, count: number) {
    const preview = await this.driver.roomPreviewSeenBy(this.player);
    assert.equal(preview?.adultsOnly, true);
    assert.equal(preview?.playerCount, count);
    assert.equal(await this.driver.isInTheRoom(this.player), false);
  },
);

Given('a player on the join screen', function (this: GameWorld) {
  this.player = SOMEONE.player;
});

When(
  'the player types the 5 characters of the code of an existing room',
  async function (this: GameWorld) {
    const code = await this.driver.roomCodeSeenBy(await this.host());
    await this.driver.typeRoomCode(this.player, code);
  },
);

Then('the player sees that room without pressing any button', async function (this: GameWorld) {
  const preview = await this.driver.roomPreviewSeenBy(this.player);
  assert.equal(preview?.host, await this.host());
});

When('a player enters a code that does not match any room', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.typeRoomCode(this.player, UNKNOWN_ROOM_CODE);
});

Then('the player is told the room does not exist', async function (this: GameWorld) {
  assert.equal(await this.driver.joinRefusalSeenBy(this.player), 'room-does-not-exist');
  assert.equal(await this.driver.roomPreviewSeenBy(this.player), undefined);
});

// Entering the room

Given('a room with {int} players', async function (this: GameWorld, count: number) {
  await this.host();
  for (let number = 2; number <= count; number++) await this.isInTheRoom(`Player ${number}`);
});

When('another player tries to join', async function (this: GameWorld) {
  this.player = SOMEONE.anotherPlayer;
  await this.driver.tryToJoinRoom(this.player);
});

Then('the player is told the room is full', async function (this: GameWorld) {
  assert.equal(await this.driver.joinRefusalSeenBy(this.player), 'room-full');
});

Then('does not enter the room', async function (this: GameWorld) {
  assert.equal(await this.driver.isInTheRoom(this.player), false);
});

Given('a player who was expelled from a room', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.isInTheRoom(this.player);
  await this.driver.expel(await this.host(), this.player);
  this.inRoom.delete(this.player);
});

When('the player tries to join that game again', async function (this: GameWorld) {
  await this.driver.tryToJoinRoom(this.player);
});

Then('the player does not enter the room', async function (this: GameWorld) {
  assert.equal(await this.driver.isInTheRoom(this.player), false);
});

// Avatars and nicknames

Given('a room where some avatars are already taken', async function (this: GameWorld) {
  await this.isInTheRoom('Luis');
  await this.isInTheRoom('Marta');
});

When('a player joins the room', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.isInTheRoom(this.player);
});

Then(
  'the player gets a random avatar that nobody else in the room has',
  async function (this: GameWorld) {
    const seen = await this.driver.playersSeenBy(this.player);
    const own = seen.find(({ nickname }) => nickname === this.player)?.avatar;
    assert.ok(own, `${this.player} has no avatar`);
    const others = seen.filter(({ nickname }) => nickname !== this.player);
    assert.ok(others.length > 0, 'nobody else is in the room');
    assert.ok(
      others.every(({ avatar }) => avatar !== own),
      'someone else has the same avatar',
    );
  },
);

Given('a player in the lobby', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.isInTheRoom(this.player);
});

When(
  'the player chooses another avatar that nobody else in the room has',
  async function (this: GameWorld) {
    const before = await this.driver.playersSeenBy(this.player);
    this.avatar = await this.driver.chooseAnotherFreeAvatar(this.player);
    assert.ok(
      before.every(({ avatar }) => avatar !== this.avatar),
      'the avatar was not free',
    );
  },
);

Then('everyone in the lobby sees the new avatar', async function (this: GameWorld) {
  for (const viewer of this.inRoom) {
    const seen = await this.driver.playersSeenBy(viewer);
    const avatar = seen.find(({ nickname }) => nickname === this.player)?.avatar;
    assert.equal(avatar, this.avatar, `${viewer} does not see the new avatar`);
  }
});

Given('a lobby with a player called {string}', async function (this: GameWorld, nickname: string) {
  await this.isInTheRoom(nickname);
});

When('another player joins as {string}', async function (this: GameWorld, nickname: string) {
  this.viewers = [nickname, namesakeOf(nickname)];
  await this.isInTheRoom(namesakeOf(nickname), nickname);
});

Then('both players are in the room', async function (this: GameWorld) {
  assert.equal(this.viewers.length, 2, 'no step said who the two players are');
  for (const player of this.viewers) {
    assert.ok(await this.driver.isInTheRoom(player), `${player} is not in the room`);
  }
});

Then('each one is distinguished by their avatar', async function (this: GameWorld) {
  const [first] = this.viewers;
  assert.ok(first, 'no step said who the two players are');
  const namesakes = (await this.driver.playersSeenBy(await this.host())).filter(
    ({ nickname }) => nickname === first,
  );
  assert.equal(namesakes.length, 2);
  assert.notEqual(namesakes[0]?.avatar, namesakes[1]?.avatar);
});

// Dilemmas added by the players

When(
  '{string} searches the catalog to add a dilemma',
  async function (this: GameWorld, player: string) {
    await this.isInTheRoom(player);
    this.dilemmas = await this.driver.searchDilemmas(player);
  },
);

Then('only dilemmas suitable for players from 16 are offered', function (this: GameWorld) {
  assert.ok(this.dilemmas.length > 0, 'the search offers nothing');
  for (const dilemmaId of this.dilemmas) {
    assert.equal(this.driver.catalogEntryOf(dilemmaId).minimumAge, 16);
  }
});

Given(
  /^"([^"]*)" has (?:already )?added a dilemma$/,
  async function (this: GameWorld, player: string) {
    await this.driver.changeSettings(await this.host(), { playersCanAddDilemmas: true });
    await this.isInTheRoom(player);
    await this.driver.addDilemma(player);
  },
);

When('{string} tries to add another one', async function (this: GameWorld, player: string) {
  this.accepted = await this.driver.tryToAddAnotherDilemma(player);
});

Then('the second dilemma is not added', async function (this: GameWorld) {
  assert.equal(this.accepted, false);
  assert.equal((await this.driver.addedDilemmasSeenBy(await this.host())).length, 1);
});

Then('no player in the lobby sees who added it', async function (this: GameWorld) {
  assert.ok((await this.driver.addedDilemmasSeenBy(await this.host())).length > 0, 'none added');
  for (const viewer of this.inRoom) {
    assert.deepEqual(await this.driver.authorsOfAddedDilemmasSeenBy(viewer), [], viewer);
  }
});
