import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { type Category, isCategory } from '@thelever-app/game';
import type { RoundSetting, RoundView, SettingsView } from '../support/driver.ts';
import { catalogDilemmasSuiting, TEST_DILEMMAS } from '../support/test-catalog.ts';
import { SOMEONE, type GameWorld } from '../support/world.ts';

/** A category as a scenario writes it: its id. */
function categoryNamed(text: string): Category {
  assert.ok(isCategory(text), `${text} is not a category`);
  return text;
}

/** The words of the scenarios for where the group plays, and how the room keeps them. */
const PLACES: Readonly<Record<string, string>> = { together: 'together', remotely: 'remote' };

/** The languages the scenarios name, and their codes. */
const LANGUAGES: Readonly<Record<string, string>> = { English: 'en', Spanish: 'es', French: 'fr' };

/** Test data: a new value for each part of the configuration the host can change before starting. */
const NEW_CONFIGURATION: Partial<SettingsView> = {
  dilemmaLanguage: 'fr',
  timePerDilemmaSeconds: 30,
};
/** Test data: new rounds for that configuration, as many as the test data has in French. */
const NEW_ROUNDS: readonly RoundSetting[] = Array.from({ length: 6 }, () => ({
  origin: 'random',
  categories: ['honesty'],
}));

/** How a player of the lobby sees the rounds the host set: no round of the players chosen yet. */
function viewsOf(rounds: readonly RoundSetting[]): RoundView[] {
  return rounds.map((round) =>
    round.origin === 'players' ? { origin: 'players', dilemmaId: null } : round,
  );
}

/** The categories of the round as the host set it, or every one. */
function categoriesOf(round: RoundSetting | undefined): readonly Category[] | null {
  return round?.origin === 'random' ? round.categories : null;
}

/** That round of the room as `viewer` sees it. */
async function roundSeenBy(world: GameWorld, viewer: string, round: number): Promise<RoundView> {
  const seen = (await world.driver.roundsSeenBy(viewer))[round - 1];
  assert.ok(seen, `${viewer} sees no round ${round}`);
  return seen;
}

/** The host sets that round; the room must take it. */
async function setRound(world: GameWorld, round: number, setting: RoundSetting): Promise<void> {
  const host = await world.host();
  assert.ok(await world.driver.tryToSetRound(host, round, setting), `round ${round} is not set`);
}

function codeOf(language: string): string {
  const code = LANGUAGES[language];
  if (!code) throw new Error(`The steps do not know the language "${language}"`);
  return code;
}

/** The game of the room, which the host starts if no step has yet. */
async function dilemmasOfTheGame(world: GameWorld): Promise<string[]> {
  const host = await world.host();
  if (!(await world.driver.currentGameSeenBy(host))) await world.driver.startGame(host);
  const dilemmas = await world.driver.dilemmasOfTheGame();
  assert.ok(dilemmas.length > 0, 'the game has no dilemmas');
  return dilemmas;
}

function minimumAgesOf(world: GameWorld, dilemmaIds: readonly string[]): number[] {
  return dilemmaIds.map((dilemmaId) => world.driver.catalogEntryOf(dilemmaId).minimumAge);
}

// Creating the room

Given('a player on the home screen', function (this: GameWorld) {
  this.player = SOMEONE.player;
});

When('the player creates a room', async function (this: GameWorld) {
  this.beginRoomCreation(this.player);
  await this.driver.openRoomCreation(this.player);
  this.avatar = await this.driver.avatarSeenBy(this.player);
  await this.host();
});

When(
  'a player creates a room without changing the reveal setting',
  async function (this: GameWorld) {
    this.beginRoomCreation(SOMEONE.player);
    await this.host();
  },
);

Then('the player becomes the host of that room', async function (this: GameWorld) {
  assert.ok(await this.driver.isHost(this.player));
});

Then(
  /^the host (?:plays with the random avatar shown before creating the room|enters the lobby with that avatar)$/,
  async function (this: GameWorld) {
    assert.ok(this.avatar, 'no step saw the avatar before the room was created');
    assert.equal(await this.avatarOf(await this.host()), this.avatar);
  },
);

Given('a player creating a room', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  this.beginRoomCreation(this.player);
  await this.driver.openRoomCreation(this.player);
});

// From the public page of a dilemma, the visitor creates the room the screen offers to play it.
When('creates the room', async function (this: GameWorld) {
  if (this.dilemmaToPlayWithTheGroup) await this.driver.createTheRoomOfTheDilemma();
  else await this.host();
});

Then(
  'the host is asked for a nickname and the nature of the group on the same screen',
  async function (this: GameWorld) {
    assert.ok(await this.driver.nicknameAndGroupNatureAskedTogether(await this.host()));
  },
);

Given('a host who has just created a room', function (this: GameWorld) {
  this.beginRoomCreation(SOMEONE.host);
});

When(
  'the host chooses {string} as the nature of the group',
  function (this: GameWorld, groupNature: string) {
    this.chooseOnCreation({ groupNature });
  },
);

When('the host chooses {string}', function (this: GameWorld, place: string) {
  const chosen = PLACES[place];
  if (!chosen) throw new Error(`The steps do not know the place "${place}"`);
  this.chooseOnCreation({ place: chosen });
});

Then('the room gets an invitation link, a code and a QR', async function (this: GameWorld) {
  const host = await this.host();
  assert.match(await this.driver.roomCodeSeenBy(host), /^[A-Z0-9]{5}$/);
  assert.ok(await this.driver.canShareInvitationLink(host), 'the invitation link does not work');
  assert.ok(await this.driver.canShowQrFullScreen(host), 'the QR does not work');
});

Then('the game is recorded as played remotely', async function (this: GameWorld) {
  await this.host();
  assert.equal(await this.driver.placeRecorded(), 'remote');
});

Then('everyone in the lobby is advised to play on a video call', async function (this: GameWorld) {
  await this.host();
  for (const player of this.inRoom) {
    assert.ok(await this.driver.videoCallAdviceSeenBy(player), `${player} is not advised`);
  }
});

Given('a host whose device is in {word}', function (this: GameWorld, language: string) {
  this.beginRoomCreation(SOMEONE.host, { deviceLanguage: codeOf(language) });
});

When('the host creates a room', async function (this: GameWorld) {
  await this.host();
});

// The configuration

When('the host chooses the anonymous reveal', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { variant: 'anonymous' });
});

// Before there is a room it sets it up; once there is one, it says what the room is.
Then(/^the room is (nominal|anonymous)$/, async function (this: GameWorld, variant: string) {
  if (!this.roomCreated) {
    this.variant = variant as 'nominal' | 'anonymous';
    return;
  }
  assert.equal((await this.driver.settingsSeenBy(await this.host())).variant, variant);
});

Then('the dilemmas of the room are in {word}', async function (this: GameWorld, language: string) {
  const settings = await this.driver.settingsSeenBy(await this.host());
  assert.equal(settings.dilemmaLanguage, codeOf(language));
});

Then(
  'the room has {int} random rounds of every category and the default time per dilemma',
  async function (this: GameWorld, count: number) {
    const host = await this.host();
    const random: RoundView = { origin: 'random', categories: null };
    assert.deepEqual(await this.driver.roundsSeenBy(host), Array(count).fill(random));
    const settings = await this.driver.settingsSeenBy(host);
    assert.ok(settings.timePerDilemmaSeconds > 0, 'the room has no time per dilemma');
  },
);

Given('a host in the lobby', async function (this: GameWorld) {
  await this.host();
});

When(
  'the host changes the dilemma language, the rounds or the time per dilemma',
  async function (this: GameWorld) {
    const host = await this.host();
    this.changes = NEW_CONFIGURATION;
    this.rounds = NEW_ROUNDS;
    await this.driver.changeSettings(host, this.changes);
    await this.driver.setRounds(host, this.rounds);
  },
);

Then('the game uses the new configuration', async function (this: GameWorld) {
  const dilemmas = await dilemmasOfTheGame(this);
  const settings = await this.driver.settingsOfTheGame();

  assert.equal(settings.dilemmaLanguage, this.changes.dilemmaLanguage);
  assert.equal(settings.timePerDilemmaSeconds, this.changes.timePerDilemmaSeconds);
  assert.equal(dilemmas.length, this.rounds.length);
  dilemmas.forEach((dilemmaId, index) => {
    const { category } = this.driver.catalogEntryOf(dilemmaId);
    const categories = categoriesOf(this.rounds[index]);
    assert.ok(!categories || categories.includes(category), `round ${index + 1} is ${category}`);
  });
});

Given(
  'a lobby with the host {string} and the player {string}',
  async function (this: GameWorld, host: string, player: string) {
    await this.hostIs(host);
    await this.isInTheRoom(player);
  },
);

When('{string} changes the configuration', async function (this: GameWorld, host: string) {
  await this.hostIs(host);
  this.changes = { variant: 'anonymous', timePerDilemmaSeconds: 90 };
  this.rounds = [
    { origin: 'random', categories: ['honesty'] },
    { origin: 'players' },
    { origin: 'random', categories: null },
  ];
  await this.driver.changeSettings(host, this.changes);
  await this.driver.setRounds(host, this.rounds);
});

Then(
  '{string} sees the rounds, the summary of the new configuration and the type of room',
  async function (this: GameWorld, player: string) {
    assert.deepEqual(await this.driver.roundsSeenBy(player), viewsOf(this.rounds));
    const seen = await this.driver.settingsSeenBy(player);
    for (const [setting, value] of Object.entries(this.changes)) {
      assert.deepEqual(
        seen[setting as keyof SettingsView],
        value,
        `${player} sees the old ${setting}`,
      );
    }
  },
);

Then(
  '{string} has no option to change the configuration',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.canChangeSettings(player), false);
  },
);

// Sharing the room

Then('the host sees the 5-character code of the room', async function (this: GameWorld) {
  assert.match(await this.driver.roomCodeSeenBy(await this.host()), /^[A-Z0-9]{5}$/);
});

Then('the host can share the invitation link', async function (this: GameWorld) {
  assert.ok(await this.driver.canShareInvitationLink(await this.host()));
});

Then('the host can show the QR full screen', async function (this: GameWorld) {
  assert.ok(await this.driver.canShowQrFullScreen(await this.host()));
});

// Who is in the room

When('another player joins the room', async function (this: GameWorld) {
  this.player = SOMEONE.anotherPlayer;
  await this.isInTheRoom(this.player);
});

Then('everyone in the lobby sees the new player immediately', async function (this: GameWorld) {
  const others = [...this.inRoom].filter((player) => player !== this.player);
  assert.ok(others.length > 0, 'nobody else is in the lobby');
  for (const viewer of others) {
    const seen = (await this.driver.playersSeenBy(viewer)).map(({ nickname }) => nickname);
    assert.ok(seen.includes(this.player), `${viewer} does not see ${this.player}`);
  }
});

Given(
  /^(a nominal|an anonymous) room with (\d+) players? in the lobby$/,
  async function (this: GameWorld, room: string, count: string) {
    const host = await this.host();
    if (room === 'an anonymous') await this.driver.changeSettings(host, { variant: 'anonymous' });
    for (let number = 2; number <= Number(count); number++) {
      await this.isInTheRoom(`Player ${number}`);
    }
  },
);

Given(
  'a lobby with players {string}, {string} and {string}',
  async function (this: GameWorld, host: string, firstPlayer: string, secondPlayer: string) {
    await this.hostIs(host);
    await this.isInTheRoom(firstPlayer);
    await this.isInTheRoom(secondPlayer);
  },
);

// Starting the game

When('the host tries to start the game', async function (this: GameWorld) {
  const host = await this.host();
  this.gameBefore = await this.driver.currentGameSeenBy(host);
  this.triedToStartTheGame = true;
  await this.driver.tryToStartGame(host);
});

// After a step tried to start the game, whether it started; otherwise, the host starts it.
Then(/^the game (starts|does not start)$/, async function (this: GameWorld, outcome: string) {
  const host = await this.host();
  if (outcome === 'starts' && !this.triedToStartTheGame) await this.driver.startGame(host);
  const game = await this.driver.currentGameSeenBy(host);
  if (outcome === 'starts') assert.ok(game, 'no game started');
  else assert.equal(game, this.gameBefore);
});

When('the host starts the game', async function (this: GameWorld) {
  await this.driver.startGame(await this.host());
});

Given('a game that has already started', async function (this: GameWorld) {
  await this.isInTheRoom('Luis');
  await this.isInTheRoom('Marta');
  await this.driver.startGame(await this.host());
});

// Expelling

When('the host expels {string}', async function (this: GameWorld, player: string) {
  await this.driver.expel(await this.host(), player);
  this.inRoom.delete(player);
});

/** Once the game has ended, the player leaves it; in the lobby, after being expelled, they are out. */
Then('{string} leaves the room', async function (this: GameWorld, player: string) {
  if (this.ended) {
    await this.driver.leave(player);
    this.away.add(player);
    this.inRoom.delete(player);
    return;
  }
  assert.equal(await this.driver.isInTheRoom(player), false);
});

Then('{string} cannot join that game again', async function (this: GameWorld, player: string) {
  await this.driver.tryToJoinRoom(player);
  assert.equal(await this.driver.joinRefusalSeenBy(player), 'expelled');
  assert.equal(await this.driver.isInTheRoom(player), false);
});

Then('the host has no option to expel players', async function (this: GameWorld) {
  const host = await this.host();
  const guests = await this.guests();
  assert.ok(guests.length > 0, 'nobody to expel');
  for (const player of guests) {
    assert.equal(await this.driver.canExpel(host, player), false, `${player} can be expelled`);
  }
});

// The dilemmas of the game

Given(
  'a host who creates a room without marking it as adults only',
  async function (this: GameWorld) {
    const settings = await this.driver.settingsSeenBy(await this.host());
    assert.equal(settings.adultsOnly, false);
  },
);

Given('a host who marks the room as adults only', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { adultsOnly: true });
});

Given('a room not marked as adults only', async function (this: GameWorld) {
  const settings = await this.driver.settingsSeenBy(await this.host());
  assert.equal(settings.adultsOnly, false);
});

Then('every dilemma of the game is suitable from age 16', async function (this: GameWorld) {
  const ages = minimumAgesOf(this, await dilemmasOfTheGame(this));
  assert.ok(
    ages.every((age) => age === 16),
    `the game plays dilemmas for ages ${ages.join(', ')}`,
  );
});

Then('the game can include dilemmas for adults', async function (this: GameWorld) {
  const ages = minimumAgesOf(this, await dilemmasOfTheGame(this));
  assert.ok(ages.includes(18), 'the game plays no dilemma for adults');
});

When(
  'the host searches {string} and chooses a dilemma for round {int}',
  async function (this: GameWorld, text: string, round: number) {
    const [dilemmaId] = await this.driver.searchDilemmas(await this.host(), text);
    assert.ok(dilemmaId, `the search for "${text}" shows nothing`);
    this.dilemmaId = dilemmaId;
    await setRound(this, round, { origin: 'specific', dilemmaId });
  },
);

Then('round {int} of the game plays that dilemma', async function (this: GameWorld, round: number) {
  assert.equal((await dilemmasOfTheGame(this))[round - 1], this.dilemmaId);
});

When('the host searches for the dilemma of a round', async function (this: GameWorld) {
  this.dilemmas = await this.driver.searchDilemmas(await this.host());
});

Then('only dilemmas suitable from 16 are shown', function (this: GameWorld) {
  assert.ok(this.dilemmas.length > 0, 'the search shows nothing');
  assert.ok(minimumAgesOf(this, this.dilemmas).every((age) => age === 16));
});

When(
  'the host searches part of the text of a dilemma for a round',
  async function (this: GameWorld) {
    const host = await this.host();
    const [dilemmaId] = (await this.driver.searchDilemmas(host)).slice(-1);
    assert.ok(dilemmaId, 'the catalog has no dilemma for the room');
    const { text } = this.driver.catalogEntryOf(dilemmaId);
    // The end of its text, in other case: part of a word, as a player types it.
    const part = text.slice(-Math.ceil(text.length / 3)).toUpperCase();
    this.dilemmas = [dilemmaId];
    this.found = await this.driver.searchDilemmas(host, part);
  },
);

Given(
  'more than {int} dilemmas of the catalog suit the room',
  async function (this: GameWorld, count: number) {
    const { dilemmaLanguage, adultsOnly } = await this.driver.settingsSeenBy(await this.host());
    const suiting = catalogDilemmasSuiting(dilemmaLanguage, adultsOnly ? 18 : 16);
    assert.ok(suiting.length > count, `the test data has only ${suiting.length} for the room`);
  },
);

Then('{int} dilemmas are shown', function (this: GameWorld, count: number) {
  assert.equal(this.dilemmas.length, count);
});

Then('the host can ask for {int} more', async function (this: GameWorld, count: number) {
  const [first = [], second = []] = await this.driver.searchDilemmaPages(await this.host(), 2);
  assert.ok(second.length > 0, 'the search has no more dilemmas to show');
  assert.ok(second.length <= count, `the search shows ${second.length} more, not up to ${count}`);
  assert.ok(
    second.every((dilemmaId) => !first.includes(dilemmaId)),
    'the next dilemmas repeat some shown before',
  );
});

Then('that dilemma is shown', function (this: GameWorld) {
  const [dilemmaId] = this.dilemmas;
  assert.ok(dilemmaId, 'no step said which dilemma');
  assert.ok(this.found.includes(dilemmaId), `the search does not show ${dilemmaId}`);
});

When(
  'the host sets round {int} as random from {string} and {string}',
  async function (this: GameWorld, round: number, first: string, second: string) {
    this.categories = [categoryNamed(first), categoryNamed(second)];
    await setRound(this, round, { origin: 'random', categories: this.categories });
  },
);

Then(
  'the dilemma of round {int} is of one of those categories',
  async function (this: GameWorld, round: number) {
    const dilemmaId = (await dilemmasOfTheGame(this))[round - 1];
    assert.ok(dilemmaId, `the game plays no round ${round}`);
    const { category } = this.driver.catalogEntryOf(dilemmaId);
    assert.ok(this.categories.includes(category), `${dilemmaId} is of ${category}`);
  },
);

Given('round {int} has a specific dilemma', async function (this: GameWorld, round: number) {
  await setRound(this, round, { origin: 'specific', dilemmaId: await this.unusedDilemma() });
});

When('the host sets round {int} as random', async function (this: GameWorld, round: number) {
  await setRound(this, round, { origin: 'random', categories: null });
});

Then('round {int} has no dilemma chosen', async function (this: GameWorld, round: number) {
  for (const viewer of this.inRoom) {
    const seen = await roundSeenBy(this, viewer, round);
    assert.equal(seen.origin, 'random', `${viewer} sees a dilemma in round ${round}`);
  }
});

Given('the option to include new dilemmas is on by default', async function (this: GameWorld) {
  const settings = await this.driver.settingsSeenBy(await this.host());
  assert.equal(settings.newDilemmas, true);
});

When('the host turns it off', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { newDilemmas: false });
});

Then('the game does not include dilemmas in exploration', async function (this: GameWorld) {
  const dilemmas = await dilemmasOfTheGame(this);
  for (const dilemmaId of dilemmas) {
    assert.equal(this.driver.catalogEntryOf(dilemmaId).status, 'in-catalog');
  }
});

// The rounds

When(
  'the host sets round {int} as chosen by the players',
  async function (this: GameWorld, round: number) {
    await setRound(this, round, { origin: 'players' });
  },
);

// The host and, if nobody has joined, someone who does: every player, not only the host.
Then(
  'every player in the lobby can choose the dilemma of round {int}',
  async function (this: GameWorld, round: number) {
    if ((await this.guests()).length === 0) await this.isInTheRoom(SOMEONE.player);
    for (const player of this.inRoom) {
      assert.ok(await this.driver.canChooseRoundDilemma(player, round), `${player} cannot`);
    }
  },
);

Given(
  'round {int} has the specific dilemma {string} and round {int} is random',
  async function (this: GameWorld, round: number, name: string, random: number) {
    await setRound(this, round, { origin: 'specific', dilemmaId: this.dilemmaCalled(name) });
    const seen = await roundSeenBy(this, await this.host(), random);
    assert.equal(seen.origin, 'random', `round ${random} is not random`);
  },
);

Then('the first round plays {string}', async function (this: GameWorld, name: string) {
  assert.equal((await dilemmasOfTheGame(this))[0], this.dilemmaCalled(name));
});

Given('a room with {int} rounds', async function (this: GameWorld, count: number) {
  const random: RoundSetting = { origin: 'random', categories: null };
  await this.driver.setRounds(await this.host(), Array(count).fill(random));
  assert.equal((await this.driver.roundsSeenBy(await this.host())).length, count);
});

When(/^the host tries to (add|remove) a round$/, async function (this: GameWorld, change: string) {
  const host = await this.host();
  const { length } = await this.driver.roundsSeenBy(host);
  this.accepted =
    change === 'add'
      ? await this.driver.tryToAddRound(host)
      : await this.driver.tryToRemoveRound(host, length);
});

Then('the room still has {int} rounds', async function (this: GameWorld, count: number) {
  assert.equal(this.accepted, false);
  for (const viewer of this.inRoom) {
    assert.equal((await this.driver.roundsSeenBy(viewer)).length, count, viewer);
  }
});

Given(
  'round {int} has the dilemma {string}',
  async function (this: GameWorld, round: number, name: string) {
    await setRound(this, round, { origin: 'specific', dilemmaId: this.dilemmaCalled(name) });
  },
);

When(
  'the host tries to choose {string} for round {int}',
  async function (this: GameWorld, name: string, round: number) {
    this.dilemmaId = this.dilemmaCalled(name);
    this.accepted = await this.driver.tryToSetRound(await this.host(), round, {
      origin: 'specific',
      dilemmaId: this.dilemmaId,
    });
  },
);

Then('round {int} does not get it', async function (this: GameWorld, round: number) {
  assert.equal(this.accepted, false);
  for (const viewer of this.inRoom) {
    const seen = await roundSeenBy(this, viewer, round);
    assert.ok(!('dilemmaId' in seen && seen.dilemmaId === this.dilemmaId), viewer);
  }
});

Given(
  'an adults-only room whose round {int} has an adults-only dilemma',
  async function (this: GameWorld, round: number) {
    await this.driver.changeSettings(await this.host(), { adultsOnly: true });
    const forAdults = TEST_DILEMMAS.find(
      ({ language, minimumAge, status }) =>
        language === 'es' && minimumAge === 18 && status === 'in-catalog',
    );
    assert.ok(forAdults, 'the test data has no dilemma for adults');
    await setRound(this, round, { origin: 'specific', dilemmaId: forAdults.dilemmaId });
  },
);

When('the host turns off adults only', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { adultsOnly: false });
});

Then('round {int} is random from every category', async function (this: GameWorld, round: number) {
  for (const viewer of this.inRoom) {
    assert.deepEqual(
      await roundSeenBy(this, viewer, round),
      { origin: 'random', categories: null },
      viewer,
    );
  }
});
