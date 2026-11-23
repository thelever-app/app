import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { ReportedDilemma, ReportReason } from '../support/driver.ts';
import { TEAM_RULE } from '../support/moderation-of-the-tests.ts';
import type { GameWorld } from '../support/world.ts';

/** What the scenario keeps of what was reported, to look for it in the moderation repository. */
interface Reported {
  dilemma?: ReportedDilemma;
  /** How the team reads the reason in the issue. */
  reason?: string;
  nickname?: string;
  comment?: string;
}

const reportedIn = new WeakMap<GameWorld, Reported>();

function reported(world: GameWorld): Reported {
  let kept = reportedIn.get(world);
  if (!kept) {
    kept = {};
    reportedIn.set(world, kept);
  }
  return kept;
}

/** Each reason of the scenarios, as the issue says it to the team. */
const REASON_NAMES: Readonly<Record<ReportReason | 'illegal', string>> = {
  offensive: 'Ofensivo',
  confusing: 'Confuso',
  'badly translated': 'Mal traducido',
  other: 'Otro',
  illegal: 'Puede ser ilegal',
};

/** Test data: the email a person leaves in the web form. */
const EMAIL = 'person@example.test';

function reasonOf(text: string): ReportReason {
  if (!(text in REASON_NAMES) || text === 'illegal') {
    throw new Error(`The steps do not know the reason "${text}"`);
  }
  return text as ReportReason;
}

/** Everyone in the room of the scenario, by the nickname the host sees them by. */
async function playersOf(world: GameWorld): Promise<string[]> {
  return (await world.driver.playersSeenBy(await world.host())).map(({ nickname }) => nickname);
}

async function report(world: GameWorld, player: string, reason: ReportReason, comment?: string) {
  await world.game();
  const dilemma = await world.driver.report(player, reason, comment);
  Object.assign(reported(world), { dilemma, reason: REASON_NAMES[reason], comment });
}

// In a game

Given('the game is in the decision phase', async function (this: GameWorld) {
  await this.game();
});

Given('the game is in the reveal', async function (this: GameWorld) {
  await this.game();
  await this.driver.runOutRound();
});

Given('the room is in the lobby', async function (this: GameWorld) {
  await this.host();
});

Given('the room is in the reveal', async function (this: GameWorld) {
  await this.game();
  await this.driver.runOutRound();
});

When(
  '{string} reports the current dilemma as {string}',
  async function (this: GameWorld, player: string, reason: string) {
    await report(this, player, reasonOf(reason));
  },
);

When(
  '{string} reports the current dilemma with the comment {string}',
  async function (this: GameWorld, player: string, comment: string) {
    await report(this, player, 'other', comment);
  },
);

When('{string} reports the current dilemma', async function (this: GameWorld, player: string) {
  await report(this, player, 'confusing');
});

Given(
  '{string} has already reported the current dilemma',
  async function (this: GameWorld, player: string) {
    await report(this, player, 'confusing');
  },
);

When(
  '{string} opens the menu on the avatar of {string} and reports her nickname',
  async function (this: GameWorld, player: string, other: string) {
    await this.driver.reportNickname(player, other);
    Object.assign(reported(this), { nickname: other, reason: REASON_NAMES.offensive });
  },
);

Then(
  'an issue is created in the moderation repository with the id and text of the dilemma and the reason',
  async function (this: GameWorld) {
    const { dilemma, reason } = reported(this);
    assert.ok(dilemma && reason, 'The scenario reported no dilemma');
    await this.driver.syncModeration();
    const issues = await this.driver.moderationIssues();
    const issue = issues.find(({ body }) => body.includes(dilemma.dilemmaId));
    assert.ok(issue, `No issue of ${dilemma.dilemmaId} in the moderation repository`);
    assert.ok(issue.body.includes(dilemma.text), 'The issue does not have the text of the dilemma');
    assert.ok(issue.body.includes(reason), `The issue does not say the reason "${reason}"`);
  },
);

Then(
  'an issue is created in the moderation repository with the nickname and the reason',
  async function (this: GameWorld) {
    const { nickname, reason } = reported(this);
    assert.ok(nickname && reason, 'The scenario reported no nickname');
    await this.driver.syncModeration();
    const issues = await this.driver.moderationIssues();
    const issue = issues.find(({ body }) => body.includes(`> ${nickname}`));
    assert.ok(issue, `No issue of the nickname ${nickname} in the moderation repository`);
    assert.ok(issue.body.includes(reason), `The issue does not say the reason "${reason}"`);
  },
);

Then('the issue contains no data about {string}', async function (this: GameWorld, player: string) {
  await this.driver.syncModeration();
  assert.equal(await this.driver.issuesMention(player), false);
});

Then(
  '{string} is told that the team will review it',
  async function (this: GameWorld, player: string) {
    assert.ok(await this.driver.toldTheTeamWillReview(player));
  },
);

Then('the comment is stored with the report', async function (this: GameWorld) {
  const { comment } = reported(this);
  assert.ok(comment, 'The scenario wrote no comment');
  assert.ok((await this.driver.storedReportComments()).includes(comment));
});

Then('the issue does not contain the comment', async function (this: GameWorld) {
  const { comment } = reported(this);
  assert.ok(comment, 'The scenario wrote no comment');
  await this.driver.syncModeration();
  assert.equal(JSON.stringify(await this.driver.moderationIssues()).includes(comment), false);
});

Then('{string} cannot report it again', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.canReport(player), false);
});

Then('the game continues for everyone', async function (this: GameWorld) {
  for (const player of await playersOf(this)) {
    assert.ok(await this.driver.canAnswer(player), `${player} cannot go on with the game`);
  }
});

Then(
  '{string} and {string} do not know about the report',
  async function (this: GameWorld, first: string, second: string) {
    for (const player of [first, second]) {
      assert.equal(await this.driver.knowsAboutAReport(player), false, `${player} knows`);
    }
  },
);

// From the web

Given('a person who does not use TheLever', function () {});

When(
  'the person sends the web form with the link to a catalog dilemma and why it is illegal',
  async function (this: GameWorld) {
    const dilemma = await this.driver.aCatalogDilemma();
    await this.driver.sendIllegalContentNotice({ dilemmaId: dilemma.dilemmaId });
    Object.assign(reported(this), { dilemma, reason: REASON_NAMES.illegal });
  },
);

Then('the person gets an acknowledgement of receipt', async function (this: GameWorld) {
  assert.ok(await this.driver.noticeAcknowledged());
});

When('a person sends the web form without a name or an email', async function (this: GameWorld) {
  await this.driver.sendIllegalContentNotice({});
});

Then('the notice is accepted', async function (this: GameWorld) {
  assert.ok(await this.driver.noticeAcknowledged());
});

Given(
  'a person who sent an illegal content notice with an email',
  async function (this: GameWorld) {
    const dilemma = await this.driver.aCatalogDilemma();
    await this.driver.sendIllegalContentNotice({ dilemmaId: dilemma.dilemmaId, email: EMAIL });
    reported(this).dilemma = dilemma;
  },
);

When('the team decides on the notice', async function (this: GameWorld) {
  await this.driver.teamDecides('the last one', 'withdraw');
});

Then(
  'the person receives by email the decision, the rule applied and how to appeal',
  async function (this: GameWorld) {
    const decision = (await this.driver.emailsTo(EMAIL)).find(({ subject }) =>
      subject.startsWith('Decisión'),
    );
    assert.ok(decision, `No email with the decision to ${EMAIL}`);
    assert.ok(decision.text.includes('lo hemos retirado'), 'The email does not say the decision');
    assert.ok(decision.text.includes(`apartado ${TEAM_RULE}`), 'The email does not say the rule');
    assert.ok(
      decision.text.includes('privacidad@thelever.app'),
      'The email does not say how to appeal',
    );
  },
);

// Decisions on a report

Given('{string} reported a dilemma as offensive', async function (this: GameWorld, player: string) {
  // In a game of their own: the decision reaches them whatever room they reported it in.
  await this.hostIs('Ana');
  await this.isInTheRoom(player);
  await report(this, player, 'offensive');
});

Given('the team has withdrawn the dilemma', async function (this: GameWorld) {
  const { dilemma } = reported(this);
  assert.ok(dilemma, 'The scenario reported no dilemma');
  await this.driver.teamDecides({ dilemmaId: dilemma.dilemmaId }, 'withdraw');
});

When('{string} opens the app', async function (this: GameWorld, player: string) {
  this.player = player;
  this.moderationNotices = await this.driver.moderationNoticesOn(player);
});

Then(
  '{string} sees, only on his own screen, the decision, the rule applied, that a person decided it and how to appeal',
  async function (this: GameWorld, player: string) {
    const [notice, ...more] = this.moderationNotices;
    assert.ok(notice, `${player} sees no decision`);
    assert.deepEqual(more, []);
    assert.equal(notice.outcome, 'withdrawn');
    assert.equal(notice.rule, TEAM_RULE);
    assert.ok(notice.byAPerson && notice.howToAppeal);
    for (const other of await playersOf(this)) {
      if (other === player) continue;
      assert.deepEqual(await this.driver.moderationNoticesOn(other), [], `${other} sees it too`);
    }
  },
);

Then('the notice is not shown again', async function (this: GameWorld) {
  assert.deepEqual(await this.driver.moderationNoticesOn(this.player), []);
});
