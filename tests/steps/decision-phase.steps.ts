import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { GameWorld } from '../support/world.ts';

/** Test data: the option a step predicts when the scenario does not say which, as the test dilemmas write it. */
const PREDICTED_VOTE = 'do nothing';

Given(
  '{string} hosts a room with {string} and {string}',
  async function (this: GameWorld, host: string, firstPlayer: string, secondPlayer: string) {
    await this.hostIs(host);
    await this.isInTheRoom(firstPlayer);
    await this.isInTheRoom(secondPlayer);
  },
);

Given('the game has started', function (this: GameWorld) {
  this.requestGame();
});

When('the first round starts', async function (this: GameWorld) {
  await this.game();
});

// Answering the dilemma of the round

When('{string} answers the first dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.answer(player);
  this.player = player;
});

Given('{string} has answered the first dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.answer(player);
  this.player = player;
});

When(
  '{string}, {string} and {string} answer the first dilemma',
  async function (this: GameWorld, first: string, second: string, third: string) {
    await this.game();
    for (const player of [first, second, third]) await this.driver.answer(player);
  },
);

When(
  '{string} and {string} answer it',
  async function (this: GameWorld, firstPlayer: string, secondPlayer: string) {
    await this.toRound(this.position ?? 1);
    await this.driver.answer(firstPlayer);
    await this.driver.answer(secondPlayer);
  },
);

Then(
  '{string} waits for the others on the first dilemma',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.dilemmaShownTo(player), 1);
    assert.ok(await this.driver.isWaiting(player), `${player} is not waiting for the others`);
  },
);

Then(
  'nobody gets the second dilemma before the first one is revealed',
  async function (this: GameWorld) {
    for (const player of this.present()) {
      assert.equal(await this.driver.dilemmaShownTo(player), 1);
      assert.equal(await this.driver.revealSeenBy(player), undefined);
    }
  },
);

When(
  '{string} changes his vote before it is revealed',
  async function (this: GameWorld, player: string) {
    await this.driver.changeVote(player);
    this.changedAnswer = { player, position: 1 };
  },
);

Then('only his new vote counts for that dilemma', async function (this: GameWorld) {
  assert.ok(this.changedAnswer, 'no step changed an answer before');
  const { player, position } = this.changedAnswer;
  const [previous, current] = await this.driver.votesCastFor(player, position);
  const recorded = await this.driver.voteRecordedFor(player, position);

  assert.equal(recorded, current);
  assert.notEqual(recorded, previous);
});

Given('the first dilemma has been revealed', async function (this: GameWorld) {
  await this.toRevealOf(1);
});

Then('no player can answer it or change their answer', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.equal(await this.driver.canAnswer(player), false, `${player} can still answer`);
  }
});

Then(
  '{string} and {string} see that {string} has answered it',
  async function (this: GameWorld, firstViewer: string, secondViewer: string, player: string) {
    for (const viewer of [firstViewer, secondViewer]) {
      assert.equal(await this.driver.answeredSeenBy(viewer, player), true);
    }
  },
);

Then(
  'no other player receives what {string} answered',
  async function (this: GameWorld, player: string) {
    await this.game();
    const messages = await this.driver.messagesReceivedByOthers(player);
    const votes = await this.driver.votesCastBy(player);
    assert.ok(messages.length > 0, `nobody else received anything`);
    assert.ok(votes.length > 0, `${player} did not vote`);

    for (const message of messages) {
      for (const vote of votes) {
        assert.ok(!JSON.stringify(message).includes(vote), `a message reveals the vote "${vote}"`);
      }
    }
  },
);

// The time for the dilemma

Given(
  'the first dilemma started {int} seconds ago with a time per dilemma of {int} seconds',
  async function (this: GameWorld, seconds: number, timePerDilemma: number) {
    this.beforeTheGame();
    await this.driver.changeSettings(await this.host(), { timePerDilemmaSeconds: timePerDilemma });
    await this.game();
    await this.driver.letTimePass(seconds);
  },
);

Then(
  'every player sees that {int} seconds are left for the first dilemma',
  async function (this: GameWorld, seconds: number) {
    for (const player of this.present()) {
      assert.equal(await this.driver.dilemmaShownTo(player), 1);
      assert.equal(await this.driver.timeLeftSeenBy(player), seconds);
    }
  },
);

Given(
  '{string} has not answered the first dilemma',
  async function (this: GameWorld, player: string) {
    await this.game();
    assert.equal(await this.driver.hasAnswered(player), false);
  },
);

Then(
  'the first dilemma does not count as answered by {string}',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.hasAnswered(player), false);
  },
);

When('the time for the dilemma runs out', async function (this: GameWorld) {
  await this.game();
  await this.driver.runOutRound();
});

When('{string} reveals it early', async function (this: GameWorld, host: string) {
  await this.game();
  await this.driver.revealEarly(host);
});

When('the first dilemma is revealed', async function (this: GameWorld) {
  await this.game();
  await this.driver.runOutRound();
});

When('the dilemma is revealed', async function (this: GameWorld) {
  await this.game();
  await this.driver.runOutRound();
});

Then('the first dilemma is revealed to every player', async function (this: GameWorld) {
  // Who is away gets it on coming back; with nobody connected, the game still has it for everyone.
  const present = this.present();
  for (const player of present.length > 0 ? present : this.inRoom) {
    assert.equal((await this.driver.revealSeenBy(player))?.position, 1, `${player} sees no reveal`);
  }
});

Then(
  '{string} is recorded as {string} for the first dilemma',
  async function (this: GameWorld, player: string, recorded: string) {
    assert.equal(recorded, 'did not vote');
    assert.deepEqual(await this.driver.didNotVoteRecordedFor(player), [1]);
  },
);

// The game, put together

Given(
  'a game of {int} dilemmas chosen by category with new dilemmas included',
  async function (this: GameWorld, count: number) {
    const settings = await this.driver.settingsSeenBy(await this.host());
    assert.equal(settings.dilemmaCount, count);
    assert.equal(settings.newDilemmas, true);
  },
);

When('the game is put together', async function (this: GameWorld) {
  await this.game();
  // The host put it together when the game started, in the background.
  this.dilemmas = await this.driver.dilemmasOfTheGame();
});

Then(
  'it includes the number of new dilemmas set for games of {int} dilemmas',
  async function (this: GameWorld, count: number) {
    await this.game();
    const newOnes = this.dilemmas.filter(
      (dilemmaId) => this.driver.catalogEntryOf(dilemmaId).status === 'in-exploration',
    );
    assert.equal(newOnes.length, this.driver.newDilemmasSetForGamesOf(count));
  },
);

Then('the rest come from the catalog', async function (this: GameWorld) {
  await this.game();
  const { dilemmaCount } = await this.driver.settingsSeenBy(await this.host());
  const fromTheCatalog = this.dilemmas.filter(
    (dilemmaId) => this.driver.catalogEntryOf(dilemmaId).status === 'in-catalog',
  );
  assert.equal(this.dilemmas.length, dilemmaCount);
  assert.equal(
    fromTheCatalog.length,
    dilemmaCount - this.driver.newDilemmasSetForGamesOf(dilemmaCount),
  );
});

When(
  '{string} tries to start another game in that room',
  async function (this: GameWorld, host: string) {
    await this.game();
    this.gameBefore = await this.driver.currentGameSeenBy(host);
    assert.ok(this.gameBefore, 'no game in progress');
    await this.driver.tryToStartGame(host);
  },
);

Then('no new game starts', async function (this: GameWorld) {
  await this.game();
  assert.equal(await this.driver.currentGameSeenBy(await this.host()), this.gameBefore);
});

// The variant of the room

Given(
  '{string} hosts a nominal room with {string} and {string}',
  async function (this: GameWorld, host: string, firstPlayer: string, secondPlayer: string) {
    await this.hostIs(host);
    await this.isInTheRoom(firstPlayer);
    await this.isInTheRoom(secondPlayer);
    assert.equal((await this.driver.settingsSeenBy(host)).variant, 'nominal');
  },
);

Given(
  '{string} hosts an anonymous room with {string} and {string}',
  async function (this: GameWorld, host: string, firstPlayer: string, secondPlayer: string) {
    await this.hostIs(host);
    await this.isInTheRoom(firstPlayer);
    await this.isInTheRoom(secondPlayer);
    await this.driver.changeSettings(host, { variant: 'anonymous' });
  },
);

// The order of the dilemmas and of their options

Then('every player gets the first dilemma of the game', async function (this: GameWorld) {
  for (const player of this.inRoom) assert.equal(await this.driver.dilemmaShownTo(player), 1);
});

Then('the dilemmas follow the same order for all players', async function (this: GameWorld) {
  const count = (await this.driver.dilemmasOfTheGame()).length;
  const seen = async (player: string) =>
    Promise.all(
      Array.from({ length: count }, (_, index) => this.driver.dilemmaTextSeenBy(player, index + 1)),
    );
  const host = await seen(await this.host());
  for (const player of this.inRoom) assert.deepEqual(await seen(player), host);
});

Given(
  'a dilemma with the options {string}, {string} and {string}',
  async function (this: GameWorld, first: string, second: string, third: string) {
    this.beforeTheGame();
    const found = await this.driver.searchDilemmas(await this.host(), 'three-options');
    assert.equal(found.length, 1, 'the test data has no dilemma with three options');
    await this.driver.pickDilemmas(await this.host(), found);
    this.options = [first, second, third];
  },
);

When(
  '{string} and {string} get that dilemma',
  async function (this: GameWorld, firstPlayer: string, secondPlayer: string) {
    await this.game();
    this.viewers = [firstPlayer, secondPlayer];
  },
);

Then('each of them sees the three options in a random order', async function (this: GameWorld) {
  for (const viewer of this.viewers) {
    const seen = await this.driver.optionsSeenBy(viewer, 1);
    assert.deepEqual(seen.map((option) => option.toLowerCase()).sort(), [...this.options].sort());
  }
});

Then('the order each of them saw is recorded with their answer', async function (this: GameWorld) {
  for (const viewer of this.viewers) {
    const seen = await this.driver.optionsSeenBy(viewer, 1);
    await this.driver.answer(viewer);
    assert.deepEqual((await this.driver.answerRecordedFor(viewer, 1))?.optionOrder, seen);
  }
});

// The gap "someone in the group"

const GAP = 'someone in the group';

Given('a dilemma with the gap {string}', async function (this: GameWorld, gap: string) {
  assert.equal(gap, GAP);
  await pickTheDilemmasWithTheGap(this);
});

Given(
  'a game with {int} dilemmas with the gap {string}',
  async function (this: GameWorld, count: number, gap: string) {
    assert.equal(gap, GAP);
    const picked = await pickTheDilemmasWithTheGap(this);
    assert.equal(picked, count, `the test data has ${picked} dilemmas with the gap`);
  },
);

Given(
  'a dilemma with the gap {string} for which {string} was chosen',
  async function (this: GameWorld, gap: string, person: string) {
    assert.equal(gap, GAP);
    await pickTheDilemmasWithTheGap(this);
    this.position = await positionOfTheDilemmaAbout(this, person);
  },
);

Given('{string} is chosen at random for it', async function (this: GameWorld, person: string) {
  this.position = await positionOfTheDilemmaAbout(this, person);
});

When('the players get that dilemma', async function (this: GameWorld) {
  assert.ok(this.position, 'no step said which dilemma');
  await this.toRound(this.position);
});

When('the players get those dilemmas', async function (this: GameWorld) {
  await this.game();
});

Then(
  '{string}, {string} and {string} see the nickname {string} in the text',
  async function (this: GameWorld, first: string, second: string, third: string, nickname: string) {
    assert.ok(this.position, 'no step said which dilemma');
    for (const viewer of [first, second, third]) {
      const text = await this.driver.dilemmaTextSeenBy(viewer, this.position);
      assert.ok(text.includes(nickname), `${viewer} sees "${text}"`);
    }
  },
);

Then(
  '{string}, {string} and {string} are each chosen once',
  async function (this: GameWorld, first: string, second: string, third: string) {
    const chosen = [...(await this.driver.peopleInTheGap()).values()].sort();
    assert.deepEqual(chosen, [first, second, third].sort());
  },
);

Then(
  'the answer of {string} records that she was the person in the gap',
  async function (this: GameWorld, player: string) {
    assert.ok(this.position, 'no step said which dilemma');
    assert.equal((await this.driver.answerRecordedFor(player, this.position))?.voterInTheGap, true);
  },
);

Then(
  'the answer of {string} records that he was not',
  async function (this: GameWorld, player: string) {
    assert.ok(this.position, 'no step said which dilemma');
    assert.equal(
      (await this.driver.answerRecordedFor(player, this.position))?.voterInTheGap,
      false,
    );
  },
);

Then(
  'the dilemma keeps its text with the gap, without the nickname',
  async function (this: GameWorld) {
    assert.ok(this.position, 'no step said which dilemma');
    const kept = await this.driver.textKeptFor(this.position);
    assert.ok(kept.includes('{gap}'), `the dilemma keeps "${kept}"`);
    for (const player of this.inRoom) {
      assert.ok(!kept.includes(player), `"${kept}" names ${player}`);
    }
  },
);

async function pickTheDilemmasWithTheGap(world: GameWorld): Promise<number> {
  world.beforeTheGame();
  const host = await world.host();
  const found = await world.driver.searchDilemmas(host, 'about {gap}');
  await world.driver.pickDilemmas(host, found);
  return found.length;
}

/** With as many dilemmas with the gap as players, each one is about someone else. */
async function positionOfTheDilemmaAbout(world: GameWorld, person: string): Promise<number> {
  await world.game();
  const about = [...(await world.driver.peopleInTheGap())].find(([, chosen]) => chosen === person);
  assert.ok(about, `no dilemma of the game is about ${person}`);
  return about[0];
}

// What each answer records

Given(
  '{string} declared a birth year that makes him {int}',
  async function (this: GameWorld, player: string, age: number) {
    this.beforeTheGame();
    await this.driver.declare(player, { underEighteen: age < 18, researchConsent: false });
  },
);

When('{string} answers a dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.answer(player);
  this.player = player;
});

Then(
  'his answer records that there is no research consent and no commercial licence consent',
  async function (this: GameWorld) {
    const answer = await this.driver.answerRecordedFor(this.player, 1);
    assert.equal(answer?.researchConsent, false);
    assert.equal(answer?.commercialLicenceConsent, false);
  },
);

Then('his answer is marked as given by a player under 18', async function (this: GameWorld) {
  assert.equal((await this.driver.answerRecordedFor(this.player, 1))?.underEighteen, true);
});

Given(
  '{string} got the first dilemma {int} seconds ago',
  async function (this: GameWorld, player: string, seconds: number) {
    await this.game();
    assert.equal(await this.driver.dilemmaShownTo(player), 1);
    await this.driver.letTimePass(seconds);
  },
);

When('{string} answers it', async function (this: GameWorld, player: string) {
  await this.driver.answer(player);
  this.player = player;
});

Then(
  '{int} seconds are recorded as his response time for the first dilemma',
  async function (this: GameWorld, seconds: number) {
    const answer = await this.driver.answerRecordedFor(this.player, 1);
    assert.equal(answer?.responseTimeSeconds, seconds);
  },
);

Then('no player sees that time', async function (this: GameWorld) {
  const seconds = (await this.driver.answerRecordedFor(this.player, 1))?.responseTimeSeconds;
  assert.ok(seconds, 'no response time was recorded');
  for (const seen of await this.driver.everythingPlayersSee()) {
    const text = JSON.stringify(seen);
    assert.ok(!/response.?time/i.test(text), `a player sees the response time in ${text}`);
    assert.ok(!text.includes(String(seconds * 1000)), `a player sees ${seconds} s in ${text}`);
  }
});

// Reporting a dilemma

Given('{string} is on the second dilemma', async function (this: GameWorld, player: string) {
  await this.toRound(2);
  assert.equal(await this.driver.dilemmaShownTo(player), 2);
  this.player = player;
});

When(
  '{string} reports it as offensive and skips it',
  async function (this: GameWorld, player: string) {
    await this.driver.report(player, 'offensive');
    await this.driver.skipReportedDilemma(player);
  },
);

When('{string} reports it as confusing', async function (this: GameWorld, player: string) {
  await this.driver.report(player, 'confusing');
});

Then(
  '{string} is recorded as {string} for the second dilemma',
  async function (this: GameWorld, player: string, recorded: string) {
    assert.equal(recorded, 'did not vote');
    assert.deepEqual(await this.driver.didNotVoteRecordedFor(player), [2]);
  },
);

Then('the round does not wait for {string}', async function (this: GameWorld, player: string) {
  for (const other of this.present().filter((present) => present !== player)) {
    await this.driver.answer(other);
  }
  assert.equal((await this.driver.revealSeenBy(player))?.position, 2);
});

Then(
  '{string} can still answer the second dilemma',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.dilemmaShownTo(player), 2);
    assert.ok(await this.driver.canAnswer(player), `${player} cannot answer`);
  },
);

// Disconnecting and coming back

Given(
  'every player has disconnected without answering the first dilemma',
  async function (this: GameWorld) {
    await this.game();
    for (const player of this.inRoom) {
      await this.driver.disconnect(player);
      this.away.add(player);
    }
  },
);

Given(
  '{string} has disconnected without answering the first dilemma',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.disconnect(player);
    this.away.add(player);
  },
);

When('{string} disconnects', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.disconnect(player);
  this.away.add(player);
});

When(
  '{string} reconnects before the first dilemma is revealed',
  async function (this: GameWorld, player: string) {
    await this.driver.reconnect(player);
    this.away.delete(player);
    this.reconnectedPlayer = player;
  },
);

Then('{string} is on the first dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  assert.equal(await this.driver.dilemmaShownTo(player), 1);
  assert.equal(await this.driver.revealSeenBy(player), undefined);
});

Then('keeps his answer', async function (this: GameWorld) {
  assert.ok(this.reconnectedPlayer, 'no step reconnected a player before');
  const [cast] = await this.driver.votesCastFor(this.reconnectedPlayer, 1);
  assert.ok(cast, `${this.reconnectedPlayer} did not vote`);
  assert.equal(await this.driver.voteRecordedFor(this.reconnectedPlayer, 1), cast);
});

When(
  'the first dilemma is revealed and {string} reconnects',
  async function (this: GameWorld, player: string) {
    await this.toRevealOf(1);
    await this.driver.reconnect(player);
    this.away.delete(player);
  },
);

Then(
  '{string} sees the reveal of the first dilemma',
  async function (this: GameWorld, player: string) {
    assert.equal((await this.driver.revealSeenBy(player))?.position, 1);
  },
);

Then(
  '{string} and {string} see {string} as disconnected',
  async function (this: GameWorld, firstViewer: string, secondViewer: string, player: string) {
    await this.game();
    assert.equal(await this.driver.connectionSeenBy(firstViewer, player), false);
    assert.equal(await this.driver.connectionSeenBy(secondViewer, player), false);
    this.viewers = [firstViewer, secondViewer];
  },
);

Then(
  'they still see that {string} has answered the first dilemma',
  async function (this: GameWorld, player: string) {
    assert.ok(this.viewers.length > 0, 'no step said who is looking');
    for (const viewer of this.viewers) {
      assert.equal(await this.driver.answeredSeenBy(viewer, player), true);
    }
  },
);

// The host

Given(
  '{string} has been in the room longer than {string}',
  async function (this: GameWorld, earlier: string, later: string) {
    const order = [...this.inRoom];
    assert.ok(order.indexOf(earlier) < order.indexOf(later), `${later} came before ${earlier}`);
    await this.game();
  },
);

When('{string} leaves the game', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.leave(player);
  this.away.add(player);
});

Then('{string} becomes the host', async function (this: GameWorld, player: string) {
  const viewers = this.present();
  // With nobody else connected, the game tells it to whoever looks at it.
  for (const viewer of viewers.length > 0 ? viewers : [player]) {
    assert.equal(await this.driver.hostSeenBy(viewer), player);
  }
});

Given('{string} has disconnected', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.disconnect(player);
  this.away.add(player);
});

Given(
  '{string} and {string} have disconnected',
  async function (this: GameWorld, first: string, second: string) {
    await this.game();
    for (const player of [first, second]) {
      await this.driver.disconnect(player);
      this.away.add(player);
    }
  },
);

Then(
  '{string} can reveal the next dilemma early',
  async function (this: GameWorld, player: string) {
    assert.ok(await this.driver.canRevealEarly(player), `${player} cannot reveal early`);
  },
);

Given(
  '{string} disconnected and {string} became the host',
  async function (this: GameWorld, host: string, successor: string) {
    await this.game();
    await this.driver.disconnect(host);
    this.away.add(host);
    await this.driver.runOutRound();
    assert.equal(await this.driver.hostSeenBy(successor), successor);
  },
);

When('{string} reconnects during the game', async function (this: GameWorld, player: string) {
  await this.driver.reconnect(player);
  this.away.delete(player);
});

Then('{string} is the host again', async function (this: GameWorld, player: string) {
  for (const viewer of this.present()) {
    assert.equal(await this.driver.hostSeenBy(viewer), player);
  }
});

Given(
  '{string} left the game voluntarily and {string} became the host',
  async function (this: GameWorld, host: string, successor: string) {
    await this.game();
    await this.driver.leave(host);
    this.away.add(host);
    assert.equal(await this.driver.hostSeenBy(successor), successor);
  },
);

When('{string} joins the room again', async function (this: GameWorld, player: string) {
  await this.driver.joinRoom(player);
  this.away.delete(player);
});

Then('{string} is still the host', async function (this: GameWorld, player: string) {
  for (const viewer of this.present()) {
    assert.equal(await this.driver.hostSeenBy(viewer), player);
  }
});

// Predictions in a nominal room

When(
  '{string} votes and makes all his predictions',
  async function (this: GameWorld, player: string) {
    await this.driver.answer(player);
  },
);

Then(
  'the first dilemma counts as answered by {string}',
  async function (this: GameWorld, player: string) {
    assert.ok(await this.driver.hasAnswered(player), `${player} has not answered`);
  },
);

Given(
  '{string} has voted the first dilemma but not made all his predictions',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.vote(player);
    const [first] = await this.driver.playersToPredictBy(player);
    await this.driver.predictVotes(player, [{ player: first!, vote: PREDICTED_VOTE }]);
  },
);

Given(
  '{string} has not voted the current dilemma',
  async function (this: GameWorld, player: string) {
    await this.game();
    assert.equal(await this.driver.answerRecordedFor(player, 1), undefined);
  },
);

Then('{string} cannot make predictions', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.canMakePredictions(player), false);
});

Given(
  '{string} has voted {string}',
  async function (this: GameWorld, player: string, option: string) {
    await this.game();
    await this.driver.vote(player, option);
    this.player = player;
  },
);

Given('{string} has voted', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.vote(player);
  this.player = player;
});

When(
  '{string} makes the vote predictions that {string} voted {string} and {string} voted {string}',
  async function (
    this: GameWorld,
    player: string,
    first: string,
    firstVote: string,
    second: string,
    secondVote: string,
  ) {
    await this.driver.predictVotes(player, [
      { player: first, vote: firstVote },
      { player: second, vote: secondVote },
    ]);
    this.predictions = [
      { player: first, vote: firstVote },
      { player: second, vote: secondVote },
    ];
  },
);

Then(
  'his vote predictions about {string} and {string} are recorded',
  async function (this: GameWorld, first: string, second: string) {
    const recorded = (await this.driver.answerRecordedFor(this.player, 1))?.votePredictions;
    assert.deepEqual(
      recorded?.map(({ player, vote }) => ({ player, vote: vote.toLowerCase() })),
      this.predictions.filter(({ player }) => [first, second].includes(player)),
    );
  },
);

Given(
  '{string} has voted {string} and made all his predictions on the first dilemma',
  async function (this: GameWorld, player: string, option: string) {
    await this.game();
    await this.driver.answer(player, { vote: option });
    this.player = player;
  },
);

When(
  '{string} changes his vote to {string} before it is revealed',
  async function (this: GameWorld, player: string, option: string) {
    const before = await this.driver.answerRecordedFor(player, 1);
    this.predictions = before?.votePredictions ?? [];
    await this.driver.changeVote(player, option);
  },
);

Then('his predictions are kept', async function (this: GameWorld) {
  const answer = await this.driver.answerRecordedFor(this.player, 1);
  assert.ok(this.predictions.length > 0, 'no step made vote predictions before');
  assert.deepEqual(answer?.votePredictions, this.predictions);
});

Then(
  'the first dilemma still counts as answered by {string}',
  async function (this: GameWorld, player: string) {
    assert.ok(await this.driver.hasAnswered(player), `${player} no longer counts as answered`);
  },
);

Given(
  '{string} has voted the current dilemma and made her vote prediction about {string} but not the one about {string}',
  async function (this: GameWorld, player: string, about: string, notAbout: string) {
    await this.game();
    const predicted = await this.driver.playersToPredictBy(player);
    assert.deepEqual([...predicted].sort(), [about, notAbout].sort());
    await this.driver.vote(player);
    await this.driver.predictVotes(player, [{ player: about, vote: PREDICTED_VOTE }]);
    this.player = player;
  },
);

Then('her vote counts', async function (this: GameWorld) {
  assert.notEqual(await this.driver.voteRecordedFor(this.player, 1), undefined);
  assert.deepEqual(await this.driver.didNotVoteRecordedFor(this.player), []);
});

Then(
  'only her vote prediction about {string} can score',
  async function (this: GameWorld, about: string) {
    const answer = await this.driver.answerRecordedFor(this.player, 1);
    assert.deepEqual(
      answer?.votePredictions.map(({ player }) => player),
      [about],
    );
    const [points] = await this.driver.pointsOf(this.player);
    assert.equal(points?.position, 1);
    assert.notEqual(points?.points, null);
  },
);

Then(
  'the points of every player for the first dilemma are calculated',
  async function (this: GameWorld) {
    for (const player of this.inRoom) {
      const points = await this.driver.pointsOf(player);
      assert.deepEqual(
        points.map(({ position }) => position),
        [1],
        `${player} has no points for the first dilemma`,
      );
    }
  },
);

// Who each player predicts in a nominal room

Given('a game with {int} players', async function (this: GameWorld, players: number) {
  await bringInPlayers(this, players);
  this.requestGame();
});

When('a player gets a dilemma', async function (this: GameWorld) {
  await this.game();
});

Then(
  'the player predicts the vote of the other {int} players',
  async function (this: GameWorld, others: number) {
    for (const player of this.inRoom) {
      const predicted = await this.driver.playersToPredictBy(player);
      assert.equal(predicted.length, others);
      assert.ok(!predicted.includes(player), `${player} predicts their own vote`);
    }
  },
);

async function bringInPlayers(world: GameWorld, count: number): Promise<void> {
  await world.host();
  for (let number = world.inRoom.size + 1; number <= count; number += 1) {
    await world.isInTheRoom(`Player ${number}`);
  }
}

// An anonymous room

When('{string} votes', async function (this: GameWorld, player: string) {
  await this.driver.answer(player);
});

Then(
  '{string} has answered the first dilemma without making any prediction',
  async function (this: GameWorld, player: string) {
    assert.ok(await this.driver.hasAnswered(player), `${player} has not answered`);
    const answer = await this.driver.answerRecordedFor(player, 1);
    assert.deepEqual(answer?.votePredictions, []);
  },
);

Then(
  '{string} and {string} see that {int} player has answered it',
  async function (this: GameWorld, firstViewer: string, secondViewer: string, count: number) {
    for (const viewer of [firstViewer, secondViewer]) {
      assert.equal(await this.driver.answeredCountSeenBy(viewer), count);
    }
  },
);

Then('no player receives who has answered', async function (this: GameWorld) {
  assert.equal(await this.driver.whoAnsweredIsSent(), false);
});
