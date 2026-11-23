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

// Hiding, restoring and withdrawing what was reported

/** Test data: how many different players hide a dilemma (glossary, «Umbral de reportes»). */
const REPORT_THRESHOLD = 3;

async function hiddenByReports(world: GameWorld): Promise<void> {
  world.dilemmaId = (await world.driver.aCatalogDilemma()).dilemmaId;
  await world.driver.reportedByDifferentPlayers(world.dilemmaId, REPORT_THRESHOLD);
}

Given(
  'a dilemma that has received as many reports as the hiding threshold',
  async function (this: GameWorld) {
    await hiddenByReports(this);
  },
);

Given('a dilemma hidden by reports', async function (this: GameWorld) {
  await hiddenByReports(this);
});

Then('the dilemma is hidden from new games', async function (this: GameWorld) {
  assert.equal(await this.driver.isPlayableInNewGames(this.dilemmaId), false);
});

Then('an issue is created in the moderation repository', async function (this: GameWorld) {
  await this.driver.syncModeration();
  const issue = (await this.driver.moderationIssues()).find(({ body }) =>
    body.includes(this.dilemmaId),
  );
  assert.ok(issue, `No issue of ${this.dilemmaId} in the moderation repository`);
  assert.ok(issue.labels.includes('hidden-by-reports'), 'The issue does not say it is hidden');
});

When('the team restores it', async function (this: GameWorld) {
  await this.driver.teamDecides({ dilemmaId: this.dilemmaId }, 'restore');
});

When('the team withdraws it', async function (this: GameWorld) {
  await this.driver.teamDecides({ dilemmaId: this.dilemmaId }, 'withdraw');
});

Then(
  'the dilemma returns to the status it had before being hidden',
  async function (this: GameWorld) {
    assert.ok(await this.driver.isPlayableInNewGames(this.dilemmaId));
  },
);

Then('the dilemma is not used in new games', async function (this: GameWorld) {
  assert.equal(await this.driver.isPlayableInNewGames(this.dilemmaId), false);
});

// A reported nickname

Given(
  '{string} is in an open room with a nickname that was reported',
  async function (this: GameWorld, player: string) {
    await this.hostIs('Ana');
    await this.isInTheRoom('Luis');
    await this.isInTheRoom(player);
    await this.driver.reportNickname('Luis', player);
    this.player = player;
  },
);

When('the team withdraws the nickname', async function (this: GameWorld) {
  await this.driver.teamDecides({ nickname: this.player }, 'withdraw');
});

Then(
  '{string} is shown with a generic nickname in that room',
  async function (this: GameWorld, player: string) {
    assert.match(await this.driver.nicknameOfIn('Ana', player), /^Jugador \d+$/);
  },
);

Then(
  'the withdrawn nickname is no longer proposed to {string} when she joins a room',
  async function (this: GameWorld, player: string) {
    this.moderationNotices = await this.driver.moderationNoticesOn(player);
    await this.driver.openInvitation(player, 'code');
    assert.equal(await this.driver.nicknameFieldSeenBy(player), '');
  },
);

Then(
  '{string} sees the reason, the facts, the rule applied, that a person decided it and how to appeal the next time she opens the app',
  async function (this: GameWorld, player: string) {
    const [notice] = this.moderationNotices;
    assert.ok(notice, `${player} sees no decision on her nickname`);
    assert.equal(notice.about, 'nickname');
    assert.equal(notice.outcome, 'withdrawn');
    assert.ok(notice.facts, 'The notice gives no facts');
    assert.ok(notice.rule && notice.byAPerson && notice.howToAppeal);
  },
);

// Whoever reported

Given(
  'a dilemma reported by a player and by a web notice with an email',
  async function (this: GameWorld) {
    await this.hostIs('Ana');
    await this.isInTheRoom('Luis');
    await this.isInTheRoom('Marta');
    await this.game();
    this.dilemmaId = (await this.driver.report('Luis', 'offensive')).dilemmaId;
    this.player = 'Luis';
    await this.driver.sendIllegalContentNotice({
      dilemmaId: this.dilemmaId,
      email: 'person@example.test',
    });
  },
);

When('the team decides on it', async function (this: GameWorld) {
  await this.driver.teamDecides({ dilemmaId: this.dilemmaId }, 'withdraw');
});

Then(
  'the player gets the decision the next time they open the app',
  async function (this: GameWorld) {
    const [notice] = await this.driver.moderationNoticesOn(this.player);
    assert.ok(notice, `${this.player} gets no decision`);
    assert.equal(notice.outcome, 'withdrawn');
  },
);

Then(
  'the person who sent the web notice gets the decision by email',
  async function (this: GameWorld) {
    const emails = await this.driver.emailsTo('person@example.test');
    assert.ok(emails.some(({ subject }) => subject.startsWith('Decisión')));
  },
);
