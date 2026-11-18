import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { RankedView, RevealView } from '../support/driver.ts';
import { OPTION_TEXTS } from '../support/test-catalog.ts';
import type { GameWorld } from '../support/world.ts';

const POSITIONS: Record<string, number> = { first: 1, second: 2, third: 3 };

/** The room of the scenario: its host and players, and how many dilemmas it plays. */
async function roomWith(
  world: GameWorld,
  players: readonly string[],
  dilemmas: number,
): Promise<void> {
  const [host, ...guests] = players as [string, ...string[]];
  await world.hostIs(host);
  for (const guest of guests) await world.isInTheRoom(guest);
  world.dilemmaCount = dilemmas;
  world.requestGame();
}

/** The dilemma the scenario talks about: the first one, unless a step said which. */
function positionOf(world: GameWorld, ordinal: string): number {
  const position = POSITIONS[ordinal];
  assert.ok(position, `the scenario says the "${ordinal}" dilemma`);
  return position === 1 ? (world.position ?? 1) : position;
}

async function revealSeenBy(world: GameWorld, viewer: string): Promise<RevealView> {
  const reveal = await world.driver.revealSeenBy(viewer);
  assert.ok(reveal, `${viewer} sees no reveal`);
  return reveal;
}

// The room

Given(
  'a room with players {string}, {string} and {string} and {int} dilemmas',
  async function (this: GameWorld, first: string, second: string, third: string, count: number) {
    await roomWith(this, [first, second, third], count);
  },
);

Given(
  'a nominal room with players {string}, {string} and {string} and {int} dilemmas',
  async function (this: GameWorld, first: string, second: string, third: string, count: number) {
    await roomWith(this, [first, second, third], count);
    assert.equal((await this.driver.settingsSeenBy(first)).variant, 'nominal');
    this.variant = 'nominal';
  },
);

Given(
  'an anonymous room with players {string}, {string} and {string} and {int} dilemmas',
  async function (this: GameWorld, first: string, second: string, third: string, count: number) {
    await roomWith(this, [first, second, third], count);
    await this.driver.changeSettings(first, { variant: 'anonymous' });
    this.variant = 'anonymous';
  },
);

// Moving through the rounds

Given('the reveal is on the {word} dilemma', async function (this: GameWorld, ordinal: string) {
  if (ordinal === 'last') {
    await this.game();
    await this.toRevealOf((await this.driver.dilemmasOfTheGame()).length);
    return;
  }
  await this.toRevealOf(positionOf(this, ordinal));
});

When('a player moves on', async function (this: GameWorld) {
  await this.driver.moveOn(await this.host());
});

When('{string} moves to the next round', async function (this: GameWorld, player: string) {
  await this.driver.moveOn(player);
});

When(
  '{string} and {string} move to the next round at the same time',
  async function (this: GameWorld, first: string, second: string) {
    await this.driver.moveOnTogether([first, second]);
  },
);

Then('all players get the second dilemma', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.equal(await this.driver.dilemmaShownTo(player), 2);
    assert.equal(
      await this.driver.revealSeenBy(player),
      undefined,
      `${player} is still in a reveal`,
    );
  }
});

Then(
  '{string} and {string} see in the player strip that {string} moved on',
  async function (this: GameWorld, firstViewer: string, secondViewer: string, player: string) {
    for (const viewer of [firstViewer, secondViewer]) {
      assert.equal(await this.driver.movedOnSeenBy(viewer), player);
    }
  },
);

Then(
  'the notice in the player strip of {string} covers nothing of the dilemma',
  async function (this: GameWorld, viewer: string) {
    assert.ok(await this.driver.moveOnNoticeCoversNothing(viewer), 'the notice covers the dilemma');
    this.viewers = [viewer];
  },
);

Then('it disappears by itself', async function (this: GameWorld) {
  const [viewer] = this.viewers;
  assert.ok(viewer, 'no step said whose notice');
  assert.ok(await this.driver.moveOnNoticeDisappears(viewer), 'the notice stays');
});

Then('no player can go back to the first dilemma', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.equal(await this.driver.canGoBack(player), false, `${player} can go back`);
    assert.equal((await revealSeenBy(this, player)).position, 2);
  }
});

Given(
  '{string} disconnects during the reveal of the first dilemma',
  async function (this: GameWorld, player: string) {
    await this.toRevealOf(1);
    await this.driver.disconnect(player);
    this.away.add(player);
  },
);

When('{string} reconnects', async function (this: GameWorld, player: string) {
  await this.driver.reconnect(player);
  this.away.delete(player);
});

// What the reveal of a dilemma shows

Given(
  '{string} was chosen for the gap of the first dilemma',
  async function (this: GameWorld, person: string) {
    this.beforeTheGame();
    const host = await this.host();
    const found = await this.driver.searchDilemmas(host, 'about {gap}');
    await this.driver.setRounds(
      host,
      found.map((dilemmaId) => ({ origin: 'specific', dilemmaId })),
    );
    await this.game();
    const about = [...(await this.driver.peopleInTheGap())].find(([, chosen]) => chosen === person);
    assert.ok(about, `no dilemma of the game is about ${person}`);
    this.position = about[0];
  },
);

Then(
  'all players see that the dilemma was about {string}',
  async function (this: GameWorld, person: string) {
    for (const viewer of this.present()) {
      assert.equal((await revealSeenBy(this, viewer)).personInTheGap, person);
    }
  },
);

Given('the first dilemma comes from the catalog', function (this: GameWorld) {
  // Every dilemma the driver picks for the game comes from the catalog.
});

Then('no player sees who created it', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const reveal = await revealSeenBy(this, viewer);
    assert.equal(reveal.chosenBy, null);
    assert.ok(!/creat|author/i.test(JSON.stringify(reveal)), `${viewer} sees who created it`);
  }
});

Then('all players see how many chose each option', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const { distribution, didNotVoteCount } = await revealSeenBy(this, viewer);
    assert.ok(distribution, `${viewer} sees no distribution`);
    const total = distribution.reduce((sum, { count }) => sum + count, 0);
    assert.equal(total + didNotVoteCount, this.inRoom.size);
  }
});

Then('all players see what each player voted', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const { votes } = await revealSeenBy(this, viewer);
    assert.deepEqual(votes.map(({ player }) => player).sort(), [...this.inRoom].sort());
  }
});

Then(
  'each player sees which of their own predictions were right',
  async function (this: GameWorld) {
    for (const viewer of this.present()) {
      const seen = await this.driver.ownPredictionsSeenBy(viewer);
      const { votePredictions, votes } = await revealSeenBy(this, viewer);
      const voted = new Set(votes.flatMap(({ player, vote }) => (vote === null ? [] : player)));
      const own = votePredictions
        .filter(({ player, about }) => player === viewer && voted.has(about))
        .map(({ about, right }) => ({ about, right }));
      assert.ok(seen.length > 0, `${viewer} sees none of their predictions`);
      assert.deepEqual(
        seen.toSorted((a, b) => a.about.localeCompare(b.about)),
        own.toSorted((a, b) => a.about.localeCompare(b.about)),
        `${viewer} does not see how their own predictions went`,
      );
    }
  },
);

Then('no player sees the points of anyone so far', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal((await revealSeenBy(this, viewer)).showsPoints, false);
  }
});

Given(
  '{string} did not vote the {word} dilemma',
  function (this: GameWorld, player: string, ordinal: string) {
    this.plan(positionOf(this, ordinal), player, null);
  },
);

Then(
  '{string} appears as {string}',
  async function (this: GameWorld, player: string, recorded: string) {
    assert.equal(recorded, 'did not vote');
    for (const viewer of this.present()) {
      const { votes } = await revealSeenBy(this, viewer);
      assert.deepEqual(
        votes.find((vote) => vote.player === player),
        { player, vote: null },
      );
    }
    this.player = player;
  },
);

Then('her vote is not counted in the distribution', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const { distribution, votes } = await revealSeenBy(this, viewer);
    const voted = votes.filter(({ vote }) => vote !== null).length;
    assert.equal(
      distribution?.reduce((sum, { count }) => sum + count, 0),
      voted,
    );
  }
});

Given(
  '{string} chose the dilemma of the first round in the lobby',
  async function (this: GameWorld, player: string) {
    this.beforeTheGame();
    const host = await this.host();
    assert.ok(await this.driver.tryToSetRound(host, 1, { origin: 'players' }));
    await this.isInTheRoom(player);
    const dilemmaId = await this.unusedDilemma();
    assert.ok(await this.driver.chooseRoundDilemma(player, 1, dilemmaId), `${player} cannot`);
    await this.game();
    this.position = await this.driver.positionChosenBy(player);
  },
);

Then('all players see that {string} chose it', async function (this: GameWorld, player: string) {
  for (const viewer of this.present()) {
    assert.equal((await revealSeenBy(this, viewer)).chosenBy, player);
  }
});

Then('no player sees who chose it', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal((await revealSeenBy(this, viewer)).chosenBy, null);
  }
});

// An anonymous room

Then('no player receives what any other player voted', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.deepEqual((await revealSeenBy(this, viewer)).votes, []);
  }
  assert.equal(await this.driver.whoAnsweredIsSent(), false);
});

Then(
  'all players see that {int} player did not vote',
  async function (this: GameWorld, count: number) {
    for (const viewer of this.present()) {
      assert.equal((await revealSeenBy(this, viewer)).didNotVoteCount, count);
    }
  },
);

Then('nobody sees who it was', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.deepEqual((await revealSeenBy(this, viewer)).votes, []);
  }
  assert.equal(await this.driver.whoAnsweredIsSent(), false);
});

Given(
  'only {string} and {string} voted the first dilemma',
  function (this: GameWorld, first: string, second: string) {
    for (const player of this.inRoom) {
      if (player !== first && player !== second) this.plan(1, player, null);
    }
  },
);

Then('nobody sees how many chose each option', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal((await revealSeenBy(this, viewer)).distribution, null);
  }
});

Then('all players see that there were too few votes to show it', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal((await revealSeenBy(this, viewer)).tooFewVotes, true);
  }
});

// The points and the ranking of an anonymous room

/** Test data: the rounds a room of these scenarios plays, enough for a ranking and quick to play. */
const ROUNDS = 3;

/** Test data: the names of an anonymous room of ten, its host first. */
const TEN = ['Ana', 'Luis', 'Marta', 'Sara', 'Nico', 'Pablo', 'Lucía', 'Inés', 'Diego', 'Nora'];

const [PULL, NOTHING] = OPTION_TEXTS;

/** The distribution prediction of the two usual options with that share for the first one. */
function predicting(share: number) {
  return [
    { option: PULL, share },
    { option: NOTHING, share: 100 - share },
  ];
}

/**
 * Every player votes the first option of every round, so the group goes all one way, and predicts
 * that share for it: 100 reads the group right, 50 the even split, unless the step says.
 */
function readEveryRound(world: GameWorld, shares: Readonly<Record<string, number>>): void {
  for (let position = 1; position <= (world.dilemmaCount ?? ROUNDS); position += 1) {
    for (const player of world.inRoom) {
      world.plan(position, player, { vote: PULL, distribution: predicting(shares[player] ?? 50) });
    }
  }
}

/** The game is on the ranking of who reads the group best: every round is played as planned. */
async function toTheRanking(world: GameWorld): Promise<void> {
  await world.game();
  const host = await world.host();
  if (await world.driver.rankingSeenBy(host)) return;
  await world.toRevealOf((await world.driver.dilemmasOfTheGame()).length);
  await world.driver.moveOn(host);
}

async function rankingSeenBy(world: GameWorld, viewer: string): Promise<readonly RankedView[]> {
  const ranking = await world.driver.rankingSeenBy(viewer);
  assert.ok(ranking, `${viewer} sees no ranking`);
  return ranking;
}

async function rankedIn(world: GameWorld, player: string): Promise<RankedView> {
  const ranked = (await rankingSeenBy(world, await world.host())).find(
    (row) => row.player === player,
  );
  assert.ok(ranked, `${player} is not in the ranking`);
  return ranked;
}

async function pointsIn(world: GameWorld, player: string, position: number) {
  return (await world.driver.pointsOf(player)).find((scored) => scored.position === position)
    ?.points;
}

// Ten players enter one by one: more than a step usually takes.
Given(
  'an anonymous room with {int} players',
  { timeout: 90_000 },
  async function (this: GameWorld, count: number) {
    await roomWith(this, TEN.slice(0, count), ROUNDS);
    await this.driver.changeSettings(TEN[0]!, { variant: 'anonymous' });
    this.variant = 'anonymous';
  },
);

Then('no player scores points for the first dilemma', async function (this: GameWorld) {
  for (const player of this.inRoom) {
    assert.equal(await pointsIn(this, player, 1), undefined, `${player} scored`);
  }
});

Then(
  'no player sees anything about their distribution prediction',
  async function (this: GameWorld) {
    for (const viewer of this.present()) {
      const { ownDistributionPrediction, ownPoints } = await revealSeenBy(this, viewer);
      assert.equal(ownDistributionPrediction, null);
      assert.equal(ownPoints, null);
    }
  },
);

Then('all players see the ranking of who reads the group best', async function (this: GameWorld) {
  for (const viewer of this.present()) await rankingSeenBy(this, viewer);
});

Then('nobody sees the titles of the game or who knows them best', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal(await this.driver.titlesSeenBy(viewer), false);
  }
});

Given(
  '{string} has the most points for the distribution predictions',
  function (this: GameWorld, player: string) {
    readEveryRound(this, { [player]: 100 });
  },
);

Given(
  '{string} and {string} share the most points for the distribution predictions',
  function (this: GameWorld, first: string, second: string) {
    readEveryRound(this, { [first]: 100, [second]: 100 });
  },
);

Given(
  '{string} and {string} share the highest total of points and {string} has the next one',
  function (this: GameWorld, first: string, second: string, next: string) {
    readEveryRound(this, { [first]: 100, [second]: 100, [next]: 80 });
  },
);

Given('no dilemma had enough votes to score', function (this: GameWorld) {
  // With only two votes in each round, none is scored.
  const [skipping] = this.inRoom;
  readEveryRound(this, {});
  for (let position = 1; position <= (this.dilemmaCount ?? ROUNDS); position += 1) {
    this.plan(position, skipping!, null);
  }
});

Given('{string} left the game', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.leave(player);
  this.away.add(player);
});

When('the ranking of who reads the group best is shown', async function (this: GameWorld) {
  await toTheRanking(this);
});

Then(
  '{string} is marked as El Mentalista of the game',
  async function (this: GameWorld, player: string) {
    assert.equal((await rankedIn(this, player)).mentalist, true);
  },
);

Then(
  '{string} and {string} are both marked as El Mentalista of the game',
  async function (this: GameWorld, first: string, second: string) {
    for (const player of [first, second]) {
      assert.equal((await rankedIn(this, player)).mentalist, true, `${player} is not`);
    }
  },
);

Then('nobody is marked as El Mentalista of the game', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const ranking = await rankingSeenBy(this, viewer);
    assert.deepEqual(
      ranking.filter(({ mentalist }) => mentalist),
      [],
    );
  }
});

Then(
  'the ranking has {string} and {string}',
  async function (this: GameWorld, first: string, second: string) {
    for (const viewer of this.present()) {
      const players = (await rankingSeenBy(this, viewer)).map(({ player }) => player);
      assert.deepEqual([...players].sort(), [first, second].sort());
    }
  },
);

Then('the game ends', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.ok(await this.driver.endOfTheGameSeenBy(viewer), `${viewer} does not see its end`);
  }
});

Given(
  /^the first dilemma has 2 options and the group voted (\d+) % and (?:\d+) %$/,
  function (this: GameWorld, first: string) {
    const pulling = (Number(first) * this.inRoom.size) / 100;
    [...this.inRoom].forEach((player, index) =>
      this.plan(1, player, { vote: index < pulling ? PULL : NOTHING }),
    );
  },
);

Given(
  /^(\d+) of the players voted the first dilemma, (\d+) for the first option and (?:\d+) for the second$/,
  function (this: GameWorld, voters: string, pulling: string) {
    [...this.inRoom].forEach((player, index) => {
      if (index >= Number(voters)) this.plan(1, player, null);
      else this.plan(1, player, { vote: index < Number(pulling) ? PULL : NOTHING });
    });
  },
);

Given(
  /^"([^"]+)" predicted (\d+) % and (?:\d+) %$/,
  function (this: GameWorld, player: string, first: string) {
    const plan = this.plans.get(1)?.get(player) ?? { vote: PULL };
    this.plan(1, player, { ...plan, distribution: predicting(Number(first)) });
  },
);

// The others predict something else, so what each player receives tells whose it is.
Given(
  /^"([^"]+)" predicted (\d+) % and (?:\d+) % on the first dilemma$/,
  function (this: GameWorld, player: string, first: string) {
    const share = Number(first);
    for (const other of this.inRoom) {
      if (other === player) continue;
      this.plan(1, other, { vote: PULL, distribution: predicting(share === 30 ? 70 : 30) });
    }
    this.plan(1, player, { vote: PULL, distribution: predicting(share) });
  },
);

Then(
  '{string} scores {int} points for the first dilemma',
  async function (this: GameWorld, player: string, points: number) {
    assert.equal(await pointsIn(this, player, 1), points);
  },
);

Then(
  '{string} scores no points for the first dilemma',
  async function (this: GameWorld, player: string) {
    assert.equal(await pointsIn(this, player, 1), undefined);
  },
);

Then(
  '{string} sees a mark on each bar at the share she predicted',
  async function (this: GameWorld, player: string) {
    const predicted = this.plans.get(1)?.get(player)?.distribution;
    const seen = (await revealSeenBy(this, player)).ownDistributionPrediction;
    assert.deepEqual(
      [...(seen ?? [])].sort((a, b) => a.option.localeCompare(b.option)),
      [...(predicted ?? [])].sort((a, b) => a.option.localeCompare(b.option)),
    );
  },
);

Then(
  '{string} sees the points she scored for the first dilemma',
  async function (this: GameWorld, player: string) {
    const { ownPoints } = await revealSeenBy(this, player);
    assert.ok(ownPoints !== null, `${player} sees no points`);
    assert.equal(ownPoints, await pointsIn(this, player, 1));
  },
);

Then(
  'no other player receives the prediction or the points of {string}',
  async function (this: GameWorld, player: string) {
    for (const viewer of this.present().filter((other) => other !== player)) {
      // Whoever has no screen open sees nothing, and receives nothing.
      const reveal = await this.driver.revealSeenBy(viewer);
      if (!reveal) continue;
      const { ownDistributionPrediction, ownPoints } = reveal;
      const theirs = this.plans.get(1)?.get(player)?.distribution;
      assert.notDeepEqual(
        [...(ownDistributionPrediction ?? [])].sort((a, b) => a.option.localeCompare(b.option)),
        [...(theirs ?? [])].sort((a, b) => a.option.localeCompare(b.option)),
        `${viewer} receives the prediction of ${player}`,
      );
      const own = await this.driver.answerRecordedFor(viewer, 1);
      assert.deepEqual(ownDistributionPrediction, own?.distributionPrediction ?? null);
      assert.equal(ownPoints, (await pointsIn(this, viewer, 1)) ?? null);
    }
  },
);

Given(
  '{string} joined the game in the {word} round',
  async function (this: GameWorld, player: string, ordinal: string) {
    await this.toRound(positionOf(this, ordinal));
    await this.isInTheRoom(player);
  },
);

Given(
  '{string} voted the {word} dilemma and predicted its distribution',
  function (this: GameWorld, player: string, ordinal: string) {
    this.plan(positionOf(this, ordinal), player, { vote: PULL, distribution: predicting(70) });
  },
);

Then(
  '{string} scores points for the {word} dilemma',
  async function (this: GameWorld, player: string, ordinal: string) {
    const points = await pointsIn(this, player, positionOf(this, ordinal));
    assert.ok(typeof points === 'number', `${player} scored nothing`);
  },
);

Then(
  '{string} is in the ranking of who reads the group best',
  async function (this: GameWorld, player: string) {
    await toTheRanking(this);
    await rankedIn(this, player);
  },
);

Then(
  '{string} and {string} share the first position',
  async function (this: GameWorld, first: string, second: string) {
    for (const player of [first, second]) {
      assert.equal((await rankedIn(this, player)).position, 1, `${player} is not first`);
    }
  },
);

Then('{string} is third', async function (this: GameWorld, player: string) {
  assert.equal((await rankedIn(this, player)).position, 3);
});
