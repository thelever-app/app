import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { InvitationMethod, RoundView } from '../support/driver.ts';
import { GAP_DILEMMA_IDS, TWO_OPTION_DILEMMA_IDS } from '../support/test-catalog.ts';
import { SOMEONE, type GameWorld } from '../support/world.ts';

/** Test data: a valid code that no room of the scenario has, since the scenario creates none. */
const UNKNOWN_ROOM_CODE = 'ZZZZZ';

/** The name the steps give to someone who joins with a nickname another player already has. */
function namesakeOf(nickname: string): string {
  return `${nickname}, the second one`;
}

// Opening the room

Given('a device that has completed the first access', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.finishFirstAccess(this.player);
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

Then('the player still sees the join screen', async function (this: GameWorld) {
  assert.ok(await this.driver.isOnJoinCodeScreen(this.player), 'the code went through by itself');
});

Then('sees that room after pressing the button to enter', async function (this: GameWorld) {
  await this.driver.enterTypedCode(this.player);
  const preview = await this.driver.roomPreviewSeenBy(this.player);
  assert.equal(preview?.host, await this.host());
});

When('a player enters a code that does not match any room', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.typeRoomCode(this.player, UNKNOWN_ROOM_CODE);
  await this.driver.enterTypedCode(this.player);
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

Given('a room marked as adults only', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { adultsOnly: true });
});

When(
  'a player who declared an age of {int} tries to join',
  async function (this: GameWorld, age: number) {
    this.player = SOMEONE.anotherPlayer;
    await this.driver.newDevice(this.player, { country: 'ES' });
    await this.driver.openApp(this.player);
    await this.driver.declareAge(this.player, age);
    await this.driver.acceptTerms(this.player);
    await this.driver.giveGameConsent(this.player);
    await this.driver.answerCookieConsent(this.player);
    await this.driver.tryToJoinRoom(this.player);
  },
);

Then('the player is told the room is for adults only', async function (this: GameWorld) {
  assert.equal(await this.driver.joinRefusalSeenBy(this.player), 'adults-only');
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

// The rounds of the players

/** That round of the room as `viewer` sees it. */
async function roundSeenBy(world: GameWorld, viewer: string, round: number): Promise<RoundView> {
  const seen = (await world.driver.roundsSeenBy(viewer))[round - 1];
  assert.ok(seen, `${viewer} sees no round ${round}`);
  return seen;
}

/** Everyone in the lobby sees that dilemma in that round of the players; null, the round empty. */
async function everyoneSees(
  world: GameWorld,
  round: number,
  dilemmaId: string | null,
): Promise<void> {
  for (const viewer of world.inRoom) {
    assert.deepEqual(
      await roundSeenBy(world, viewer, round),
      { origin: 'players', dilemmaId },
      viewer,
    );
  }
}

/** Round of the players and empty, as the host sets it if no step has. */
async function roundOfThePlayers(world: GameWorld, round: number): Promise<void> {
  const host = await world.host();
  const seen = await roundSeenBy(world, host, round);
  if (seen.origin !== 'players') {
    assert.ok(await world.driver.tryToSetRound(host, round, { origin: 'players' }));
  }
}

/** `player` chooses for that round of the players a dilemma that is in no round. */
async function choose(world: GameWorld, player: string, round: number): Promise<void> {
  await roundOfThePlayers(world, round);
  await world.isInTheRoom(player);
  world.dilemmaId = await world.unusedDilemma();
  world.round = round;
  world.player = player;
  assert.ok(await world.driver.chooseRoundDilemma(player, round, world.dilemmaId));
}

Given(
  /^round (\d+) is chosen by the players and (?:is empty|nobody has chosen its dilemma)$/,
  async function (this: GameWorld, round: string) {
    await roundOfThePlayers(this, Number(round));
    await everyoneSees(this, Number(round), null);
  },
);

When(
  '{string} searches the catalog for the dilemma of round {int}',
  async function (this: GameWorld, player: string, round: number) {
    await this.isInTheRoom(player);
    assert.ok(await this.driver.canChooseRoundDilemma(player, round), `${player} cannot search`);
    this.dilemmas = await this.driver.searchDilemmas(player);
  },
);

Then('only dilemmas suitable for players from 16 are offered', function (this: GameWorld) {
  assert.ok(this.dilemmas.length > 0, 'the search offers nothing');
  for (const dilemmaId of this.dilemmas) {
    assert.equal(this.driver.catalogEntryOf(dilemmaId).minimumAge, 16);
  }
});

When(
  '{string} chooses {string} for round {int}',
  async function (this: GameWorld, player: string, name: string, round: number) {
    await this.isInTheRoom(player);
    this.player = player;
    this.dilemmaId = this.dilemmaCalled(name);
    assert.ok(await this.driver.chooseRoundDilemma(player, round, this.dilemmaId));
  },
);

Then(
  'everyone in the lobby sees {string} in round {int}',
  async function (this: GameWorld, name: string, round: number) {
    await everyoneSees(this, round, this.dilemmaCalled(name));
  },
);

Then(
  'nobody else can choose the dilemma of round {int}',
  async function (this: GameWorld, round: number) {
    const others = [...this.inRoom].filter((player) => player !== this.player);
    assert.ok(others.length > 0, 'nobody else is in the lobby');
    for (const other of others) {
      assert.equal(await this.driver.canChooseRoundDilemma(other, round), false, other);
    }
  },
);

Given(
  '{string} has chosen the dilemma of round {int}',
  async function (this: GameWorld, player: string, round: number) {
    await choose(this, player, round);
  },
);

// Before taking it out, the step notes who else in the lobby could have.
When('{string} removes it', async function (this: GameWorld, player: string) {
  const { round } = this;
  assert.ok(round, 'no step said which round');
  const others = [...this.inRoom].filter((other) => other !== player);
  this.couldClear = new Map(
    await Promise.all(
      others.map(
        async (other) => [other, await this.driver.canClearRoundDilemma(other, round)] as const,
      ),
    ),
  );
  assert.ok(await this.driver.canClearRoundDilemma(player, round), `${player} cannot remove it`);
  await this.driver.clearRoundDilemma(player, round);
});

Then('round {int} is empty again', async function (this: GameWorld, round: number) {
  await everyoneSees(this, round, null);
});

// Whoever else was in the lobby: the scenario may name someone no step brought in.
Then('the host had no option to remove it', async function (this: GameWorld) {
  const host = await this.host();
  assert.equal(this.couldClear.get(host), false, `${host} could remove it`);
});

When('the host chooses a dilemma for round {int}', async function (this: GameWorld, round: number) {
  await this.isInTheRoom(SOMEONE.player);
  await choose(this, await this.host(), round);
});

Then(
  'everyone in the lobby sees it in round {int}',
  async function (this: GameWorld, round: number) {
    await everyoneSees(this, round, this.dilemmaId);
  },
);

Then('no player in the lobby sees who chose it', async function (this: GameWorld) {
  const { round } = this;
  assert.ok(round, 'no step said which round');
  const seen = await roundSeenBy(this, await this.host(), round);
  assert.ok(seen.origin === 'players' && seen.dilemmaId, 'nobody chose it');
  for (const viewer of this.inRoom) {
    assert.deepEqual(await this.driver.choosersSeenBy(viewer), [], viewer);
  }
});

Then(
  'round {int} plays a random dilemma from every category',
  async function (this: GameWorld, round: number) {
    const host = await this.host();
    const rounds = await this.driver.roundsSeenBy(host);
    const dilemmas = await this.driver.dilemmasOfTheGame();
    assert.equal(dilemmas.length, rounds.length, 'the game does not play every round');
    const dilemmaId = dilemmas[round - 1];
    assert.ok(dilemmaId, `the game plays no round ${round}`);
    assert.equal(this.driver.catalogEntryOf(dilemmaId).minimumAge, 16);
  },
);

// Joining once the game has started

const ROUNDS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };

/** The round the scenario names. */
function roundCalled(ordinal: string): number {
  const position = ROUNDS[ordinal];
  assert.ok(position, `the scenario says the "${ordinal}" round`);
  return position;
}

/** Ana hosts Luis and Marta in a game of three dilemmas, which starts once a step needs it. */
async function gameOfThree(world: GameWorld): Promise<void> {
  await world.hostIs('Ana');
  await world.isInTheRoom('Luis');
  await world.isInTheRoom('Marta');
  world.dilemmaCount = 3;
  world.requestGame();
}

Given(
  'a game on the decision phase of its {word} round',
  async function (this: GameWorld, ordinal: string) {
    await gameOfThree(this);
    await this.toRound(roundCalled(ordinal));
  },
);

Given(
  'a game on the reveal of its {word} round',
  async function (this: GameWorld, ordinal: string) {
    await gameOfThree(this);
    await this.toRevealOf(roundCalled(ordinal));
  },
);

/**
 * A nominal game of Ana, Luis and Marta playing those dilemmas, one per round, on the decision phase
 * of the round in that position.
 */
async function nominalGameOn(world: GameWorld, position: number, dilemmaIds: readonly string[]) {
  await gameOfThree(world);
  assert.equal((await world.driver.settingsSeenBy('Ana')).variant, 'nominal');
  world.dilemmaCount = dilemmaIds.length;
  await world.driver.setRounds(
    'Ana',
    dilemmaIds.map((dilemmaId) => ({ origin: 'specific', dilemmaId })),
  );
  await world.toRound(position);
}

Given(
  'a nominal game on the decision phase of its {word} round',
  async function (this: GameWorld, ordinal: string) {
    // Without the gap, so whoever joins is predicted like everyone else.
    await nominalGameOn(this, roundCalled(ordinal), TWO_OPTION_DILEMMA_IDS.slice(0, 3));
  },
);

Given(
  'a nominal game of {int} rounds with the gap on the decision phase of its {word} round',
  async function (this: GameWorld, rounds: number, ordinal: string) {
    await nominalGameOn(this, roundCalled(ordinal), GAP_DILEMMA_IDS.slice(0, rounds));
  },
);

Given(
  '{string} joined a nominal game on its {word} round',
  async function (this: GameWorld, player: string, ordinal: string) {
    await nominalGameOn(this, roundCalled(ordinal), TWO_OPTION_DILEMMA_IDS.slice(0, 3));
    await this.isInTheRoom(player);
  },
);

When('a player joins the room', async function (this: GameWorld) {
  this.player = SOMEONE.anotherPlayer;
  await this.isInTheRoom(this.player);
});

Then('the player can answer the {word} dilemma', async function (this: GameWorld, ordinal: string) {
  assert.equal(await this.driver.dilemmaShownTo(this.player), roundCalled(ordinal));
  assert.ok(await this.driver.canAnswer(this.player), `${this.player} cannot answer`);
});

Then(
  'the player is recorded as {string} for the first two dilemmas',
  async function (this: GameWorld, recorded: string) {
    assert.equal(recorded, 'did not vote');
    assert.deepEqual(await this.driver.didNotVoteRecordedFor(this.player), [1, 2]);
  },
);

Then(
  'the player sees the reveal of the {word} dilemma',
  async function (this: GameWorld, ordinal: string) {
    assert.equal((await this.driver.revealSeenBy(this.player))?.position, roundCalled(ordinal));
  },
);

Then(
  '{string} makes no predictions in the {word} round',
  async function (this: GameWorld, player: string, ordinal: string) {
    assert.equal(await this.driver.dilemmaShownTo(player), roundCalled(ordinal));
    assert.deepEqual(await this.driver.playersToPredictBy(player), []);
  },
);

Then(
  'nobody predicts the vote of {string} in the {word} round',
  async function (this: GameWorld, player: string, ordinal: string) {
    for (const other of this.present().filter((present) => present !== player)) {
      assert.equal(await this.driver.dilemmaShownTo(other), roundCalled(ordinal));
      assert.ok(
        !(await this.driver.playersToPredictBy(other)).includes(player),
        `${other} predicts ${player}`,
      );
    }
  },
);

Then(
  'in the {word} round {string} predicts the votes of the others',
  async function (this: GameWorld, ordinal: string, player: string) {
    await this.toRound(roundCalled(ordinal));
    const others = this.present().filter((present) => present !== player);
    assert.deepEqual((await this.driver.playersToPredictBy(player)).sort(), others.sort());
  },
);

Then(
  'the others predict the vote of {string} in the {word} round',
  async function (this: GameWorld, player: string, ordinal: string) {
    for (const other of this.present().filter((present) => present !== player)) {
      assert.equal(await this.driver.dilemmaShownTo(other), roundCalled(ordinal));
      assert.ok(
        (await this.driver.playersToPredictBy(other)).includes(player),
        `${other} does not predict ${player}`,
      );
    }
  },
);

Then(
  '{string} is not the person in the gap of the {word} round',
  async function (this: GameWorld, player: string, ordinal: string) {
    const person = (await this.driver.peopleInTheGap()).get(roundCalled(ordinal));
    assert.ok(person !== undefined, 'the round has no gap');
    assert.notEqual(person, player);
  },
);

Then(
  '{string} is the person in the gap of the {word} or the {word} round',
  async function (this: GameWorld, player: string, first: string, second: string) {
    const people = await this.driver.peopleInTheGap();
    const rounds = [roundCalled(first), roundCalled(second)];
    assert.ok(
      rounds.some((round) => people.get(round) === player),
      `${player} takes the gap of neither round: ${JSON.stringify([...people])}`,
    );
  },
);

When('the game reaches the game results', async function (this: GameWorld) {
  await this.toTheResults();
});

Then(
  '{string} appears in the ranking with the points of the {word} round',
  async function (this: GameWorld, player: string, ordinal: string) {
    const ranking = (await this.driver.rankingSeenBy('Ana')) ?? [];
    assert.ok(
      ranking.some((ranked) => ranked.player === player),
      `${player} is not in the ranking`,
    );
    const scored = (await this.driver.pointsOf(player)).map(({ position }) => position);
    assert.deepEqual(scored, [roundCalled(ordinal)]);
  },
);

// Inviting once the game has started

Then('any player can share the invitation link of the room', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.ok(await this.driver.canShareInvitationLink(player), `${player} cannot share it`);
  }
});

Then('any player can show the QR and the code of the room', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.ok(await this.driver.canShowQrFullScreen(player), `${player} cannot show the QR`);
    assert.match(await this.driver.roomCodeSeenBy(player), /^[A-Z0-9]{5}$/);
  }
});
