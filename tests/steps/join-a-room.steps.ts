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

Given('a player who last played as {string}', async function (this: GameWorld, nickname: string) {
  this.player = SOMEONE.anotherPlayer;
  await this.driver.lastPlayedAs(this.player, nickname);
});

When('the player opens an invitation link', async function (this: GameWorld) {
  await this.host();
  await this.driver.openInvitation(this.player, 'invitation link');
});

Then('the nickname field shows {string}', async function (this: GameWorld, nickname: string) {
  assert.equal(await this.driver.nicknameFieldSeenBy(this.player), nickname);
});

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

Given(
  'a room with {string} and {string}',
  async function (this: GameWorld, host: string, guest: string) {
    await this.hostIs(host);
    await this.isInTheRoom(guest);
  },
);

Then(
  'the player sees the avatars of {string} and {string} before entering',
  async function (this: GameWorld, first: string, second: string) {
    const inside = await this.driver.playersSeenBy(await this.host());
    const avatarOf = (nickname: string) =>
      inside.find((seen) => seen.nickname === nickname)?.avatar;
    const preview = await this.driver.roomPreviewSeenBy(this.player);
    assert.deepEqual(preview?.avatars, [avatarOf(first), avatarOf(second)]);
    assert.equal(await this.driver.isInTheRoom(this.player), false);
  },
);

Given('a room where some avatars are already taken', async function (this: GameWorld) {
  await this.isInTheRoom('Luis');
  await this.isInTheRoom('Marta');
});

Then(
  'the player sees a random avatar that nobody in the room has',
  async function (this: GameWorld) {
    this.avatar = await this.driver.avatarSeenBy(this.player);
    const inside = await this.driver.playersSeenBy(await this.host());
    assert.ok(inside.length > 1, 'nobody else is in the room');
    assert.ok(
      inside.every(({ avatar }) => avatar !== this.avatar),
      'someone in the room has the same avatar',
    );
  },
);

Then('enters the room with it if they do not change it', async function (this: GameWorld) {
  await this.driver.confirmNickname(this.player, this.player);
  this.inRoom.add(this.player);
  const own = (await this.driver.playersSeenBy(this.player)).find(
    ({ nickname }) => nickname === this.player,
  );
  assert.equal(own?.avatar, this.avatar);
});

Given('a player who has opened an invitation link', async function (this: GameWorld) {
  this.player = SOMEONE.anotherPlayer;
  await this.host();
  await this.driver.openInvitation(this.player, 'invitation link');
});

Given('a player in the lobby', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.isInTheRoom(this.player);
});

When('the player chooses another avatar', async function (this: GameWorld) {
  const before = await this.driver.avatarSeenBy(this.player);
  this.avatar = await this.driver.chooseAnotherAvatar(this.player);
  assert.notEqual(this.avatar, before, 'the avatar did not change');
});

When('joins the room', async function (this: GameWorld) {
  await this.driver.confirmNickname(this.player, this.player);
  this.inRoom.add(this.player);
});

Then(
  /^everyone in the lobby sees (?:the new avatar|the player with that avatar)$/,
  async function (this: GameWorld) {
    for (const viewer of this.inRoom) {
      const seen = await this.driver.playersSeenBy(viewer);
      const avatar = seen.find(({ nickname }) => nickname === this.player)?.avatar;
      assert.equal(avatar, this.avatar, `${viewer} does not see the avatar of ${this.player}`);
    }
  },
);

Given('a lobby with a player called {string}', async function (this: GameWorld, nickname: string) {
  await this.isInTheRoom(nickname);
});

When(
  '{string} joins with the avatar of {string}',
  async function (this: GameWorld, player: string, owner: string) {
    this.player = player;
    this.avatar = await this.avatarOf(owner);
    await this.driver.openInvitation(player, 'invitation link');
    await this.driver.chooseAvatar(player, this.avatar);
    await this.driver.confirmNickname(player, player);
    this.inRoom.add(player);
    this.viewers = [owner, player];
  },
);

Then('both players are in the room with the same avatar', async function (this: GameWorld) {
  const inside = await this.driver.playersSeenBy(await this.host());
  for (const player of this.viewers) {
    const seen = inside.find(({ nickname }) => nickname === player);
    assert.ok(seen, `${player} is not in the room`);
    assert.equal(seen.avatar, this.avatar, `${player} does not have the shared avatar`);
  }
});

When(
  'another player opens its invitation link and types the nickname {string}',
  async function (this: GameWorld, nickname: string) {
    this.player = SOMEONE.anotherPlayer;
    await this.driver.openInvitation(this.player, 'invitation link');
    await this.driver.typeNickname(this.player, nickname);
    this.nickname = nickname;
  },
);

Then(
  'the player is told that someone called {string} is already in the room',
  async function (this: GameWorld, nickname: string) {
    assert.equal(await this.driver.namesakeWarningSeenBy(this.player), nickname);
  },
);

Then('can still join', async function (this: GameWorld) {
  assert.ok(this.nickname, 'no step typed a nickname');
  await this.driver.confirmNickname(this.player, this.nickname);
  assert.ok(await this.driver.isInTheRoom(this.player), `${this.player} could not join`);
});

When(
  /^a player called "([^"]*)" tries to take the avatar of "([^"]*)" (when joining|in the lobby)$/,
  async function (this: GameWorld, nickname: string, owner: string, moment: string) {
    this.player = namesakeOf(owner);
    this.avatar = await this.avatarOf(owner);
    if (moment === 'when joining') {
      await this.driver.openInvitation(this.player, 'invitation link');
      await this.driver.chooseAvatar(this.player, this.avatar);
      await this.driver.confirmNickname(this.player, nickname);
    } else {
      await this.isInTheRoom(this.player, nickname);
      await this.driver.chooseAvatar(this.player, this.avatar);
    }
  },
);

Then('the player does not get that avatar', async function (this: GameWorld) {
  const inside = await this.driver.playersSeenBy(await this.host());
  const lookalikes = inside.filter(({ avatar }) => avatar === this.avatar);
  assert.equal(lookalikes.length, 1, 'two players share the nickname and the avatar');
});

Then('is asked to choose another one', async function (this: GameWorld) {
  assert.ok(await this.driver.askedToChooseAnotherAvatar(this.player));
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

/** The room lets each player add at least `count` dilemmas, without lowering what it allows. */
async function allowAdding(world: GameWorld, count: number): Promise<void> {
  const host = await world.host();
  const { dilemmasPerPlayer } = await world.driver.settingsSeenBy(host);
  if (dilemmasPerPlayer < count) {
    await world.driver.changeSettings(host, { dilemmasPerPlayer: count });
  }
}

Given(
  'the host allows each player to add {int} dilemmas',
  async function (this: GameWorld, count: number) {
    await allowAdding(this, count);
  },
);

Given(
  /^"([^"]*)" has (?:already )?added a dilemma$/,
  async function (this: GameWorld, player: string) {
    await allowAdding(this, 1);
    await this.isInTheRoom(player);
    await this.driver.addDilemma(player);
    this.dilemmas = await this.driver.addedDilemmasSeenBy(player);
  },
);

Given(
  '{string} has already added {int} dilemmas',
  async function (this: GameWorld, player: string, count: number) {
    await allowAdding(this, count);
    await this.isInTheRoom(player);
    for (let added = 0; added < count; added += 1) await this.driver.addDilemma(player);
    this.dilemmas = await this.driver.addedDilemmasSeenBy(player);
  },
);

When('{string} tries to add another one', async function (this: GameWorld, player: string) {
  this.accepted = await this.driver.tryToAddAnotherDilemma(player);
});

Then('the third dilemma is not added', async function (this: GameWorld) {
  assert.equal(this.accepted, false);
  assert.equal((await this.driver.addedDilemmasSeenBy(await this.host())).length, 2);
});

When('{string} removes it', async function (this: GameWorld, player: string) {
  await this.driver.removeAddedDilemma(player);
});

Then('nobody in the lobby sees it', async function (this: GameWorld) {
  const [dilemmaId] = this.dilemmas;
  assert.ok(dilemmaId, 'no step added a dilemma');
  for (const viewer of this.inRoom) {
    assert.ok(!(await this.driver.addedDilemmasSeenBy(viewer)).includes(dilemmaId), viewer);
  }
});

When('the host adds a dilemma', async function (this: GameWorld) {
  const host = await this.host();
  await this.isInTheRoom(SOMEONE.player);
  await this.driver.addDilemma(host);
  this.dilemmas = await this.driver.addedDilemmasSeenBy(host);
});

Then('everyone in the lobby sees it among the added dilemmas', async function (this: GameWorld) {
  const [dilemmaId] = this.dilemmas;
  assert.ok(dilemmaId, 'no step added a dilemma');
  for (const viewer of this.inRoom) {
    assert.ok((await this.driver.addedDilemmasSeenBy(viewer)).includes(dilemmaId), viewer);
  }
});

Then('no player in the lobby sees who added it', async function (this: GameWorld) {
  assert.ok((await this.driver.addedDilemmasSeenBy(await this.host())).length > 0, 'none added');
  for (const viewer of this.inRoom) {
    assert.deepEqual(await this.driver.authorsOfAddedDilemmasSeenBy(viewer), [], viewer);
  }
});
