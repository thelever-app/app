import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { RevealView } from '../support/driver.ts';
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
  },
);

Given(
  'an anonymous room with players {string}, {string} and {string} and {int} dilemmas',
  async function (this: GameWorld, first: string, second: string, third: string, count: number) {
    await roomWith(this, [first, second, third], count);
    await this.driver.changeSettings(first, { variant: 'anonymous' });
  },
);

// Moving through the rounds

Given('the reveal is on the {word} dilemma', async function (this: GameWorld, ordinal: string) {
  await this.toRevealOf(positionOf(this, ordinal));
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
    await this.driver.pickDilemmas(host, await this.driver.searchDilemmas(host, 'about {gap}'));
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
    assert.equal(reveal.addedBy, null);
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

Then('all players see which predictions were right', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    const { votePredictions } = await revealSeenBy(this, viewer);
    assert.ok(votePredictions.length > 0, `${viewer} sees no vote predictions`);
  }
});

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
  '{string} added the first dilemma in the lobby',
  async function (this: GameWorld, player: string) {
    this.beforeTheGame();
    const host = await this.host();
    await this.driver.changeSettings(host, { dilemmasPerPlayer: 1 });
    await this.driver.addDilemma(player);
    await this.game();
    this.position = await this.driver.positionAddedBy(player);
  },
);

Then('all players see that {string} added it', async function (this: GameWorld, player: string) {
  for (const viewer of this.present()) {
    assert.equal((await revealSeenBy(this, viewer)).addedBy, player);
  }
});

Then('no player sees who added it', async function (this: GameWorld) {
  for (const viewer of this.present()) {
    assert.equal((await revealSeenBy(this, viewer)).addedBy, null);
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
