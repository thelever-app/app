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

Given('the game is in the decision phase', async function (this: GameWorld) {
  await this.driver.startDecisionPhase();
});

When('{string} answers his third dilemma', async function (this: GameWorld, player: string) {
  await this.driver.answerDilemmas(player, 3);
});

Given(
  '{string} has answered the first two dilemmas',
  async function (this: GameWorld, player: string) {
    await this.driver.answerDilemmas(player, 2);
  },
);

When(
  '{string} goes back to the first dilemma and changes his vote',
  async function (this: GameWorld, player: string) {
    await this.driver.changeVote(player, 1);
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
    await this.driver.answerDilemmas(player, count);
  },
);

When('{string} disconnects', async function (this: GameWorld, player: string) {
  await this.driver.disconnect(player);
});

When(
  '{string} reconnects during the decision phase',
  async function (this: GameWorld, player: string) {
    await this.driver.reconnect(player);
    this.reconnectedPlayer = player;
  },
);

Then('{string} is on his fourth dilemma', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.dilemmaShownTo(player), 4);
});

Then('keeps his answers', async function (this: GameWorld) {
  assert.ok(this.reconnectedPlayer, 'no step reconnected a player before');
  const cast = await this.driver.votesCastBy(this.reconnectedPlayer);
  assert.ok(cast.length > 0, `${this.reconnectedPlayer} did not vote`);

  assert.deepEqual(await this.driver.votesRecordedFor(this.reconnectedPlayer), cast);
});

Then(
  '{string} and {string} see {string} as disconnected',
  async function (this: GameWorld, firstViewer: string, secondViewer: string, player: string) {
    assert.equal(await this.driver.connectionSeenBy(firstViewer, player), false);
    assert.equal(await this.driver.connectionSeenBy(secondViewer, player), false);
    this.viewers = [firstViewer, secondViewer];
  },
);

Then(
  'they still see that {string} has answered {int} dilemmas',
  async function (this: GameWorld, player: string, answered: number) {
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
  // The host put it together when the game started, in the background.
  this.dilemmas = await this.driver.dilemmasOfTheGame();
});

Then(
  'it includes the number of new dilemmas set for games of {int} dilemmas',
  function (this: GameWorld, count: number) {
    const newOnes = this.dilemmas.filter(
      (dilemmaId) => this.driver.catalogEntryOf(dilemmaId).status === 'in-exploration',
    );
    assert.equal(newOnes.length, this.driver.newDilemmasSetForGamesOf(count));
  },
);

Then('the rest come from the catalog', async function (this: GameWorld) {
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
    this.gameBefore = await this.driver.currentGameSeenBy(host);
    assert.ok(this.gameBefore, 'no game in progress');
    await this.driver.tryToStartGame(host);
  },
);

Then('no new game starts', async function (this: GameWorld) {
  assert.equal(await this.driver.currentGameSeenBy(await this.host()), this.gameBefore);
});
