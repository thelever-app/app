import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { SettingsView } from '../support/driver.ts';
import { SOMEONE, type GameWorld } from '../support/world.ts';

/** The words of the scenarios for where the group plays, and how the room keeps them. */
const PLACES: Readonly<Record<string, string>> = { together: 'together', remotely: 'remote' };

/** The languages the scenarios name, and their codes. */
const LANGUAGES: Readonly<Record<string, string>> = { English: 'en', Spanish: 'es', French: 'fr' };

/** Test data: a new value for each part of the configuration the host can change before starting. */
const NEW_CONFIGURATION: Partial<SettingsView> = {
  dilemmaLanguage: 'fr',
  categories: ['honesty'],
  dilemmaCount: 6,
  totalTimeInMinutes: 4,
};

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

Then('the host gets a random avatar', async function (this: GameWorld) {
  const host = await this.host();
  const players = await this.driver.playersSeenBy(host);
  assert.ok(players.find(({ nickname }) => nickname === host)?.avatar, 'the host has no avatar');
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

Then(/^the room is (nominal|anonymous)$/, async function (this: GameWorld, variant: string) {
  assert.equal((await this.driver.settingsSeenBy(await this.host())).variant, variant);
});

Then('the dilemmas of the room are in {word}', async function (this: GameWorld, language: string) {
  const settings = await this.driver.settingsSeenBy(await this.host());
  assert.equal(settings.dilemmaLanguage, codeOf(language));
});

Then(
  'the room has default categories, number of dilemmas and total time',
  async function (this: GameWorld) {
    const settings = await this.driver.settingsSeenBy(await this.host());
    assert.equal(settings.categories, null, 'the room does not start with every category');
    assert.ok(settings.dilemmaCount > 0, 'the room has no number of dilemmas');
    assert.ok(settings.totalTimeInMinutes > 0, 'the room has no total time');
  },
);

Given('a host in the lobby', async function (this: GameWorld) {
  await this.host();
});

When(
  'the host changes the dilemma language, the categories, the number of dilemmas or the total time',
  async function (this: GameWorld) {
    this.changes = NEW_CONFIGURATION;
    await this.driver.changeSettings(await this.host(), this.changes);
  },
);

Then('the game uses the new configuration', async function (this: GameWorld) {
  const dilemmas = await dilemmasOfTheGame(this);
  const settings = await this.driver.settingsOfTheGame();

  assert.equal(settings.dilemmaLanguage, this.changes.dilemmaLanguage);
  assert.equal(settings.totalTimeInMinutes, this.changes.totalTimeInMinutes);
  assert.equal(dilemmas.length, this.changes.dilemmaCount);
  for (const dilemmaId of dilemmas) {
    assert.ok(this.changes.categories?.includes(this.driver.catalogEntryOf(dilemmaId).category));
  }
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
  this.changes = { variant: 'anonymous', categories: ['honesty'], totalTimeInMinutes: 8 };
  await this.driver.changeSettings(host, this.changes);
});

Then(
  '{string} sees the summary of the new configuration and the type of room',
  async function (this: GameWorld, player: string) {
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
  await this.driver.tryToStartGame(host);
});

Then(/^the game (starts|does not start)$/, async function (this: GameWorld, outcome: string) {
  const game = await this.driver.currentGameSeenBy(await this.host());
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

Then('{string} leaves the room', async function (this: GameWorld, player: string) {
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
  'the host searches {string} and picks {int} dilemmas',
  async function (this: GameWorld, text: string, count: number) {
    const host = await this.host();
    const found = await this.driver.searchDilemmas(host, text);
    assert.ok(found.length >= count, `the search shows only ${found.length} dilemmas`);
    this.dilemmas = found.slice(0, count);
    await this.driver.pickDilemmas(host, [...this.dilemmas]);
  },
);

Then('the game uses exactly those {int} dilemmas', async function (this: GameWorld, count: number) {
  const dilemmas = await dilemmasOfTheGame(this);
  assert.equal(dilemmas.length, count);
  assert.deepEqual([...dilemmas].sort(), [...this.dilemmas].sort());
});

Then('no new dilemmas are added for the exploration', async function (this: GameWorld) {
  const dilemmas = await dilemmasOfTheGame(this);
  for (const dilemmaId of dilemmas) {
    assert.equal(this.driver.catalogEntryOf(dilemmaId).status, 'in-catalog');
  }
});

When('the host searches for dilemmas', async function (this: GameWorld) {
  this.dilemmas = await this.driver.searchDilemmas(await this.host());
});

Then('only dilemmas suitable from 16 are shown', function (this: GameWorld) {
  assert.ok(this.dilemmas.length > 0, 'the search shows nothing');
  assert.ok(minimumAgesOf(this, this.dilemmas).every((age) => age === 16));
});

When('the host searches part of the text of a dilemma', async function (this: GameWorld) {
  const host = await this.host();
  const [dilemmaId] = (await this.driver.searchDilemmas(host)).slice(-1);
  assert.ok(dilemmaId, 'the catalog has no dilemma for the room');
  const { text } = this.driver.catalogEntryOf(dilemmaId);
  // The end of its text, in other case: part of a word, as a player types it.
  const part = text.slice(-Math.ceil(text.length / 3)).toUpperCase();
  this.dilemmas = [dilemmaId];
  this.found = await this.driver.searchDilemmas(host, part);
});

Then('that dilemma is shown', function (this: GameWorld) {
  const [dilemmaId] = this.dilemmas;
  assert.ok(dilemmaId, 'no step said which dilemma');
  assert.ok(this.found.includes(dilemmaId), `the search does not show ${dilemmaId}`);
});

When(
  'the host chooses the categories {string} and {string}',
  async function (this: GameWorld, first: string, second: string) {
    this.changes = { categories: [first, second] };
    await this.driver.changeSettings(await this.host(), this.changes);
  },
);

Then('every dilemma of the game is of one of those categories', async function (this: GameWorld) {
  const dilemmas = await dilemmasOfTheGame(this);
  assert.ok(dilemmas.length > 0, 'the game has no dilemmas');
  for (const dilemmaId of dilemmas) {
    const { category } = this.driver.catalogEntryOf(dilemmaId);
    assert.ok(this.changes.categories?.includes(category), `${dilemmaId} is of ${category}`);
  }
});

Given('the host has picked specific dilemmas', async function (this: GameWorld) {
  const host = await this.host();
  const found = await this.driver.searchDilemmas(host);
  await this.driver.pickDilemmas(host, found.slice(0, 2));
  assert.equal((await this.driver.pickedDilemmasSeenBy(host)).length, 2);
});

When('the host chooses to play by categories', async function (this: GameWorld) {
  await this.driver.playByCategories(await this.host());
});

Then('no dilemma is picked for the game', async function (this: GameWorld) {
  for (const viewer of this.inRoom) {
    assert.deepEqual(await this.driver.pickedDilemmasSeenBy(viewer), [], viewer);
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

// Dilemmas added by the players

Given(
  '{string} has allowed players to add dilemmas',
  async function (this: GameWorld, host: string) {
    await this.hostIs(host);
    await this.driver.changeSettings(host, { dilemmasPerPlayer: 1 });
  },
);

Given('the host has allowed players to add dilemmas', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { dilemmasPerPlayer: 1 });
});

Given('a player has added a dilemma', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.isInTheRoom(this.player);
  await this.driver.addDilemma(this.player);
});

When(
  '{string} looks at the added dilemmas in the lobby',
  async function (this: GameWorld, viewer: string) {
    this.viewers = [viewer];
    this.dilemmas = await this.driver.addedDilemmasSeenBy(viewer);
    assert.ok(this.dilemmas.length > 0, `${viewer} sees no added dilemma`);
  },
);

Then('she does not see who added it', async function (this: GameWorld) {
  const [viewer] = this.viewers;
  assert.ok(viewer, 'no step said who is looking');
  assert.deepEqual(await this.driver.authorsOfAddedDilemmasSeenBy(viewer), []);
});

Then('she can remove it', async function (this: GameWorld) {
  const [viewer] = this.viewers;
  assert.ok(viewer, 'no step said who is looking');
  await this.driver.removeAddedDilemma(viewer);
  assert.deepEqual(await this.driver.addedDilemmasSeenBy(viewer), []);
});
