import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { CardView, ResultsScreenView } from '../support/driver.ts';
import { OPTION_TEXTS } from '../support/test-catalog.ts';
import { SOMEONE, type GameWorld } from '../support/world.ts';

const [PULL, WAIT] = OPTION_TEXTS;
const TITLES = [
  'Almas gemelas',
  'Verso suelto',
  'La voz del grupo',
  'Imán de reacciones',
  'Enigma',
  'Libro abierto',
  'El Mentalista',
];

/** Whether a prediction of a player about another one is right. */
type Guess = (predictor: string, about: string, position: number) => boolean;

/** The other option. */
function otherThan(vote: string): string {
  return vote === PULL ? WAIT : PULL;
}

/**
 * Each round, as the scenario says: what each one votes, the first option for who it does not
 * name, and whether each prediction is right, all of them unless `guess` says.
 */
function play(
  world: GameWorld,
  rounds: readonly Readonly<Record<string, string>>[],
  guess: Guess = () => true,
): void {
  world.beforeTheGame();
  const players = [...world.inRoom];
  rounds.forEach((named, index) => {
    const position = index + 1;
    const votes = Object.fromEntries(players.map((player) => [player, named[player] ?? PULL]));
    for (const player of players) {
      world.plan(position, player, {
        vote: votes[player]!,
        predictions: players
          .filter((other) => other !== player)
          .map((other) => ({
            player: other,
            vote: guess(player, other, position) ? votes[other]! : otherThan(votes[other]!),
          })),
      });
    }
  });
}

/** The same votes in every round of the game. */
function everyRound(
  world: GameWorld,
  votes: Readonly<Record<string, string>> = {},
): Record<string, string>[] {
  return Array.from({ length: world.dilemmaCount ?? 3 }, () => ({ ...votes }));
}

/** `by` reacts to the vote of `to` in the round in that position (from 1). */
function reactsIn(world: GameWorld, position: number, by: string, to: string | null): void {
  const reactions = world.reactions.get(position) ?? [];
  reactions.push({ player: by, to, emoji: '😮' });
  world.reactions.set(position, reactions);
}

/**
 * A game where every title has a winner: `reader` predicts everyone right, so they are El
 * Mentalista and Libro abierto; the other two each predict `reader` right and each other wrong;
 * the last one is with the minority twice; and the vote of `magnet` gets a reaction.
 */
export function everyTitle(world: GameWorld, reader: string, magnet = reader): void {
  const [first, second] = [...world.inRoom].filter((player) => player !== reader) as [
    string,
    string,
  ];
  play(
    world,
    [
      { [reader]: PULL, [first]: PULL, [second]: WAIT },
      { [reader]: PULL, [first]: PULL, [second]: WAIT },
      { [reader]: PULL, [first]: WAIT, [second]: WAIT },
    ],
    (predictor, about) => predictor === reader || about === reader,
  );
  reactsIn(world, 1, magnet === reader ? first : reader, magnet);
}

/** The screen of the results `viewer` is on. */
async function screenOf(world: GameWorld, viewer: string): Promise<ResultsScreenView> {
  const seen = await world.driver.resultsScreenSeenBy(viewer);
  assert.ok(seen, `${viewer} sees no screen of the results`);
  return seen;
}

/** Everyone moves on, screen by screen, until the one `found` recognises. */
async function toTheScreen(
  world: GameWorld,
  found: (screen: ResultsScreenView) => boolean,
): Promise<void> {
  await world.toTheResults();
  const viewer = world.present()[0]!;
  for (let moves = 0; !found(await screenOf(world, viewer)); moves += 1) {
    assert.ok(moves < 10, 'the screen never comes');
    await world.everyoneMovesOn();
  }
}

async function titleNamed(world: GameWorld, title: string) {
  const titles = await world.driver.titlesOfTheGame();
  return titles.find((candidate) => candidate.title === title);
}

// The room

Given(
  'a nominal room with players {string}, {string} and {string}',
  async function (this: GameWorld, first: string, second: string, third: string) {
    await this.hostIs(first);
    for (const guest of [second, third]) await this.isInTheRoom(guest);
    assert.equal((await this.driver.settingsSeenBy(first)).variant, 'nominal');
    this.variant = 'nominal';
    this.dilemmaCount = 3;
    this.requestGame();
  },
);

Given(
  'a nominal room with players {string}, {string}, {string} and {string}',
  async function (this: GameWorld, first: string, second: string, third: string, fourth: string) {
    await this.hostIs(first);
    for (const guest of [second, third, fourth]) await this.isInTheRoom(guest);
    this.variant = 'nominal';
    this.dilemmaCount = 3;
    this.requestGame();
  },
);

// The time spent on each dilemma

Given(
  'the reveal was on the first dilemma for {int} seconds',
  async function (this: GameWorld, seconds: number) {
    await this.toRevealOf(1);
    await this.driver.letTimePass(seconds);
  },
);

Then(
  '{int} seconds are recorded for the first dilemma',
  async function (this: GameWorld, seconds: number) {
    assert.equal(await this.driver.timeSpentRecordedFor(1), seconds);
    this.timeSpentSeconds = seconds;
  },
);

// Likes

When('{string} likes the dilemma', async function (this: GameWorld, player: string) {
  await this.driver.like(player);
});

Then('the like counts for the rating of the dilemma', async function (this: GameWorld) {
  assert.equal(await this.driver.likesCountedFor(1), 1);
});

Given(
  '{string} already liked the first dilemma in a previous game',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.likedBefore(player, 1);
    this.player = player;
  },
);

When('the reveal is on that dilemma again', async function (this: GameWorld) {
  await this.toRevealOf(1);
  await this.driver.like(this.player);
});

Then('the like of {string} is not counted twice', async function (this: GameWorld, player: string) {
  assert.ok(await this.driver.likeRecordedFor(player, 1), `${player} has no like`);
  assert.equal(await this.driver.likesCountedFor(1), 1);
});

When('{string} takes back the like', async function (this: GameWorld, player: string) {
  await this.driver.unlike(player);
});

Then('the like no longer counts for the rating of the dilemma', async function (this: GameWorld) {
  assert.equal(await this.driver.likesCountedFor(1), 0);
});

Given(
  '{string} liked the first dilemma during its reveal',
  async function (this: GameWorld, player: string) {
    await this.toRevealOf(1);
    await this.driver.like(player);
  },
);

When(
  '{string} takes back the like to the first dilemma',
  async function (this: GameWorld, player: string) {
    await this.driver.unlike(player, 1);
  },
);

Then(
  'the like of {string} still counts for the first dilemma',
  async function (this: GameWorld, player: string) {
    assert.ok(await this.driver.likeRecordedFor(player, 1), `${player} has no like`);
    assert.equal(await this.driver.likesCountedFor(1), 1);
  },
);

// Reactions

When('{string} reacts to the dilemma', async function (this: GameWorld, player: string) {
  await this.toRevealOf(1);
  await this.driver.react(player, null);
  this.player = player;
});

Then('all players see the reaction', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const { dilemma } = await this.driver.reactionsSeenBy(viewer);
    assert.ok(
      dilemma.some(({ by, count }) => by.includes(this.player) || (by.length === 0 && count > 0)),
      `${viewer} does not see the reaction`,
    );
  }
});

Then(
  'the reaction is recorded as from {string} to the first dilemma',
  async function (this: GameWorld, player: string) {
    const recorded = await this.driver.reactionsRecorded();
    assert.ok(
      recorded.some(({ by, about, position }) => by === player && about === null && position === 1),
    );
  },
);

Given(
  '{string} has reacted to the first dilemma',
  async function (this: GameWorld, player: string) {
    await this.toRevealOf(1);
    await this.driver.react(player, null, '😂');
  },
);

When('{string} reacts again to it', async function (this: GameWorld, player: string) {
  await this.driver.react(player, null, '🤔');
});

Then('only his latest reaction is kept', async function (this: GameWorld) {
  const kept = (await this.driver.reactionsRecorded()).filter(({ about }) => about === null);
  assert.deepEqual(
    kept.map(({ by, emoji }) => ({ by, emoji })),
    [{ by: kept[0]?.by, emoji: '🤔' }],
  );
});

When(
  '{string} reacts to the dilemma and likes it',
  async function (this: GameWorld, player: string) {
    await this.toRevealOf(1);
    await this.driver.react(player, null);
    await this.driver.like(player);
    this.player = player;
  },
);

Then(
  'his reaction and his like record that there is no research consent and no commercial licence consent',
  async function (this: GameWorld) {
    const reaction = (await this.driver.reactionsRecorded()).find(({ by }) => by === this.player);
    const like = await this.driver.likeRecordedFor(this.player, 1);
    for (const kept of [reaction, like]) {
      assert.ok(kept, 'nothing was recorded');
      assert.equal(kept.researchConsent, false);
      assert.equal(kept.commercialLicenceConsent, false);
    }
  },
);

Then(
  'both are marked as given by a player under {int}',
  async function (this: GameWorld, age: number) {
    assert.equal(age, 18);
    const reaction = (await this.driver.reactionsRecorded()).find(({ by }) => by === this.player);
    assert.equal(reaction?.underEighteen, true);
    assert.equal((await this.driver.likeRecordedFor(this.player, 1))?.underEighteen, true);
  },
);

When(
  '{string} reacts to the vote of {string}',
  async function (this: GameWorld, player: string, about: string) {
    await this.driver.react(player, about);
  },
);

When('{string} reacts to his own vote', async function (this: GameWorld, player: string) {
  await this.driver.react(player, player);
});

async function seeTheReactionOn(world: GameWorld, player: string, about: string): Promise<void> {
  for (const viewer of world.present()) {
    const { votes } = await world.driver.reactionsSeenBy(viewer);
    assert.ok(
      votes.some((reaction) => reaction.by === player && reaction.about === about),
      `${viewer} does not see the reaction of ${player} on the vote of ${about}`,
    );
  }
}

Then(
  'all players see the reaction of {string} on the vote of {string}',
  async function (this: GameWorld, player: string, about: string) {
    await seeTheReactionOn(this, player, about);
  },
);

Then(
  'all players see the reaction of {string} on his own vote',
  async function (this: GameWorld, player: string) {
    await seeTheReactionOn(this, player, player);
  },
);

Then(
  'the reaction is recorded as from {string} to {string}',
  async function (this: GameWorld, player: string, about: string) {
    const recorded = await this.driver.reactionsRecorded();
    assert.ok(recorded.some((reaction) => reaction.by === player && reaction.about === about));
  },
);

Given(
  '{string} has reacted to the vote of {string}',
  async function (this: GameWorld, player: string, about: string) {
    await this.toRevealOf(1);
    await this.driver.react(player, about, '😂');
  },
);

When(
  '{string} reacts again to the vote of {string}',
  async function (this: GameWorld, player: string, about: string) {
    await this.driver.react(player, about, '🤔');
  },
);

Then(
  'only his latest reaction to the vote of {string} is kept',
  async function (this: GameWorld, about: string) {
    const kept = (await this.driver.reactionsRecorded()).filter(
      (reaction) => reaction.about === about,
    );
    assert.deepEqual(
      kept.map(({ emoji }) => emoji),
      ['🤔'],
    );
  },
);

// The results of a nominal room

/** Every player present is on the title of the game in that place, from 0. */
async function everyoneSeesTitle(world: GameWorld, place: number): Promise<void> {
  const title = (await world.driver.titlesOfTheGame())[place];
  assert.ok(title, `the game has no title in the place ${place}`);
  for (const viewer of world.present()) {
    const seen = await screenOf(world, viewer);
    assert.equal(seen.kind === 'title' && seen.title, title.title, `${viewer} sees another screen`);
  }
}

Then('all players see the first title of the game', async function (this: GameWorld) {
  await everyoneSeesTitle(this, 0);
});

Then('all players still see the first title of the game', async function (this: GameWorld) {
  await everyoneSeesTitle(this, 0);
});

Then('all players see the second title of the game', async function (this: GameWorld) {
  await everyoneSeesTitle(this, 1);
});

// Every player gets ready on each screen of the results: more than a step usually takes.
When(
  'the players have moved through every title',
  { timeout: 90_000 },
  async function (this: GameWorld) {
    const titles = await this.driver.titlesOfTheGame();
    for (let moved = 1; moved < titles.length; moved += 1) await this.everyoneMovesOn();
  },
);

Then('the last title they see is El Mentalista', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const seen = await screenOf(this, viewer);
    assert.equal(seen.kind === 'title' && seen.title, 'El Mentalista');
  }
});

Then('each player sees who knows them best', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal((await screenOf(this, viewer)).kind, 'known-best');
  }
});

Then('all players see the ranking', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal((await screenOf(this, viewer)).kind, 'ranking');
    assert.ok(await this.driver.rankingSeenBy(viewer), `${viewer} sees no ranking`);
  }
});

Given(
  '{string} voted with the minority more often than anyone',
  function (this: GameWorld, player: string) {
    const [first] = [...this.inRoom].filter((other) => other !== player);
    play(this, [{ [player]: WAIT }, { [player]: WAIT }, { [first!]: WAIT }]);
  },
);

Given(
  '{string} voted with the majority more often than anyone',
  function (this: GameWorld, player: string) {
    const [first, second] = [...this.inRoom].filter((other) => other !== player) as [
      string,
      string,
    ];
    play(this, [
      { [player]: PULL, [first]: PULL, [second]: WAIT },
      { [player]: PULL, [first]: WAIT, [second]: PULL },
      { [player]: PULL, [first]: WAIT, [second]: PULL },
    ]);
  },
);

Given(
  "the others guessed the votes of {string} more than anyone's",
  function (this: GameWorld, player: string) {
    play(this, everyRound(this), (_, about) => about === player);
  },
);

Given(
  "the others guessed the votes of {string} less than anyone's",
  function (this: GameWorld, player: string) {
    play(this, everyRound(this), (_, about) => about !== player);
  },
);

Given(
  "the votes of {string} received more reactions than anyone's",
  function (this: GameWorld, player: string) {
    play(this, everyRound(this));
    for (const other of [...this.inRoom].filter((name) => name !== player)) {
      reactsIn(this, 1, other, player);
    }
  },
);

Given(
  '{string} and {string} predicted each other better than any pair',
  function (this: GameWorld, first: string, second: string) {
    const pair = [first, second];
    play(
      this,
      everyRound(this),
      (predictor, about) => pair.includes(predictor) && pair.includes(about),
    );
  },
);

Given('every player voted the {int} dilemmas', function (this: GameWorld, count: number) {
  assert.equal(this.dilemmaCount, count);
});

Given(
  '{string} voted only {int} dilemmas',
  function (this: GameWorld, player: string, count: number) {
    // With the minority in every one they vote, so the title would be theirs if they could get one.
    play(this, everyRound(this, { [player]: WAIT }));
    for (let position = count + 1; position <= (this.dilemmaCount ?? 3); position += 1) {
      this.plan(position, player, null);
    }
  },
);

Given(
  '{string} voted {int} dilemmas and was chosen for the gap of the third',
  async function (this: GameWorld, player: string, count: number) {
    this.beforeTheGame();
    const host = await this.host();
    // One dilemma about each player, so each one is the person in the gap of one.
    const found = (await this.driver.searchDilemmas(host, 'about {gap}')).slice(
      0,
      this.inRoom.size,
    );
    await this.driver.setRounds(
      host,
      found.map((dilemmaId) => ({ origin: 'specific', dilemmaId })),
    );
    await this.game();
    const people = await this.driver.peopleInTheGap();
    assert.equal([...people.values()].filter((chosen) => chosen === player).length, 1);
    assert.equal(people.size - 1, count);
    // The others react to the vote of the player wherever they vote, so a title is theirs.
    for (const [position, chosen] of people) {
      if (chosen === player) continue;
      for (const other of [...this.inRoom].filter((name) => name !== player && name !== chosen)) {
        reactsIn(this, position, other, player);
      }
    }
  },
);

Given(
  '{string} and {string} voted with the minority equally often and more than {string}',
  function (this: GameWorld, first: string, second: string, third: string) {
    assert.ok(![first, second].includes(third));
    play(this, [{ [first]: WAIT }, { [second]: WAIT }, {}]);
  },
);

Given(
  'every player received the same number of reactions to their votes',
  function (this: GameWorld) {
    play(this, everyRound(this));
    const players = [...this.inRoom];
    players.forEach((player, index) => {
      reactsIn(this, 1, player, players[(index + 1) % players.length]!);
    });
  },
);

When('the titles of the game are shown', async function (this: GameWorld) {
  if (this.plans.size === 0 && !this.gameStarted) everyTitle(this, [...this.inRoom][0]!);
  await this.toTheResults();
});

// Every player gets ready on each screen of the results: more than a step usually takes.
Then(
  'they come in this order: {string}, {string}, {string}, {string}, {string}, {string} and {string}',
  { timeout: 90_000 },
  async function (
    this: GameWorld,
    first: string,
    second: string,
    third: string,
    fourth: string,
    fifth: string,
    sixth: string,
    seventh: string,
  ) {
    const order = [first, second, third, fourth, fifth, sixth, seventh];
    assert.deepEqual(order, TITLES);
    const viewer = this.present()[0]!;
    const seen: string[] = [];
    for (let screen = await screenOf(this, viewer); screen.kind === 'title';) {
      seen.push(screen.title);
      await this.everyoneMovesOn();
      screen = await screenOf(this, viewer);
    }
    assert.deepEqual(seen, order);
  },
);

Then(
  '{string} gets the title {string}',
  async function (this: GameWorld, player: string, title: string) {
    assert.deepEqual((await titleNamed(this, title))?.winners, [[player]]);
  },
);

Then(
  '{string} and {string} gets the title {string}',
  async function (this: GameWorld, first: string, second: string, title: string) {
    assert.deepEqual((await titleNamed(this, title))?.winners, [[first, second]]);
  },
);

Then('{string} gets no title', async function (this: GameWorld, player: string) {
  const titles = await this.driver.titlesOfTheGame();
  assert.ok(titles.every(({ winners }) => winners.every((names) => !names.includes(player))));
});

Then('{string} can get a title', async function (this: GameWorld, player: string) {
  const titles = await this.driver.titlesOfTheGame();
  assert.ok(titles.some(({ winners }) => winners.some((names) => names.includes(player))));
});

Then(
  '{string} and {string} share the title {string}',
  async function (this: GameWorld, first: string, second: string, title: string) {
    assert.deepEqual((await titleNamed(this, title))?.winners, [[first], [second]]);
  },
);

Then('the title {string} is skipped', async function (this: GameWorld, title: string) {
  assert.equal(await titleNamed(this, title), undefined);
});

// Every player gets ready on each screen of the results: more than a step usually takes.
When(
  'the title {string} is shown',
  { timeout: 90_000 },
  async function (this: GameWorld, title: string) {
    await toTheScreen(this, (screen) => screen.kind === 'title' && screen.title === title);
  },
);

Then(
  'all players see the avatar of the winner, the fact that earned it and the runner-up',
  async function (this: GameWorld) {
    for (const viewer of this.present()) {
      const seen = await screenOf(this, viewer);
      assert.ok(seen.kind === 'title', `${viewer} sees no title`);
      assert.equal(seen.withAvatarsAndFacts, true);
      assert.ok(seen.winners.length > 0 && seen.runnersUp.length > 0);
    }
  },
);

Given(
  '{string} is El Mentalista and {string} is {string}',
  function (this: GameWorld, reader: string, magnet: string, title: string) {
    assert.equal(title, 'Imán de reacciones');
    everyTitle(this, reader, magnet);
  },
);

// Every player gets ready on each screen of the results: more than a step usually takes.
When('the ranking is shown', { timeout: 90_000 }, async function (this: GameWorld) {
  await toTheScreen(this, (screen) => screen.kind === 'ranking');
});

Then(
  'the ranking shows the badge of El Mentalista next to {string}',
  async function (this: GameWorld, player: string) {
    const ranking = await this.driver.rankingSeenBy(this.present()[0]!);
    assert.ok(
      ranking?.find((ranked) => ranked.player === player)?.titles.includes('El Mentalista'),
    );
  },
);

Then(
  'the badge of {string} next to {string}',
  async function (this: GameWorld, title: string, player: string) {
    const ranking = await this.driver.rankingSeenBy(this.present()[0]!);
    assert.ok(ranking?.find((ranked) => ranked.player === player)?.titles.includes(title));
  },
);

// Every player gets ready on each screen of the results: more than a step usually takes.
Given(
  'all players see who is El Mentalista of the game',
  { timeout: 90_000 },
  async function (this: GameWorld) {
    everyTitle(this, [...this.inRoom][0]!);
    await toTheScreen(
      this,
      (screen) => screen.kind === 'title' && screen.title === 'El Mentalista',
    );
  },
);

When(
  '{string} moves forward in the game results',
  async function (this: GameWorld, player: string) {
    await this.driver.goForwardInTheResults(player);
  },
);

When(
  '{string} goes back to the previous screen of the game results',
  async function (this: GameWorld, player: string) {
    this.resultsScreenBefore = await this.driver.resultsScreenShownTo(player);
    await this.driver.goBackInTheResults(player);
  },
);

Then(
  '{string} sees the previous screen of the game results',
  async function (this: GameWorld, player: string) {
    assert.ok(this.resultsScreenBefore !== undefined, 'no step looked back');
    assert.equal(await this.driver.resultsScreenShownTo(player), this.resultsScreenBefore - 1);
  },
);

Then(
  '{string} and {string} still see who is El Mentalista of the game',
  async function (this: GameWorld, first: string, second: string) {
    for (const player of [first, second]) {
      const seen = await this.driver.resultsScreenSeenBy(player);
      assert.ok(seen?.kind === 'title' && seen.title === 'El Mentalista', `${player} moved`);
    }
  },
);

Then(
  '{string} sees who is El Mentalista of the game again',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.resultsScreenShownTo(player), this.resultsScreenBefore);
    const seen = await this.driver.resultsScreenSeenBy(player);
    assert.ok(seen?.kind === 'title' && seen.title === 'El Mentalista');
  },
);

Given(
  '{string} and {string} have the same highest points',
  function (this: GameWorld, first: string, second: string) {
    const readers = [first, second];
    play(
      this,
      everyRound(
        this,
        Object.fromEntries(
          [...this.inRoom].filter((p) => !readers.includes(p)).map((p) => [p, WAIT]),
        ),
      ),
      (predictor) => readers.includes(predictor),
    );
  },
);

Given(
  '{string} and {string} have predicted the votes of {string} equally well',
  function (this: GameWorld, first: string, second: string, about: string) {
    play(
      this,
      everyRound(this, { [about]: WAIT }),
      (predictor, target) => [first, second].includes(predictor) && target === about,
    );
  },
);

When('the game results are shown', async function (this: GameWorld) {
  await this.toTheResults();
});

Then(
  '{string} and {string} are both El Mentalista of the game',
  async function (this: GameWorld, first: string, second: string) {
    assert.deepEqual((await titleNamed(this, 'El Mentalista'))?.winners, [[first], [second]]);
  },
);

// Every player gets ready on each screen of the results: more than a step usually takes.
Then(
  '{string} sees that {string} and {string} know her best',
  { timeout: 90_000 },
  async function (this: GameWorld, viewer: string, first: string, second: string) {
    for (let moves = 0; (await screenOf(this, viewer)).kind !== 'known-best'; moves += 1) {
      assert.ok(moves < 10, `${viewer} never sees who knows them best`);
      await this.everyoneMovesOn();
    }
    const seen = await screenOf(this, viewer);
    assert.deepEqual(seen.kind === 'known-best' && [...seen.by].sort(), [first, second].sort());
  },
);

// Points for vote predictions

Given(
  '{int} of the {int} players voted the same option as {string} on the first dilemma',
  function (this: GameWorld, same: number, players: number, player: string) {
    assert.equal(this.inRoom.size, players);
    const others = [...this.inRoom].filter((other) => other !== player);
    const votes = Object.fromEntries([
      [player, PULL],
      ...others.map((other, index) => [other, index < same - 1 ? PULL : WAIT]),
    ]);
    play(this, [votes]);
  },
);

/** `player` predicts the vote of each one in `right` right and every other one wrong. */
function predictsOnly(world: GameWorld, player: string, right: readonly string[]): void {
  const plan = world.plans.get(1)?.get(player);
  const votes = new Map(
    [...(world.plans.get(1) ?? new Map())].map(([name, planned]) => [name, planned?.vote ?? PULL]),
  );
  world.plan(1, player, {
    ...plan,
    predictions: [...world.inRoom]
      .filter((other) => other !== player)
      .map((other) => {
        const vote = votes.get(other) ?? PULL;
        return { player: other, vote: right.includes(other) ? vote : otherThan(vote) };
      }),
  });
}

Given(
  '{string} predicted the vote of {string} right',
  function (this: GameWorld, player: string, about: string) {
    predictsOnly(this, player, [about]);
  },
);

Given(
  '{string} predicted the vote of {string} wrong on the first dilemma',
  function (this: GameWorld, player: string, about: string) {
    if (!this.plans.get(1)) play(this, [{}]);
    predictsOnly(this, player, []);
    assert.ok(this.inRoom.has(about));
  },
);

Given(
  '{string}, {string} and {string} voted the first option of the first dilemma and {string} voted the second',
  function (this: GameWorld, first: string, second: string, third: string, fourth: string) {
    play(this, [{ [first]: PULL, [second]: PULL, [third]: PULL, [fourth]: WAIT }]);
  },
);

Given(
  '{string} predicted the votes of {string} and {string} right and the vote of {string} wrong',
  function (this: GameWorld, player: string, first: string, second: string, wrong: string) {
    predictsOnly(this, player, [first, second]);
    assert.ok(![first, second].includes(wrong));
  },
);

async function pointsOfTheFirst(world: GameWorld, player: string): Promise<number | null> {
  const [first] = await world.driver.pointsOf(player);
  return first?.points ?? null;
}

Then(
  '{string} scores {int} points for that prediction',
  async function (this: GameWorld, player: string, points: number) {
    assert.equal(await pointsOfTheFirst(this, player), points);
  },
);

Then(
  '{string} scores no points for that prediction',
  async function (this: GameWorld, player: string) {
    assert.equal(await pointsOfTheFirst(this, player), 0);
  },
);

Then(
  '{string} sees that she scored {int} points in the first dilemma',
  async function (this: GameWorld, player: string, points: number) {
    assert.equal((await this.driver.revealSeenBy(player))?.ownPoints, points);
  },
);

Then(
  'no other player receives the points of {string}',
  async function (this: GameWorld, player: string) {
    const theirs = await pointsOfTheFirst(this, player);
    for (const viewer of this.present().filter((other) => other !== player)) {
      const own = await pointsOfTheFirst(this, viewer);
      assert.notEqual(own, theirs, 'the scenario needs points of their own for each one');
      assert.equal((await this.driver.revealSeenBy(viewer))?.ownPoints, own);
    }
    // Nor anywhere else in what reaches the others, under any name of points.
    const messages = await this.driver.messagesReceivedByOthers(player);
    assert.ok(messages.length > 0, 'nobody else received anything');
    for (const message of messages) {
      assert.ok(
        !new RegExp(`points":${theirs}\\b`, 'i').test(JSON.stringify(message)),
        `a message gives the points of ${player}`,
      );
    }
  },
);

// The cards

/** The card the player has open, as the last step opened or changed it. */
function cardOpen(world: GameWorld): CardView {
  assert.ok(world.card, 'no card is open');
  return world.card;
}

Given(
  '{string} finished first, is El Mentalista and {string} and is best known by {string}',
  function (this: GameWorld, player: string, title: string, knower: string) {
    assert.equal(title, 'Verso suelto');
    const [other] = [...this.inRoom].filter((name) => name !== player && name !== knower);
    play(
      this,
      [{ [player]: WAIT }, { [player]: WAIT }, { [other!]: WAIT }],
      (predictor, about) =>
        predictor === player ||
        (predictor === knower && about === player) ||
        (predictor === other && about === knower),
    );
  },
);

Given(
  '{string} and {string} are {string}',
  function (this: GameWorld, first: string, second: string, title: string) {
    assert.equal(title, 'Almas gemelas');
    const pair = [first, second];
    play(
      this,
      everyRound(this),
      (predictor, about) => pair.includes(predictor) && pair.includes(about),
    );
  },
);

Given(
  '{string} is best known by {string}',
  function (this: GameWorld, player: string, knower: string) {
    play(this, everyRound(this), (predictor, about) => predictor === knower && about === player);
  },
);

When('{string} shares his card', async function (this: GameWorld, player: string) {
  this.card = await this.driver.openCard(player);
  this.player = player;
});

When('{string} shares the card', async function (this: GameWorld, player: string) {
  this.card = await this.driver.openCard(player);
  this.player = player;
});

Then('the card shows that he finished first', function (this: GameWorld) {
  assert.match(cardOpen(this).headline, /^1\.º/);
});

Then('his titles El Mentalista and {string}', function (this: GameWorld, title: string) {
  assert.ok(cardOpen(this).titles.includes('El Mentalista'));
  assert.ok(cardOpen(this).titles.includes(title));
});

Then('that {string} knows him best', function (this: GameWorld, knower: string) {
  assert.ok(cardOpen(this).avatarsOf.includes(knower));
});

Then(
  'the card shows the title {string} with the avatar of {string}',
  function (this: GameWorld, title: string, partner: string) {
    assert.ok(cardOpen(this).titles.includes(title));
    assert.ok(cardOpen(this).avatarsOf.includes(partner));
    assert.ok(!cardOpen(this).nicknamesOf.includes(partner));
  },
);

Then(
  '{string} can show the nickname of {string} before sharing',
  async function (this: GameWorld, player: string, partner: string) {
    this.card = await this.driver.showNicknamesOnTheCard(player);
    assert.ok(cardOpen(this).nicknamesOf.includes(partner));
  },
);

Then(
  'the card shows the avatar of {string} without her nickname',
  function (this: GameWorld, knower: string) {
    assert.ok(cardOpen(this).avatarsOf.includes(knower));
    assert.ok(!cardOpen(this).nicknamesOf.includes(knower));
  },
);

When(
  '{string} shows the other nicknames on his card',
  async function (this: GameWorld, player: string) {
    this.card = await this.driver.showNicknamesOnTheCard(player);
  },
);

Then('the card shows the nickname of {string}', function (this: GameWorld, knower: string) {
  assert.ok(cardOpen(this).nicknamesOf.includes(knower));
});

Then(
  'the card shows that the group played {int} dilemmas',
  function (this: GameWorld, count: number) {
    assert.match(cardOpen(this).headline, new RegExp(`^${count}\\b`));
  },
);

Then('shows the dilemma that divided the group the most', function (this: GameWorld) {
  assert.notEqual(cardOpen(this).mostDivisive, null);
});

Then('shows no information about any player', function (this: GameWorld) {
  assert.deepEqual([...cardOpen(this).avatarsOf, ...cardOpen(this).nicknamesOf], []);
});

/** In that position (from 1), two vote the first option and the third the second. */
function twoToOne(world: GameWorld, ...positions: number[]): void {
  world.beforeTheGame();
  const players = [...world.inRoom];
  for (const position of positions) {
    players.forEach((player, index) => {
      world.plan(position, player, { vote: index === players.length - 1 ? WAIT : PULL });
    });
  }
}

Given(
  'the third dilemma was voted {int} to {int}',
  function (this: GameWorld, most: number, least: number) {
    assert.deepEqual([most, least], [2, 1]);
    twoToOne(this, 3);
  },
);

Given(
  'the second and the fifth dilemmas were both voted {int} to {int}',
  function (this: GameWorld, most: number, least: number) {
    assert.deepEqual([most, least], [2, 1]);
    twoToOne(this, 2, 5);
  },
);

Given(
  'every other dilemma was voted {int} to {int}',
  function (this: GameWorld, all: number, none: number) {
    // Who has no plan votes the first option, as everyone else does.
    assert.deepEqual([all, none], [this.inRoom.size, 0]);
  },
);

Then(
  'the card shows the {word} dilemma as the one that divided the group the most',
  function (this: GameWorld, ordinal: string) {
    const positions: Record<string, number> = { first: 1, second: 2, third: 3 };
    assert.equal(cardOpen(this).mostDivisive, positions[ordinal]);
  },
);

// The rematch

When('{string} starts a rematch', async function (this: GameWorld, player: string) {
  this.changes = await this.driver.settingsSeenBy(player);
  this.dilemmas = await this.driver.dilemmasOfTheGame();
  await this.driver.startRematch(player);
});

Then(
  'all players still in the room move to the lobby of a new game',
  async function (this: GameWorld) {
    for (const player of this.present()) {
      assert.equal(await this.driver.isInTheLobby(player), true, `${player} is not in the lobby`);
    }
  },
);

Then('the new game keeps the configuration of the previous one', async function (this: GameWorld) {
  assert.deepEqual(await this.driver.settingsSeenBy(await this.host()), this.changes);
});

Given('{string} disconnected before the game ended', function (this: GameWorld, player: string) {
  this.beforeTheEnd.push(async () => {
    await this.driver.disconnect(player);
    this.away.add(player);
  });
});

Then('{string} can start a rematch', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.canStartRematch(player), true);
});

/** Once the game has ended, the host takes everyone to the lobby of the rematch. */
async function toTheRematchLobby(world: GameWorld): Promise<void> {
  await world.endIfRequested();
  world.dilemmas = await world.driver.dilemmasOfTheGame();
  await world.driver.startRematch(await world.host());
}

When('the players are in the lobby of the rematch', async function (this: GameWorld) {
  await toTheRematchLobby(this);
});

When('{string} changes the rounds', async function (this: GameWorld, host: string) {
  this.rounds = [
    { origin: 'random', categories: ['honesty'], content: { age: 'any', compromising: 'any' } },
    {
      origin: 'random',
      categories: ['life-and-death'],
      content: { age: 'any', compromising: 'any' },
    },
  ];
  await this.driver.setRounds(host, this.rounds);
});

Then('the rematch uses the new rounds', async function (this: GameWorld) {
  assert.deepEqual(await this.driver.roundsSeenBy(await this.host()), this.rounds);
});

Given(
  'round {int} had a specific dilemma and round {int} was chosen by the players',
  async function (this: GameWorld, specific: number, players: number) {
    this.beforeTheGame();
    const host = await this.host();
    const [first, second] = [await this.unusedDilemma(), this.dilemmaCalled('chosen')];
    const rounds = Array.from({ length: Math.max(specific, players) }, (_, index) =>
      index + 1 === specific
        ? ({ origin: 'specific', dilemmaId: first } as const)
        : index + 1 === players
          ? ({ origin: 'players' } as const)
          : ({
              origin: 'random',
              categories: null,
              content: { age: 'any', compromising: 'any' },
            } as const),
    );
    await this.driver.setRounds(host, rounds);
    const [guest] = await this.guests();
    assert.ok(await this.driver.chooseRoundDilemma(guest!, players, second!));
  },
);

Then('round {int} is empty', async function (this: GameWorld, round: number) {
  const rounds = await this.driver.roundsSeenBy(await this.host());
  assert.deepEqual(rounds[round - 1], { origin: 'players', dilemmaId: null });
});

Given('the room has already played {int} dilemmas', function (this: GameWorld, count: number) {
  this.dilemmaCount = count;
});

When('the rematch starts', async function (this: GameWorld) {
  await toTheRematchLobby(this);
  await this.driver.startGame(await this.host());
});

Then('none of its dilemmas has been played before in that room', async function (this: GameWorld) {
  const now = await this.driver.dilemmasOfTheGame();
  assert.ok(now.length > 0, 'the rematch plays no dilemma');
  assert.deepEqual(
    now.filter((dilemmaId) => this.dilemmas.includes(dilemmaId)),
    [],
  );
});

Given(
  'the room has played every dilemma of the categories of round {int}',
  async function (this: GameWorld, round: number) {
    this.beforeTheGame();
    // Justice has two dilemmas in Spanish: the two rounds of justice play both.
    const rounds = Array.from({ length: round + 1 }, (_, index) =>
      index + 1 < round
        ? ({
            origin: 'random',
            categories: null,
            content: { age: 'any', compromising: 'any' },
          } as const)
        : ({
            origin: 'random',
            categories: ['justice'],
            content: { age: 'any', compromising: 'any' },
          } as const),
    );
    await this.driver.setRounds(await this.host(), rounds);
    this.dilemmaCount = undefined;
    this.round = round;
  },
);

Then(
  '{string} is told round {int} has no new dilemmas left',
  async function (this: GameWorld, host: string, round: number) {
    assert.ok((await this.driver.roundsWithoutNewDilemmasSeenBy(host)).includes(round));
  },
);

Then('{string} can change its categories', async function (this: GameWorld, host: string) {
  const round = this.round!;
  assert.equal(
    await this.driver.tryToSetRound(host, round, {
      origin: 'random',
      categories: ['honesty'],
      content: { age: 'any', compromising: 'any' },
    }),
    true,
  );
  assert.ok(!(await this.driver.roundsWithoutNewDilemmasSeenBy(host)).includes(round));
});

Then(
  'the rematch lobby has {string} and {string}',
  async function (this: GameWorld, first: string, second: string) {
    const seen = await this.driver.playersSeenBy(first);
    assert.deepEqual(seen.map(({ nickname }) => nickname).sort(), [first, second].sort());
  },
);

// Joining the rematch

Given('a player who was expelled from a game', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.isInTheRoom(this.player);
  await this.driver.expel(await this.host(), this.player);
  this.inRoom.delete(this.player);
  // Someone else plays the game with the host, to its end.
  await this.isInTheRoom(SOMEONE.anotherPlayer);
  this.requestEnd();
});

When('the host starts the rematch', async function (this: GameWorld) {
  await this.driver.startRematch(await this.host());
});

When('the player joins the room', async function (this: GameWorld) {
  await this.driver.joinRoom(this.player);
  this.inRoom.add(this.player);
});

Then('the player enters the lobby of the rematch', async function (this: GameWorld) {
  assert.equal(await this.driver.isInTheLobby(this.player), true);
});

// Restarting the game

const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3 };

/** The round the scenario names, in a game of three dilemmas. */
function ordinalOf(ordinal: string): number {
  const position = ORDINALS[ordinal];
  assert.ok(position, `the scenario says the "${ordinal}" round`);
  return position;
}

Given(
  'the game is on the decision phase of its {word} round',
  async function (this: GameWorld, ordinal: string) {
    this.dilemmaCount = 3;
    await this.toRound(ordinalOf(ordinal));
  },
);

Given(
  '{string} has voted the {word} dilemma',
  async function (this: GameWorld, player: string, ordinal: string) {
    assert.equal(await this.driver.dilemmaShownTo(player), ordinalOf(ordinal));
    await this.driver.answer(player);
  },
);

When('{string} restarts the game', async function (this: GameWorld, player: string) {
  this.changes = await this.driver.settingsSeenBy(player);
  await this.driver.restartGame(player);
});

Then(
  'the votes of the {word} and the {word} dilemmas are kept',
  async function (this: GameWorld, first: string, second: string) {
    for (const position of [ordinalOf(first), ordinalOf(second)]) {
      assert.notEqual(await this.driver.voteRecordedFor('Luis', position), undefined);
    }
  },
);

Then('the game is recorded as stopped before its end', async function (this: GameWorld) {
  assert.equal(await this.driver.stageOfTheGame(), 'stopped');
});

Then('the first two dilemmas count as played in the room', async function (this: GameWorld) {
  assert.deepEqual(await this.driver.playedInTheRoom(), [1, 2]);
});

Then('the third dilemma does not', async function (this: GameWorld) {
  assert.ok(!(await this.driver.playedInTheRoom()).includes(3));
});

Then('{string} can restart the game', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.canRestartGame(player), true);
});

Then(
  'neither {string} nor {string} can',
  async function (this: GameWorld, first: string, second: string) {
    for (const player of [first, second]) {
      assert.equal(await this.driver.canRestartGame(player), false, `${player} can restart it`);
    }
  },
);
