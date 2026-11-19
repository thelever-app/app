import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { Ambience, OffReason, RoundContent, RoundView } from '../support/driver.ts';
import { catalogEntryOf } from '../support/test-catalog.ts';
import type { GameWorld } from '../support/world.ts';

/** The ambiences by the name the scenarios give them. */
const AMBIENCES: Readonly<Record<string, Ambience>> = {
  Classic: 'classic',
  Spicy: 'spicy',
  'No filter': 'no-filter',
};

/** The ambience a lobby shows by the name the scenarios give it, custom too. */
const SHOWN: Readonly<Record<string, string>> = { ...AMBIENCES, Custom: 'custom' };

/** Why something is off, by the reason the scenarios give. */
const REASONS: Readonly<Record<string, OffReason>> = {
  'Only for people 18 or over': 'only-adults',
  'Someone in the room is under 18': 'minor-in-room',
  'only in anonymous rooms': 'only-anonymous',
};

/** The contents by the name the scenarios give them. */
const CONTENTS: Readonly<Record<string, RoundContent>> = {
  any: 'any',
  'adults only': 'adults-only',
  'adults-only': 'adults-only',
  compromising: 'compromising',
};

/**
 * Test data, as the outline «Each ambience sets up the room» writes it: the contents of the 8
 * random rounds of each ambience.
 */
const CONTENTS_OF: Readonly<Record<Ambience, readonly RoundContent[]>> = {
  classic: ['any', 'any', 'any', 'any', 'any', 'any', 'any', 'any'],
  spicy: ['any', 'adults-only', 'any', 'adults-only', 'any', 'adults-only', 'any', 'adults-only'],
  'no-filter': [
    'any',
    'compromising',
    'adults-only',
    'any',
    'compromising',
    'adults-only',
    'any',
    'compromising',
  ],
};

function ambienceCalled(name: string): Ambience {
  const ambience = AMBIENCES[name];
  if (!ambience) throw new Error(`The steps do not know the ambience "${name}"`);
  return ambience;
}

function reasonCalled(reason: string): OffReason {
  const known = REASONS[reason];
  if (!known) throw new Error(`The steps do not know the reason "${reason}"`);
  return known;
}

function contentCalled(content: string): RoundContent {
  const known = CONTENTS[content];
  if (!known) throw new Error(`The steps do not know the content "${content}"`);
  return known;
}

/** The player goes through the first access on a new device, declaring that age. */
async function declaredAge(world: GameWorld, player: string, age: number): Promise<void> {
  await world.driver.newDevice(player, { country: 'ES' });
  await world.driver.openApp(player);
  await world.driver.declareAge(player, age);
  await world.driver.acceptTerms(player);
  await world.driver.giveGameConsent(player);
  await world.driver.answerCookieConsent(player);
}

/** That round of the room as the host sees it. */
async function roundOf(world: GameWorld, round: number): Promise<RoundView> {
  const seen = (await world.driver.roundsSeenBy(await world.host()))[round - 1];
  assert.ok(seen, `the room has no round ${round}`);
  return seen;
}

/** The host sets that random round to a content, keeping its categories. */
async function setContent(world: GameWorld, round: number, content: RoundContent) {
  const seen = await roundOf(world, round);
  const categories = seen.origin === 'random' ? seen.categories : null;
  return world.driver.tryToSetRound(await world.host(), round, {
    origin: 'random',
    categories,
    content,
  });
}

/** The dilemma the game plays in that round. */
async function dilemmaOfRound(world: GameWorld, round: number) {
  const host = await world.host();
  if (!(await world.driver.currentGameSeenBy(host))) await world.driver.startGame(host);
  const dilemmaId = (await world.driver.dilemmasOfTheGame())[round - 1];
  assert.ok(dilemmaId, `the game has no round ${round}`);
  return catalogEntryOf(dilemmaId);
}

/** Who is in the lobby now, the host first. */
function inTheLobby(world: GameWorld): string[] {
  return [...world.inRoom];
}

// Creating a room with an ambience.

Then(
  'the player sees the ambiences {string}, {string} and {string}, each with a description and an example dilemma',
  async function (this: GameWorld, first: string, second: string, third: string) {
    const offered = await this.driver.ambiencesToCreateWith(this.player);
    assert.deepEqual(
      offered.map(({ ambience }) => ambience),
      [first, second, third].map(ambienceCalled),
    );
    assert.ok(
      offered.every(({ described }) => described),
      'an ambience is not described',
    );
  },
);

Then('no ambience is selected', async function (this: GameWorld) {
  assert.equal(await this.driver.ambienceChosenBeforehand(this.player), false);
});

Then('the player cannot create the room without choosing one', async function (this: GameWorld) {
  assert.equal(await this.driver.canCreateRoomWithoutAmbience(this.player), false);
});

When(
  /^(?:a player|the host) creates a room with the ambience "([^"]*)"$/,
  async function (this: GameWorld, name: string) {
    this.beginRoomCreation(this.player ?? 'Ana', { ambience: ambienceCalled(name) });
    this.player = await this.host();
  },
);

When(
  'the player creates a room with the ambience {string}',
  async function (this: GameWorld, name: string) {
    const ambience = ambienceCalled(name);
    if (this.dilemmaToPlayWithTheGroup) {
      await this.driver.createTheRoomOfTheDilemma(ambience);
      return;
    }
    this.beginRoomCreation(this.player, { ambience });
    await this.host();
  },
);

Then(
  /^the room is (nominal|anonymous) and (from 16|adults only), with compromising dilemmas (on|off)$/,
  async function (this: GameWorld, variant: string, age: string, compromising: string) {
    const settings = await this.driver.settingsSeenBy(await this.host());
    assert.equal(settings.variant, variant);
    assert.equal(settings.adultsOnly, age === 'adults only');
    assert.equal(settings.compromisingDilemmas, compromising === 'on');
  },
);

Then(
  /^it has 8 random rounds from every category with the contents (.+)$/,
  async function (this: GameWorld, contents: string) {
    const rounds = await this.driver.roundsSeenBy(await this.host());
    assert.deepEqual(
      rounds,
      contents.split(', ').map((content) => ({
        origin: 'random',
        categories: null,
        content: contentCalled(content),
      })),
    );
  },
);

Given(
  'a player who declared a birth year that makes them {int}',
  async function (this: GameWorld, age: number) {
    this.player = 'Ana';
    await declaredAge(this, this.player, age);
  },
);

Then(
  '{string} and {string} are turned off with the reason {string}',
  async function (this: GameWorld, first: string, second: string, reason: string) {
    const offered = await this.driver.ambiencesToCreateWith(this.player);
    for (const name of [first, second]) {
      const option = offered.find(({ ambience }) => ambience === ambienceCalled(name));
      assert.equal(option?.offBecause, reasonCalled(reason), `${name} is not off`);
    }
    const classic = offered.find(({ ambience }) => ambience === 'classic');
    assert.equal(classic?.offBecause, null, 'Classic is off too');
  },
);

// The ambience in the lobby and in the settings.

Given(
  /^a (?:host who (?:has just )?created a room|room) with the ambience "([^"]*)"$/,
  async function (this: GameWorld, name: string) {
    this.beginRoomCreation('Ana', { ambience: ambienceCalled(name) });
    await this.host();
  },
);

Given('a room created with the ambience {string}', async function (this: GameWorld, name: string) {
  this.beginRoomCreation('Ana', { ambience: ambienceCalled(name) });
  await this.host();
});

When('the host changes the time per dilemma', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { timePerDilemmaSeconds: 90 });
});

Then(
  'everyone in the lobby sees that the room is {string}',
  async function (this: GameWorld, name: string) {
    const expected = SHOWN[name];
    assert.ok(expected, `The steps do not know the ambience "${name}"`);
    if (this.dilemmaToPlayWithTheGroup) {
      assert.equal(await this.driver.ambienceOfTheVisitorRoom(), expected);
      return;
    }
    for (const viewer of inTheLobby(this)) {
      assert.equal(await this.driver.ambienceSeenBy(viewer), expected, `as ${viewer} sees it`);
    }
  },
);

When('the host sets round {int} to any content', async function (this: GameWorld, round: number) {
  assert.ok(await setContent(this, round, 'any'), `round ${round} does not take any content`);
});

Given('the host set round {int} to any content', async function (this: GameWorld, round: number) {
  assert.ok(await setContent(this, round, 'any'), `round ${round} does not take any content`);
});

Given('the host changed nothing', async function (this: GameWorld) {
  await this.host();
});

Then('round {int} is random with any content', async function (this: GameWorld, round: number) {
  const seen = await roundOf(this, round);
  assert.equal(seen.origin, 'random');
  assert.equal(seen.origin === 'random' && seen.content, 'any');
});

Then(
  'the room keeps every other setting of {string}',
  async function (this: GameWorld, name: string) {
    const ambience = ambienceCalled(name);
    const host = await this.host();
    const settings = await this.driver.settingsSeenBy(host);
    assert.equal(settings.variant, ambience === 'no-filter' ? 'anonymous' : 'nominal');
    assert.equal(settings.adultsOnly, ambience !== 'classic');
    assert.equal(settings.compromisingDilemmas, ambience === 'no-filter');
    const rounds = await this.driver.roundsSeenBy(host);
    const contents = CONTENTS_OF[ambience];
    rounds.forEach((round, index) => {
      if (index === 1) return;
      assert.deepEqual(round, { origin: 'random', categories: null, content: contents[index] });
    });
  },
);

Given(
  '{string} declared a birth year that makes him {int} and is in the lobby',
  async function (this: GameWorld, player: string, age: number) {
    await this.host();
    await declaredAge(this, player, age);
    await this.driver.joinRoom(player, player);
    this.inRoom.add(player);
  },
);

Then(
  'the host sees adults-only dilemmas, {string} and {string} turned off with the reason {string}',
  async function (this: GameWorld, first: string, second: string, reason: string) {
    const host = await this.host();
    const off = reasonCalled(reason);
    assert.equal((await this.driver.adultsOnlySwitchSeenBy(host)).offBecause, off);
    const offered = await this.driver.ambiencesInTheSettings(host);
    for (const name of [first, second]) {
      const option = offered.find(({ ambience }) => ambience === ambienceCalled(name));
      assert.equal(option?.offBecause, off, `${name} is not off`);
    }
  },
);

Then('the host can turn on adults-only dilemmas', async function (this: GameWorld) {
  const host = await this.host();
  assert.equal((await this.driver.adultsOnlySwitchSeenBy(host)).offBecause, null);
  await this.driver.changeSettings(host, { adultsOnly: true });
  assert.equal((await this.driver.settingsSeenBy(host)).adultsOnly, true);
});

Given(
  'a player who comes from the public page of {string}',
  async function (this: GameWorld, name: string) {
    this.dilemmaToPlayWithTheGroup = name;
    await this.driver.catalogDilemmaNamed(name);
    await this.driver.reviewArgumentsOf(name);
    await this.driver.generatePublicPages();
    await this.driver.playWithTheGroupFromThePublicPage(name);
  },
);

Then(
  'round {int} is {string} and rounds {int} to {int} follow {string}',
  async function (
    this: GameWorld,
    first: number,
    dilemma: string,
    from: number,
    to: number,
    name: string,
  ) {
    assert.equal(first, 1);
    assert.equal(await this.driver.firstRoundDilemmaOfTheVisitorRoom(), dilemma);
    const rounds = await this.driver.roundsOfTheVisitorRoom();
    const contents = CONTENTS_OF[ambienceCalled(name)];
    for (let round = from; round <= to; round += 1) {
      assert.deepEqual(rounds[round - 1], {
        origin: 'random',
        categories: null,
        content: contents[round - 1],
      });
    }
  },
);

Given(
  'an anonymous adults-only room with compromising dilemmas turned on',
  async function (this: GameWorld) {
    this.beginRoomCreation('Ana', { ambience: 'no-filter' });
    await this.host();
  },
);

When(
  'the host searches for the dilemma of round {int}',
  async function (this: GameWorld, round: number) {
    this.marked = await this.driver.searchWithMarks(await this.host(), round);
  },
);

Then(
  'the adults-only dilemmas are marked {string}',
  async function (this: GameWorld, mark: string) {
    // The mark of the screen, which the driver reads in the language of the app.
    assert.equal(mark, '+18');
    const marked = this.marked ?? [];
    const forAdults = marked.filter(({ dilemmaId }) => catalogEntryOf(dilemmaId).minimumAge === 18);
    assert.ok(forAdults.length > 0, 'the search shows no dilemma for adults');
    for (const dilemma of marked) {
      assert.equal(
        dilemma.markedAdultsOnly,
        catalogEntryOf(dilemma.dilemmaId).minimumAge === 18,
        `${dilemma.dilemmaId} is marked as it should not be`,
      );
    }
  },
);

Then(
  'the compromising dilemmas are marked {string}',
  async function (this: GameWorld, mark: string) {
    // The mark of the screen, which the driver reads in the language of the app.
    assert.equal(mark, 'Compromising');
    const marked = this.marked ?? [];
    assert.ok(
      marked.some(({ dilemmaId }) => catalogEntryOf(dilemmaId).compromising),
      'the search shows no compromising dilemma',
    );
    for (const dilemma of marked) {
      assert.equal(
        dilemma.markedCompromising,
        catalogEntryOf(dilemma.dilemmaId).compromising,
        `${dilemma.dilemmaId} is marked as it should not be`,
      );
    }
  },
);

Given(
  'has set the dilemma language to English and the time per dilemma to {int} seconds',
  async function (this: GameWorld, seconds: number) {
    await this.driver.changeSettings(await this.host(), {
      dilemmaLanguage: 'en',
      timePerDilemmaSeconds: seconds,
    });
  },
);

Given(
  'has chosen a specific dilemma for round {int}',
  async function (this: GameWorld, round: number) {
    // Test data: one written in English, the language the room plays in now.
    const dilemmaId = 'in-english-1';
    assert.ok(
      await this.driver.tryToSetRound(await this.host(), round, { origin: 'specific', dilemmaId }),
      `round ${round} does not take a specific dilemma`,
    );
  },
);

When(
  'the host chooses the ambience {string} in the settings',
  async function (this: GameWorld, name: string) {
    await this.driver.chooseAmbience(await this.host(), ambienceCalled(name));
  },
);

Then('the room has the configuration of {string}', async function (this: GameWorld, name: string) {
  assert.equal(await this.driver.ambienceSeenBy(await this.host()), ambienceCalled(name));
});

Then('round {int} is random', async function (this: GameWorld, round: number) {
  assert.equal((await roundOf(this, round)).origin, 'random');
});

Then(
  'the dilemma language is English and the time per dilemma is {int} seconds',
  async function (this: GameWorld, seconds: number) {
    const settings = await this.driver.settingsSeenBy(await this.host());
    assert.equal(settings.dilemmaLanguage, 'en');
    assert.equal(settings.timePerDilemmaSeconds, seconds);
  },
);

Then(
  'the game context records the ambience {string}',
  async function (this: GameWorld, name: string) {
    assert.equal((await this.driver.settingsOfTheGame()).ambience, SHOWN[name]);
  },
);

// Compromising dilemmas.

Given('has made the room anonymous', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { variant: 'anonymous' });
});

Then('compromising dilemmas are turned off', async function (this: GameWorld) {
  assert.equal((await this.driver.settingsSeenBy(await this.host())).compromisingDilemmas, false);
});

Given(
  /^a host in the lobby of (a nominal|an anonymous|an adults-only) room$/,
  async function (this: GameWorld, kind: string) {
    const host = await this.host();
    if (kind === 'an anonymous') await this.driver.changeSettings(host, { variant: 'anonymous' });
    if (kind === 'an adults-only') await this.driver.changeSettings(host, { adultsOnly: true });
  },
);

Given('a host in the lobby of a room not marked as adults only', async function (this: GameWorld) {
  assert.equal((await this.driver.settingsSeenBy(await this.host())).adultsOnly, false);
});

Given(
  /^(?:an anonymous room with compromising dilemmas turned on|a host in the lobby of an anonymous room with compromising dilemmas turned on)$/,
  async function (this: GameWorld) {
    const host = await this.host();
    await this.driver.changeSettings(host, { variant: 'anonymous' });
    await this.driver.changeSettings(host, { compromisingDilemmas: true });
  },
);

When(
  /^(?:the host|"([^"]*)") turns on compromising dilemmas$/,
  async function (this: GameWorld, player: string | undefined) {
    const host = await this.host();
    if (player) assert.equal(player, host);
    await this.driver.changeSettings(host, { compromisingDilemmas: true });
  },
);

Then('the game can include compromising dilemmas', async function (this: GameWorld) {
  assert.equal((await this.driver.settingsSeenBy(await this.host())).compromisingDilemmas, true);
});

Then(
  'everyone in the lobby sees that the room includes compromising dilemmas',
  async function (this: GameWorld) {
    for (const viewer of inTheLobby(this)) {
      const settings = await this.driver.settingsSeenBy(viewer);
      assert.equal(settings.compromisingDilemmas, true, `as ${viewer} sees it`);
    }
  },
);

Then(
  'the host sees compromising dilemmas turned off with the reason {string}',
  async function (this: GameWorld, reason: string) {
    const seen = await this.driver.compromisingSwitchSeenBy(await this.host());
    assert.equal(seen.offBecause, reasonCalled(reason));
  },
);

Then('the host cannot turn them on', async function (this: GameWorld) {
  const host = await this.host();
  assert.equal((await this.driver.compromisingSwitchSeenBy(host)).on, false);
  assert.equal((await this.driver.settingsSeenBy(host)).compromisingDilemmas, false);
});

When('the host makes the room nominal', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { variant: 'nominal' });
});

Then('they stay off if the host makes the room anonymous again', async function (this: GameWorld) {
  const host = await this.host();
  await this.driver.changeSettings(host, { variant: 'anonymous' });
  assert.equal((await this.driver.settingsSeenBy(host)).compromisingDilemmas, false);
});

Given('a room with compromising dilemmas turned off', async function (this: GameWorld) {
  assert.equal((await this.driver.settingsSeenBy(await this.host())).compromisingDilemmas, false);
});

When(
  'a game of {int} random rounds is put together',
  async function (this: GameWorld, count: number) {
    const host = await this.host();
    await this.driver.setRounds(
      host,
      Array.from({ length: count }, () => ({ origin: 'random', categories: null })),
    );
    await this.driver.startGame(host);
  },
);

Then('none of its dilemmas is compromising', async function (this: GameWorld) {
  const dilemmas = await this.driver.dilemmasOfTheGame();
  assert.ok(dilemmas.length > 0, 'the game has no dilemmas');
  for (const dilemmaId of dilemmas) {
    assert.equal(catalogEntryOf(dilemmaId).compromising, false, `${dilemmaId} is compromising`);
  }
});

Then('no compromising dilemma is shown', async function (this: GameWorld) {
  const shown = await this.driver.searchWithMarks(await this.host(), 1);
  assert.ok(shown.length > 0, 'the search shows nothing');
  assert.ok(shown.every(({ dilemmaId }) => !catalogEntryOf(dilemmaId).compromising));
});

// The content of the random rounds.

When(
  /^the host sets round (\d+) to (adults-only|compromising) content$/,
  async function (this: GameWorld, round: string, content: string) {
    assert.ok(
      await setContent(this, Number(round), contentCalled(content)),
      `round ${round} does not take ${content} content`,
    );
  },
);

Then(
  /^round (\d+) plays (?:an adults-only|a compromising) dilemma$/,
  async function (this: GameWorld, round: string) {
    const seen = await roundOf(this, Number(round));
    const entry = await dilemmaOfRound(this, Number(round));
    if (seen.origin === 'random' && seen.content === 'adults-only') {
      assert.equal(entry.minimumAge, 18);
    } else {
      assert.equal(entry.compromising, true);
    }
  },
);

Then(
  'the host sees the adults-only content of a random round turned off',
  async function (this: GameWorld) {
    const off = await this.driver.contentsOffFor(await this.host(), 1);
    assert.ok(off.includes('adults-only'), 'the host can choose adults-only content');
  },
);

Given(
  'an adults-only anonymous room with compromising dilemmas turned on',
  async function (this: GameWorld) {
    const host = await this.host();
    await this.driver.changeSettings(host, { variant: 'anonymous', adultsOnly: true });
    await this.driver.changeSettings(host, { compromisingDilemmas: true });
  },
);

Given(
  /^round (\d+) is random with (adults-only|compromising) content$/,
  async function (this: GameWorld, round: string, content: string) {
    assert.ok(await setContent(this, Number(round), contentCalled(content)));
  },
);

When('the host turns off compromising dilemmas', async function (this: GameWorld) {
  await this.driver.changeSettings(await this.host(), { compromisingDilemmas: false });
});

// The content of the rounds when the game is put together.

Given(
  /^an (adults-only|anonymous) room (?:with compromising dilemmas turned on )?whose round (\d+) is random(?: from "([^"]*)")? with (adults-only|compromising) content$/,
  async function (
    this: GameWorld,
    kind: string,
    round: string,
    category: string | undefined,
    content: string,
  ) {
    const host = await this.host();
    if (kind === 'adults-only') await this.driver.changeSettings(host, { adultsOnly: true });
    else {
      await this.driver.changeSettings(host, { variant: 'anonymous' });
      await this.driver.changeSettings(host, { compromisingDilemmas: true });
    }
    assert.ok(
      await this.driver.tryToSetRound(host, Number(round), {
        origin: 'random',
        categories: category ? [category as never] : null,
        content: contentCalled(content),
      }),
    );
  },
);

Given(
  'there are no adults-only dilemmas of {string} left to play',
  function (this: GameWorld, category: string) {
    // Test data: the catalog has no dilemma of that category for adults.
    assert.equal(category, 'honesty');
  },
);

Then(
  /^the dilemma of round (\d+) is (adults only|compromising)$/,
  async function (this: GameWorld, round: string, content: string) {
    const entry = await dilemmaOfRound(this, Number(round));
    if (content === 'adults only') assert.equal(entry.minimumAge, 18);
    else assert.equal(entry.compromising, true);
  },
);

Then(
  'the dilemma of round {int} is a {string} dilemma of any content',
  async function (this: GameWorld, round: number, category: string) {
    const entry = await dilemmaOfRound(this, round);
    assert.equal(entry.category, category);
  },
);

Then(
  'no five consecutive rounds have more than one game theory dilemma',
  async function (this: GameWorld) {
    const kinds = (await this.driver.dilemmasOfTheGame()).map(
      (dilemmaId) => catalogEntryOf(dilemmaId).type === 'game-theory',
    );
    for (let start = 0; start + 5 <= kinds.length; start += 1) {
      assert.ok(kinds.slice(start, start + 5).filter(Boolean).length <= 1);
    }
  },
);

// Joining a room with an ambience, and the warning of compromising dilemmas.

Then(
  'the player sees that the room is {string}, anonymous, with adults-only dilemmas and with compromising dilemmas before entering',
  async function (this: GameWorld, name: string) {
    const preview = await this.driver.roomPreviewSeenBy(this.player);
    assert.ok(preview, 'the player sees no room');
    assert.equal(preview.ambience, ambienceCalled(name));
    assert.equal(preview.variant, 'anonymous');
    assert.equal(preview.adultsOnly, true);
    assert.equal(preview.compromisingDilemmas, true);
  },
);

Then(
  '{string} is warned that the game includes compromising dilemmas before playing',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.warnedAboutCompromisingDilemmas(player), true);
  },
);

Then('{string} can stay in the room or leave it', async function (this: GameWorld, player: string) {
  // The warning offers both: staying is the room going on with them in it.
  assert.ok((await this.driver.playersSeenBy(player)).some(({ nickname }) => nickname === player));
});

Given(
  'an anonymous room with {string} as host and {string} and {string} in the lobby',
  async function (this: GameWorld, host: string, first: string, second: string) {
    await this.hostIs(host);
    await this.driver.changeSettings(host, { variant: 'anonymous' });
    await this.isInTheRoom(first);
    await this.isInTheRoom(second);
  },
);

Then(
  '{string} and {string} are warned that the game includes compromising dilemmas',
  async function (this: GameWorld, first: string, second: string) {
    for (const player of [first, second]) {
      assert.equal(await this.driver.warnedAboutCompromisingDilemmas(player), true, player);
    }
  },
);

Then('{string} is not warned', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.warnedAboutCompromisingDilemmas(player), false);
});

Given(
  '{string} sees the warning about compromising dilemmas',
  async function (this: GameWorld, player: string) {
    const host = await this.host();
    await this.driver.changeSettings(host, { variant: 'anonymous' });
    await this.driver.changeSettings(host, { compromisingDilemmas: true });
    await this.isInTheRoom(player);
    assert.equal(await this.driver.warnedAboutCompromisingDilemmas(player), true);
  },
);

When('{string} leaves the room from the warning', async function (this: GameWorld, player: string) {
  await this.driver.leaveFromTheWarning(player);
  this.inRoom.delete(player);
});

Then('nobody in the lobby sees {string}', async function (this: GameWorld, player: string) {
  for (const viewer of inTheLobby(this)) {
    const seen = (await this.driver.playersSeenBy(viewer)).map(({ nickname }) => nickname);
    assert.ok(!seen.includes(player), `${viewer} still sees ${player}`);
  }
});

When(
  '{string} tries to choose a compromising catalog dilemma for round {int}',
  async function (this: GameWorld, player: string, round: number) {
    await this.isInTheRoom(player);
    this.dilemmaId = 'compromising-1';
    this.accepted = await this.driver.chooseRoundDilemma(player, round, this.dilemmaId);
  },
);

Then('{string} is told why', async function (this: GameWorld, player: string) {
  // The search of the lobby only shows dilemmas that suit the room, and says so.
  assert.equal(this.accepted, false);
  assert.equal(await this.driver.onlySuitableDilemmasExplainedTo(player), true);
});
