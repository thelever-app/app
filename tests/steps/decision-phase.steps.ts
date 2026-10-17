import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { GameWorld } from '../support/world.ts';

Given(
  '{string} hosts a room with {string} and {string}',
  async function (this: GameWorld, host: string, firstPlayer: string, secondPlayer: string) {
    await this.driver.hostRoom(host, [firstPlayer, secondPlayer]);
  },
);

Given('the game is in the decision phase', async function (this: GameWorld) {
  await this.driver.startDecisionPhase();
});

When('{string} answers his third dilemma', async function (this: GameWorld, player: string) {
  await this.driver.answerDilemmas(player, 3);
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
    const messages = await this.driver.messagesAbout(player);
    const votes = await this.driver.votesCastBy(player);
    assert.ok(messages.length > 0, `nobody received anything about ${player}`);
    assert.ok(votes.length > 0, `${player} did not vote`);

    for (const message of messages) {
      for (const vote of votes) {
        assert.ok(!JSON.stringify(message).includes(vote), `a message reveals the vote "${vote}"`);
      }
    }
  },
);
