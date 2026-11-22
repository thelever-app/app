import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { catalogDilemmasSuiting, GAP_DILEMMA_IDS } from '../support/test-catalog.ts';
import type { CatalogEntry } from '../support/driver.ts';
import type { GameWorld } from '../support/world.ts';

/** The rounds the steps compose games with: as many as a scenario says, random from every category. */
async function randomRoundsOfEveryCategory(world: GameWorld, count: number): Promise<void> {
  world.requestGame();
  world.beforeTheGame();
  await world.driver.setRounds(
    await world.host(),
    Array.from({ length: count }, () => ({
      origin: 'random',
      categories: null,
      content: { age: 'any', compromising: 'any' },
    })),
  );
}

/** The dilemmas of the catalog of the test data the room plays, by its settings. */
async function suitable(world: GameWorld): Promise<string[]> {
  const { adultsOnly } = await world.driver.settingsSeenBy(await world.host());
  return catalogDilemmasSuiting(await world.driver.languageOfTheRoom(), adultsOnly ? 18 : 16);
}

function entriesOf(world: GameWorld): CatalogEntry[] {
  assert.ok(world.dilemmas.length > 0, 'no step put the game together');
  return world.dilemmas.map((dilemmaId) => world.driver.catalogEntryOf(dilemmaId));
}

/** Whether some rounds in a row of that many have more of them than allowed. */
function windows(
  kinds: readonly boolean[],
  size: number,
  broken: (count: number) => boolean,
): number[] {
  const starts: number[] = [];
  for (let start = 0; start + size <= kinds.length; start += 1) {
    if (broken(kinds.slice(start, start + size).filter(Boolean).length)) starts.push(start + 1);
  }
  return starts;
}

Given(
  'a game of {int} random rounds from every category',
  async function (this: GameWorld, count: number) {
    await randomRoundsOfEveryCategory(this, count);
  },
);

Given(
  'an adults-only room with a game of {int} random rounds from every category',
  async function (this: GameWorld, count: number) {
    await this.driver.changeSettings(await this.host(), { adultsOnly: true });
    await randomRoundsOfEveryCategory(this, count);
  },
);

Given(
  /^there are enough suitable dilemmas that are not (game theory|would-you-rather) dilemmas$/,
  async function (this: GameWorld, kind: string) {
    const type = kind === 'game theory' ? 'game-theory' : 'would-you-rather';
    const others = (await suitable(this)).filter(
      (dilemmaId) => this.driver.catalogEntryOf(dilemmaId).type !== type,
    );
    const ofTheKind = (await suitable(this)).length - others.length;
    assert.ok(others.length >= 10, `the test data has ${others.length} others`);
    assert.ok(ofTheKind >= 5, `the test data has ${ofTheKind} ${kind} dilemmas, too few to space`);
  },
);

Given('there are enough suitable dilemmas that are not extreme', async function (this: GameWorld) {
  const scales = (await suitable(this)).map(
    (dilemmaId) => this.driver.catalogEntryOf(dilemmaId).scale,
  );
  assert.ok(scales.filter((scale) => scale !== 'extreme').length >= 10);
  assert.ok(scales.filter((scale) => scale === 'extreme').length >= 3);
});

Given('there are enough adults-only dilemmas', async function (this: GameWorld) {
  const ages = (await suitable(this)).map(
    (dilemmaId) => this.driver.catalogEntryOf(dilemmaId).minimumAge,
  );
  assert.ok(ages.filter((age) => age === 18).length >= 2);
});

Then(
  /^no two (game theory|would-you-rather) dilemmas are in consecutive rounds$/,
  function (this: GameWorld, kind: string) {
    const type = kind === 'game theory' ? 'game-theory' : 'would-you-rather';
    const ofTheKind = entriesOf(this).map((entry) => entry.type === type);
    assert.deepEqual(
      windows(ofTheKind, 2, (count) => count > 1),
      [],
      `rounds in a row with two ${kind} dilemmas`,
    );
  },
);

Then('no five consecutive rounds have more than one extreme dilemma', function (this: GameWorld) {
  const extreme = entriesOf(this).map(({ scale }) => scale === 'extreme');
  assert.deepEqual(
    windows(extreme, 5, (count) => count > 1),
    [],
    'five rounds in a row with two extreme dilemmas',
  );
});

Then(
  'every five consecutive rounds include at least one adults-only dilemma',
  function (this: GameWorld) {
    const forAdults = entriesOf(this).map(({ minimumAge }) => minimumAge === 18);
    assert.deepEqual(
      windows(forAdults, 5, (count) => count === 0),
      [],
      'five rounds in a row without a dilemma for adults',
    );
  },
);

// The history of the players

/** What the device of each player of the scenario played, by their name. */
const histories = new WeakMap<GameWorld, Map<string, string[]>>();

function historiesOf(world: GameWorld): Map<string, string[]> {
  const known = histories.get(world) ?? new Map<string, string[]>();
  histories.set(world, known);
  return known;
}

/** The devices of those players say they played that, which they tell the room as they enter it again. */
async function havePlayed(world: GameWorld, played: ReadonlyMap<string, string[]>): Promise<void> {
  world.beforeTheGame();
  for (const [player, dilemmaIds] of played) {
    historiesOf(world).set(player, dilemmaIds);
    await world.driver.playedOnTheirDevice(player, dilemmaIds);
  }
}

/** The standard, everyday dilemmas without the gap, which no spacing rule ever puts off. */
async function plainSuitable(world: GameWorld): Promise<string[]> {
  return (await suitable(world)).filter((dilemmaId) => {
    const { type, scale, hasGap } = world.driver.catalogEntryOf(dilemmaId);
    return type === 'standard' && scale === 'everyday' && !hasGap;
  });
}

Given(
  /^"([^"]+)" has (\d+) catalog dilemmas in his history and "([^"]+)" has (\d+)$/,
  async function (
    this: GameWorld,
    first: string,
    firstCount: string,
    second: string,
    count: string,
  ) {
    const catalog = await suitable(this);
    const firsts = catalog.slice(0, Number(firstCount));
    const seconds = catalog.slice(Number(firstCount), Number(firstCount) + Number(count));
    await havePlayed(
      this,
      new Map([
        [first, firsts],
        [second, seconds],
      ]),
    );
  },
);

Given(
  'there are enough suitable dilemmas that nobody in the room has played',
  async function (this: GameWorld) {
    const played = new Set([...historiesOf(this).values()].flat());
    const left = (await suitable(this)).filter((dilemmaId) => !played.has(dilemmaId));
    assert.ok(left.length >= 10, `only ${left.length} dilemmas nobody played`);
  },
);

When(
  /^a game of (\d+) random rounds from every category( without new dilemmas)? is put together$/,
  async function (this: GameWorld, count: string, withoutNewDilemmas: string | undefined) {
    await randomRoundsOfEveryCategory(this, Number(count));
    if (withoutNewDilemmas) {
      await this.driver.changeSettings(await this.host(), { newDilemmas: false });
    }
    await this.game();
    this.dilemmas = await this.driver.dilemmasOfTheGame();
  },
);

Then(
  'none of the dilemmas in the history of {string}, {string} or {string} is chosen',
  function (this: GameWorld, first: string, second: string, third: string) {
    const played = new Set(
      [first, second, third].flatMap((player) => historiesOf(this).get(player) ?? []),
    );
    assert.ok(played.size > 0, 'nobody has a history');
    assert.deepEqual(
      this.dilemmas.filter((dilemmaId) => played.has(dilemmaId)),
      [],
    );
  },
);

/** The dilemmas a step left unplayed, and those only one player played, by that player. */
const unplayed = new WeakMap<GameWorld, string[]>();

Given(
  'there are only {int} suitable dilemmas that nobody in the room has played',
  async function (this: GameWorld, count: number) {
    const left = (await plainSuitable(this)).slice(0, count);
    assert.equal(left.length, count, 'the test data has too few plain dilemmas');
    unplayed.set(this, left);
    // Everyone has played the rest, until a step says otherwise.
    const rest = (await suitable(this)).filter((dilemmaId) => !left.includes(dilemmaId));
    await havePlayed(this, new Map([...this.inRoom].map((player) => [player, rest])));
  },
);

Given(
  '{int} suitable dilemmas are only in the history of {string}',
  async function (this: GameWorld, count: number, player: string) {
    const left = unplayed.get(this) ?? [];
    const theirs = (await plainSuitable(this))
      .filter((dilemmaId) => !left.includes(dilemmaId))
      .slice(0, count);
    assert.equal(theirs.length, count, 'the test data has too few plain dilemmas');
    const others = new Map(
      [...this.inRoom]
        .filter((other) => other !== player)
        .map((other) => [
          other,
          (historiesOf(this).get(other) ?? []).filter((dilemmaId) => !theirs.includes(dilemmaId)),
        ]),
    );
    await havePlayed(this, others);
    historiesOf(this).set(`only ${player}`, theirs);
  },
);

Given(
  '{int} suitable dilemmas are in the history of {string}, {string} and {string}',
  function (this: GameWorld, count: number, first: string, second: string, third: string) {
    const [one, ...rest] = [first, second, third].map((player) => historiesOf(this).get(player));
    const shared = (one ?? []).filter((dilemmaId) =>
      rest.every((history) => history?.includes(dilemmaId)),
    );
    assert.ok(shared.length >= count, `only ${shared.length} dilemmas in everyone's history`);
  },
);

Then(
  'the game has the {int} dilemmas nobody has played and the {int} only {string} has played',
  function (this: GameWorld, unplayedCount: number, onlyCount: number, player: string) {
    const left = unplayed.get(this) ?? [];
    const theirs = historiesOf(this).get(`only ${player}`) ?? [];
    assert.equal(left.length, unplayedCount);
    assert.equal(theirs.length, onlyCount);
    assert.deepEqual([...this.dilemmas].sort(), [...left, ...theirs].sort());
  },
);

// Dilemmas about someone in the group need enough players

const GAP = 'someone in the group';

Given(
  /^a (nominal|anonymous) room with (\d+) players$/,
  async function (this: GameWorld, variant: 'nominal' | 'anonymous', count: string) {
    const host = await this.host();
    if (variant === 'anonymous') await this.driver.changeSettings(host, { variant });
    for (let number = this.inRoom.size + 1; number <= Number(count); number += 1) {
      await this.isInTheRoom(`Player ${number}`);
    }
    assert.equal(this.inRoom.size, Number(count));
  },
);

Given(
  /^the host chose a dilemma with the gap "([^"]+)" for (?:a specific|the first) round$/,
  async function (this: GameWorld, gap: string) {
    assert.equal(gap, GAP);
    const [dilemmaId] = GAP_DILEMMA_IDS;
    assert.ok(dilemmaId, 'the test data has no dilemma with the gap');
    const accepted = await this.driver.tryToSetRound(await this.host(), 1, {
      origin: 'specific',
      dilemmaId,
    });
    assert.ok(accepted, 'the room did not take the dilemma with the gap');
    this.dilemmaId = dilemmaId;
  },
);

Given(
  'a player chose a dilemma with the gap {string} for a round of the players',
  async function (this: GameWorld, gap: string) {
    assert.equal(gap, GAP);
    const host = await this.host();
    assert.ok(await this.driver.tryToSetRound(host, 1, { origin: 'players' }));
    const [player] = await this.guests();
    const [dilemmaId] = GAP_DILEMMA_IDS;
    assert.ok(player && dilemmaId);
    assert.ok(await this.driver.chooseRoundDilemma(player, 1, dilemmaId));
    this.dilemmaId = dilemmaId;
  },
);

Then(
  /^the dilemma with the gap is (played|left out of the game)$/,
  async function (this: GameWorld, result: string) {
    const dilemmas = await this.driver.dilemmasOfTheGame();
    assert.equal(dilemmas.includes(this.dilemmaId), result === 'played');
  },
);

Then(
  'the first round plays a random dilemma from every category',
  async function (this: GameWorld) {
    const [first] = await this.driver.dilemmasOfTheGame();
    assert.ok(first, 'the game has no first round');
    assert.notEqual(first, this.dilemmaId);
    assert.equal(this.driver.catalogEntryOf(first).hasGap, false);
  },
);

Then('the game has {int} dilemmas', async function (this: GameWorld, count: number) {
  this.dilemmas = await this.driver.dilemmasOfTheGame();
  assert.equal(this.dilemmas.length, count);
});

Then('none of them has the gap {string}', function (this: GameWorld, gap: string) {
  assert.equal(gap, GAP);
  assert.deepEqual(
    this.dilemmas.filter((dilemmaId) => this.driver.catalogEntryOf(dilemmaId).hasGap),
    [],
  );
});

When('the players are in the lobby', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.ok(await this.driver.isInTheLobby(player), `${player} is not in the lobby`);
  }
});

Then(
  'every player sees that a dilemma about someone in the group needs at least {int} players',
  async function (this: GameWorld, minimum: number) {
    for (const player of this.present()) {
      assert.equal(await this.driver.gapWarningSeenBy(player), minimum, `${player} is not warned`);
    }
  },
);

Then('the host can still start the game', async function (this: GameWorld) {
  const host = await this.host();
  await this.driver.tryToStartGame(host);
  assert.ok(await this.driver.currentGameSeenBy(host), 'the game did not start');
});
