import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { GameWorld } from '../support/world.ts';

/** The languages the scenarios of the settings name, and their codes. */
const LANGUAGES: Readonly<Record<string, string>> = { English: 'en', Spanish: 'es' };

function codeOf(language: string): string {
  const code = LANGUAGES[language];
  assert.ok(code, `The steps do not know the language "${language}"`);
  return code;
}

Given('a player who has completed the first access', async function (this: GameWorld) {
  this.player = 'Luis';
  await this.driver.finishFirstAccess(this.player);
});

Given('the app is in {word}', async function (this: GameWorld, language: string) {
  // The device of the player is in Spanish, and the app starts in its language.
  assert.equal(codeOf(language), 'es');
});

When(
  'the player changes the language to {word} in the settings',
  async function (this: GameWorld, language: string) {
    await this.driver.openSettings(this.player);
    await this.driver.chooseTheLanguageOfTheApp(this.player, codeOf(language));
  },
);

Then('the app is shown in {word} immediately', async function (this: GameWorld, language: string) {
  assert.equal(await this.driver.languageShownTo(this.player), codeOf(language));
});

When('the player opens the settings', async function (this: GameWorld) {
  await this.driver.openSettings(this.player);
});

Then('the player has no option to change the declared age', async function (this: GameWorld) {
  assert.equal(await this.driver.settingsOfferTheAge(this.player), false);
});

When('the player opens {string} in the settings', async function (this: GameWorld, screen: string) {
  switch (screen) {
    case 'How TheLever is funded':
      await this.driver.openSettings(this.player);
      this.funding = await this.driver.fundingSeenInTheSettings(this.player);
      return;
    case 'Your data':
      // What the room server gives the screen: the application reads it with no settings to open.
      this.requestCode = await this.driver.requestCodeSeenBy(this.player);
      return;
    case 'Cookies and ads':
      await this.driver.openSettings(this.player);
      await this.driver.openCookieChoices(this.player);
      return;
    default:
      assert.fail(`The steps do not open "${screen}"`);
  }
});

Then('the player sees that TheLever is funded with ads', function (this: GameWorld) {
  assert.equal(this.funding?.ads, true);
});

Then(
  'that permission to use games for research may be asked later, optionally and explicitly',
  function (this: GameWorld) {
    assert.equal(this.funding?.researchLater, true);
  },
);

Then(
  'that players can support TheLever with a donation, which gives no advantage in the game',
  function (this: GameWorld) {
    assert.equal(this.funding?.donationWithoutAdvantage, true);
  },
);

Then('the player can open the donation page', function (this: GameWorld) {
  assert.equal(this.funding?.donationPage, this.driver.donationPage());
});

Then(
  'the first row is a link to support TheLever with a donation',
  async function (this: GameWorld) {
    assert.equal((await this.driver.firstRowOfTheSettings(this.player)).donation, true);
  },
);

Then('it opens the donation page', async function (this: GameWorld) {
  const { href } = await this.driver.firstRowOfTheSettings(this.player);
  assert.equal(href, this.driver.donationPage());
});

When('the player opens {string}', async function (this: GameWorld, screen: string) {
  await this.driver.openSettings(this.player);
  if (screen === 'Contact and reports') {
    this.contact = await this.driver.contactSeenInTheSettings(this.player);
    return;
  }
  if (screen === 'Delete my data') {
    await this.driver.openTheDeletion(this.player);
    return;
  }
  assert.equal(screen, 'Credits and licences', `The steps do not open "${screen}"`);
  this.credits = await this.driver.creditsSeenInTheSettings(this.player);
});

Then(
  'the player sees the contact email and the languages in which it is answered',
  function (this: GameWorld) {
    assert.equal(this.contact?.email, 'privacidad@thelever.app');
    assert.match(this.contact?.text ?? '', /en español y en inglés/);
  },
);

Then('can open the web form to report illegal content', function (this: GameWorld) {
  assert.equal(this.contact?.form, '/denunciar');
});

Then(
  'the player sees the third-party licence notices and the credit to DiceBear',
  function (this: GameWorld) {
    assert.ok((this.credits?.notices.length ?? 0) > 0, 'The settings show no licence notice');
    assert.equal(this.credits?.creditsDiceBear, true);
  },
);

Then('can open the source code of the app', function (this: GameWorld) {
  assert.equal(this.credits?.sourceCode, 'https://github.com/thelever-app/app');
});

// Privacy and data

Given('a player without an account', function (this: GameWorld) {
  // Accounts arrive later: every player is without one, as the player of the background.
  assert.ok(this.player);
});

When(
  'someone sends a data request by email without the code of that player',
  async function (this: GameWorld) {
    await this.driver.sendDataDeletionByEmail(this.player, false);
  },
);

Then('the request is not carried out', async function (this: GameWorld) {
  assert.equal((await this.driver.lastRequestByEmail()).carriedOut, false);
  await this.driver.runTheDeletionJob();
  assert.ok('firstAccess' in (await this.driver.personalDataOf(this.player)));
});

Then('the reply explains how to send it with the code', async function (this: GameWorld) {
  const { reply } = await this.driver.lastRequestByEmail();
  assert.match(reply ?? '', /send us the request again .* with it/);
  assert.match(reply ?? '', /Settings › Privacy and data › Your data/);
});

When('the player objects to product analytics in the settings', async function (this: GameWorld) {
  await this.driver.objectToProductAnalytics(this.player);
});

When('plays a game', async function (this: GameWorld) {
  await this.driver.createRoom(this.player);
  await this.driver.joinRoom('Ana');
  await this.driver.joinRoom('Marta');
  await this.driver.startGame(this.player);
});

Then('no analytics event of the player is recorded', async function (this: GameWorld) {
  assert.equal(await this.driver.analyticsEventsOf(this.player), 0);
  // The others do count: the objection is only of the player.
  assert.ok((await this.driver.analyticsEventsOf('Ana')) > 0);
});

When('the player requests the deletion of their data', async function (this: GameWorld) {
  await this.driver.requestDataDeletion(this.player);
});

Then(
  'all data linked to their identifier is deleted within one month',
  async function (this: GameWorld) {
    // The deletion job runs every day, well inside the month.
    await this.driver.runTheDeletionJob();
    const kept = await this.driver.personalDataOf(this.player);
    assert.deepEqual(Object.keys(kept), ['consent']);
  },
);

Then('their account is deleted if they have one', function (this: GameWorld) {
  // Accounts arrive later: the player has none, and their identity went with the rest.
  assert.ok(this.player);
});

Then(
  'only a minimal record of the consent required by law is kept',
  async function (this: GameWorld) {
    const { consent } = (await this.driver.personalDataOf(this.player)) as {
      consent?: { documents: readonly { document: string; version: number }[] };
    };
    assert.deepEqual(consent?.documents.map(({ document }) => document).sort(), [
      'game-consent',
      'terms-of-use',
    ]);
  },
);

Given('the player has played a game whose room is still kept', async function (this: GameWorld) {
  await this.driver.createRoom(this.player);
  await this.driver.joinRoom('Ana');
  await this.driver.joinRoom('Marta');
  await this.driver.startGame(this.player);
  await this.driver.answer(this.player);
  assert.ok((await this.driver.gameDataOf(this.player)) > 0);
});

When(
  'the player chooses to withdraw the game consent in the settings',
  async function (this: GameWorld) {
    await this.driver.chooseToWithdrawTheGameConsent(this.player);
  },
);

Then(
  'the player is warned that the history stored in the account and the game data still within 24 hours will be deleted',
  async function (this: GameWorld) {
    assert.deepEqual(await this.driver.withdrawalWarningSeenBy(this.player), {
      blocksRooms: true,
      deletesData: true,
    });
  },
);

When('the player confirms', async function (this: GameWorld) {
  await this.driver.confirmTheWithdrawal(this.player);
});

Then('the player cannot create or join a room', async function (this: GameWorld) {
  assert.equal(await this.driver.canUseTheApp(this.player), false);
});

Then('the game data still within 24 hours are deleted', async function (this: GameWorld) {
  assert.equal(await this.driver.gameDataOf(this.player), 0);
});

Then('the player is offered to give the game consent again', async function (this: GameWorld) {
  assert.equal(await this.driver.firstAccessScreenOf(this.player), 'game-consent');
});

Then('the player sees a code to include in any request sent by email', function (this: GameWorld) {
  assert.match(
    this.requestCode?.shown ?? '',
    /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
  );
  assert.equal(this.requestCode?.shown, this.requestCode?.kept);
});

Then('the player is told what is deleted and what is kept', async function (this: GameWorld) {
  const explained = await this.driver.deletionExplainedTo(this.player);
  assert.equal(explained.deleted, true);
  assert.equal(explained.kept, true);
});

Then(
  'that their nickname will show as {string} in the history of the others',
  async function (this: GameWorld, nickname: string) {
    assert.equal(nickname, 'Player');
    assert.equal((await this.driver.deletionExplainedTo(this.player)).nicknameAsPlayer, true);
  },
);

Then('the player is signed out at once', async function (this: GameWorld) {
  assert.equal(await this.driver.signedOutAtOnce(this.player), true);
});

Then('the app shows the welcome screen as on a new device', async function (this: GameWorld) {
  assert.equal(await this.driver.firstAccessScreenOf(this.player), 'age');
});

Then(
  'the player can change what they allow, personalised ads included, as easily as they first answered',
  async function (this: GameWorld) {
    assert.equal(await this.driver.cookieChoicesChangeableBy(this.player), true);
  },
);
