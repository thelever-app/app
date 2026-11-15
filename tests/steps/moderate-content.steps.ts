import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { GameWorld } from '../support/world.ts';

// The curation team approves and discards dilemmas in the curated catalog; the app has no
// accounts for it yet, so the step only names who acts.
Given('a member of the curation team', function () {});

When('the team creates a dilemma', async function (this: GameWorld) {
  this.dilemmaId = await this.driver.curationTeamCreatesADilemma();
});

Then(
  'the dilemma enters the general catalog without going through the exploration',
  async function (this: GameWorld) {
    assert.ok(
      await this.driver.dilemmaHasStatus(this.dilemmaId, 'in-catalog'),
      'the dilemma is not in the general catalog',
    );
    assert.equal(await this.driver.dilemmaHasStatus(this.dilemmaId, 'in-exploration'), false);
  },
);
