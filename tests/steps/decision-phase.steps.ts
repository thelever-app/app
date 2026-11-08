import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { GameWorld } from '../support/world.ts';

Given(
  '{string} hosts a room with {string} and {string}',
  async function (this: GameWorld, host: string, firstPlayer: string, secondPlayer: string) {
    await this.hostIs(host);
    await this.isInTheRoom(firstPlayer);
    await this.isInTheRoom(secondPlayer);
  },
);

Given('the game is in the decision phase', function (this: GameWorld) {
  this.requestGame();
});

When('{string} answers his third dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.answerDilemmas(player, 3);
});

Given(
  '{string} has answered the first two dilemmas',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.answerDilemmas(player, 2);
  },
);

When(
  '{string} goes back to the first dilemma and changes his vote',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.changeVote(player, 1);
    this.changedAnswer = { player, position: 1 };
  },
);

Then('only his new vote counts for that dilemma', async function (this: GameWorld) {
  await this.game();
  assert.ok(this.changedAnswer, 'no step changed an answer before');
  const { player, position } = this.changedAnswer;
  const [previous, current] = await this.driver.votesCastFor(player, position);
  const recorded = await this.driver.voteRecordedFor(player, position);

  assert.equal(recorded, current);
  assert.notEqual(recorded, previous);
});

Then(
  '{string} and {string} see that {string} has answered {int} dilemmas',
  async function (
    this: GameWorld,
    firstViewer: string,
    secondViewer: string,
    player: string,
    answered: number,
  ) {
    assert.equal(await this.driver.progressSeenBy(firstViewer, player), answered);
    assert.equal(await this.driver.progressSeenBy(secondViewer, player), answered);
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

Given(
  '{string} has answered {int} dilemmas',
  async function (this: GameWorld, player: string, count: number) {
    await this.game();
    await this.driver.answerDilemmas(player, count);
  },
);

When('{string} disconnects', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.disconnect(player);
  this.away.add(player);
});

When(
  '{string} reconnects during the decision phase',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.reconnect(player);
    this.away.delete(player);
    this.reconnectedPlayer = player;
  },
);

Then('{string} is on his fourth dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  assert.equal(await this.driver.dilemmaShownTo(player), 4);
});

Then('keeps his answers', async function (this: GameWorld) {
  await this.game();
  assert.ok(this.reconnectedPlayer, 'no step reconnected a player before');
  const cast = await this.driver.votesCastBy(this.reconnectedPlayer);
  assert.ok(cast.length > 0, `${this.reconnectedPlayer} did not vote`);

  assert.deepEqual(await this.driver.votesRecordedFor(this.reconnectedPlayer), cast);
});

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
  'they still see that {string} has answered {int} dilemmas',
  async function (this: GameWorld, player: string, answered: number) {
    await this.game();
    assert.ok(this.viewers.length > 0, 'no step said who is looking');
    for (const viewer of this.viewers) {
      assert.equal(await this.driver.progressSeenBy(viewer, player), answered);
    }
  },
);

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

When('the decision phase starts', async function (this: GameWorld) {
  await this.game();
});

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
    await this.driver.answerDilemmas(viewer, 1);
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
  await this.game();
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

When(
  '{string} and {string} answer it',
  async function (this: GameWorld, firstPlayer: string, secondPlayer: string) {
    assert.ok(this.position, 'no step said which dilemma');
    await this.driver.answerDilemmas(firstPlayer, this.position);
    await this.driver.answerDilemmas(secondPlayer, this.position);
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
  '{string} declared a birth year that makes him {int} and has given the research consent',
  async function (this: GameWorld, player: string, age: number) {
    this.beforeTheGame();
    await this.driver.declare(player, { underEighteen: age < 18, researchConsent: true });
  },
);

When('{string} answers a dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.answerDilemmas(player, 1);
  this.player = player;
});

Then(
  'his answer records the version of the research consent and that there is no commercial licence consent',
  async function (this: GameWorld) {
    const answer = await this.driver.answerRecordedFor(this.player, 1);
    assert.equal(answer?.researchConsent, true);
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
  await this.driver.answerDilemmas(player, 1);
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
  await this.game();
  await this.driver.answerDilemmas(player, 1);
  assert.equal(await this.driver.dilemmaShownTo(player), 2);
});

When('{string} reports it as offensive', async function (this: GameWorld, player: string) {
  await this.driver.report(player, 'offensive');
  // The screen offers to skip a dilemma reported as offensive, and the player takes it.
  await this.driver.skipReportedDilemma(player);
});

When('{string} reports it as confusing', async function (this: GameWorld, player: string) {
  await this.driver.report(player, 'confusing');
});

Then(
  '{string} gets the third dilemma without voting the second',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.dilemmaShownTo(player), 3);
    assert.equal(await this.driver.answerRecordedFor(player, 2), undefined);
  },
);

Then(
  '{string} is recorded as {string} for the second dilemma',
  async function (this: GameWorld, player: string, recorded: string) {
    assert.equal(recorded, 'did not vote');
    assert.deepEqual(await this.driver.didNotVoteRecordedFor(player), [2]);
  },
);

Then('{string} is still on the second dilemma', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.dilemmaShownTo(player), 2);
});

// The reveal

When('every player has answered every dilemma', async function (this: GameWorld) {
  await this.game();
  const count = (await this.driver.dilemmasOfTheGame()).length;
  for (const player of this.inRoom) await this.driver.answerDilemmas(player, count);
});

Then('the game moves to the reveal', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.ok(await this.driver.isInTheReveal(player), `${player} is not in the reveal`);
  }
});

Given(
  '{string} has answered {int} of {int} dilemmas',
  async function (this: GameWorld, player: string, answered: number, count: number) {
    this.beforeTheGame();
    await this.driver.changeSettings(await this.host(), { dilemmaCount: count });
    await this.game();
    await this.driver.answerDilemmas(player, answered);
    this.player = player;
  },
);

When('{string} starts the reveal', async function (this: GameWorld, host: string) {
  await this.game();
  await this.driver.startReveal(host);
});

Then(
  '{string} is recorded as {string} for the {int} dilemmas she did not answer',
  async function (this: GameWorld, player: string, recorded: string, count: number) {
    assert.equal(recorded, 'did not vote');
    assert.equal((await this.driver.didNotVoteRecordedFor(player)).length, count);
  },
);

// The total time

Given('{string} has not finished', async function (this: GameWorld, player: string) {
  await this.game();
  const count = (await this.driver.dilemmasOfTheGame()).length;
  assert.ok((await this.driver.dilemmaShownTo(player)) <= count);
});

When('the total time runs out', async function (this: GameWorld) {
  await this.game();
  await this.driver.runOutTotalTime();
});

Then(
  'everyone sees that {string} has not finished',
  async function (this: GameWorld, player: string) {
    for (const viewer of this.present()) {
      assert.ok((await this.driver.stragglersSeenBy(viewer)).includes(player));
    }
  },
);

Then('{string} can keep answering', async function (this: GameWorld, player: string) {
  const before = await this.driver.dilemmaShownTo(player);
  await this.driver.answerDilemmas(player, before);
  assert.equal(await this.driver.dilemmaShownTo(player), before + 1);
});

Then(
  '{string} can start the reveal at any moment',
  async function (this: GameWorld, player: string) {
    assert.ok(await this.driver.canStartReveal(player));
  },
);

Given(
  'the total time has run out and only {string} has not finished',
  async function (this: GameWorld, straggler: string) {
    await this.game();
    const count = (await this.driver.dilemmasOfTheGame()).length;
    for (const player of this.inRoom) {
      await this.driver.answerDilemmas(player, player === straggler ? count - 1 : count);
    }
    await this.driver.runOutTotalTime();
  },
);

When('{string} answers her last dilemma', async function (this: GameWorld, player: string) {
  const count = (await this.driver.dilemmasOfTheGame()).length;
  await this.driver.answerDilemmas(player, count);
});

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
  for (const viewer of this.present()) {
    assert.equal(await this.driver.hostSeenBy(viewer), player);
  }
});

Given('{string} has disconnected', async function (this: GameWorld, player: string) {
  await this.game();
  await this.driver.disconnect(player);
  this.away.add(player);
});

When(
  '{string} and {string} have answered every dilemma',
  async function (this: GameWorld, firstPlayer: string, secondPlayer: string) {
    const count = (await this.driver.dilemmasOfTheGame()).length;
    await this.driver.answerDilemmas(firstPlayer, count);
    await this.driver.answerDilemmas(secondPlayer, count);
  },
);

Given(
  '{string} disconnected and {string} became the host',
  async function (this: GameWorld, host: string, successor: string) {
    await this.game();
    await this.driver.disconnect(host);
    this.away.add(host);
    await this.driver.runOutTotalTime();
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

Given('{string} is on the first dilemma', async function (this: GameWorld, player: string) {
  await this.game();
  assert.equal(await this.driver.dilemmaShownTo(player), 1);
});

When(
  '{string} votes and makes all his predictions',
  async function (this: GameWorld, player: string) {
    await this.driver.answerDilemmas(player, 1);
  },
);

Then('{string} gets the second dilemma', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.dilemmaShownTo(player), 2);
});

Given(
  '{string} has voted the first dilemma but not made all his predictions',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.vote(player);
    await this.driver.predictMatch(player, 1);
  },
);

Then('{string} cannot get the second dilemma', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.dilemmaShownTo(player), 1);
});

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
  '{string} makes the match prediction that {int} of the other {int} players chose the same as him',
  async function (this: GameWorld, player: string, count: number, others: number) {
    assert.equal(others, this.inRoom.size - 1);
    await this.driver.predictMatch(player, count);
  },
);

Then(
  'his match prediction is that {int} of the other {int} players chose {string}',
  async function (this: GameWorld, count: number, others: number, option: string) {
    assert.equal(others, this.inRoom.size - 1);
    const answer = await this.driver.answerRecordedFor(this.player, 1);
    assert.equal(answer?.matchPrediction, count);
    assert.equal(answer?.vote.toLowerCase(), option);
  },
);

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
  '{string} has voted the current dilemma and made her match prediction but none of her vote predictions',
  async function (this: GameWorld, player: string) {
    await this.game();
    await this.driver.vote(player);
    await this.driver.predictMatch(player, 1);
    this.player = player;
  },
);

When('the reveal starts', async function (this: GameWorld) {
  await this.game();
  await this.driver.startReveal(await this.host());
});

Then('only her match prediction can score', async function (this: GameWorld) {
  const [points] = await this.driver.pointsOf(this.player);
  assert.equal(points?.position, 1);
  assert.notEqual(points?.match, null);
  assert.equal(points?.votes, null);
});

When('the decision phase ends', async function (this: GameWorld) {
  await this.game();
  const count = (await this.driver.dilemmasOfTheGame()).length;
  for (const player of this.inRoom) await this.driver.answerDilemmas(player, count);
});

Then('the points of every player are calculated', async function (this: GameWorld) {
  const count = (await this.driver.dilemmasOfTheGame()).length;
  for (const player of this.inRoom) {
    assert.equal((await this.driver.pointsOf(player)).length, count, `${player} has no points`);
  }
});

// Prediction subsets in a nominal room

Given(
  'a game with {int} players and a prediction limit of {int}',
  async function (this: GameWorld, players: number, limit: number) {
    assert.equal(limit, this.driver.predictionLimit());
    await bringInPlayers(this, players);
    this.requestGame();
  },
);

Given(
  'a game with {int} players, a prediction limit of {int} and {int} dilemmas',
  async function (this: GameWorld, players: number, limit: number, dilemmas: number) {
    assert.equal(limit, this.driver.predictionLimit());
    await bringInPlayers(this, players);
    await this.driver.changeSettings(await this.host(), { dilemmaCount: dilemmas });
    this.requestGame();
  },
);

When('a player gets a dilemma', async function (this: GameWorld) {
  await this.game();
});

Then(
  'the prediction subset of the player has {int} players',
  async function (this: GameWorld, predicted: number) {
    for (const player of this.inRoom) {
      assert.equal((await this.driver.predictionSubsetOf(player, 1)).length, predicted);
    }
  },
);

Then(
  'the number of times any two players have been predicted differs by at most {int}',
  async function (this: GameWorld, difference: number) {
    const times = [...(await this.driver.timesEachPlayerWasPredicted()).values()];
    assert.ok(
      Math.max(...times) - Math.min(...times) <= difference,
      `predicted ${times.join(', ')}`,
    );
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
  await this.driver.answerDilemmas(player, 1);
});

Then(
  '{string} gets the second dilemma without making any prediction',
  async function (this: GameWorld, player: string) {
    assert.equal(await this.driver.dilemmaShownTo(player), 2);
    const answer = await this.driver.answerRecordedFor(player, 1);
    assert.equal(answer?.matchPrediction, null);
    assert.deepEqual(answer?.votePredictions, []);
  },
);
