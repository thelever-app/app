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
  assert.equal(screen, 'How TheLever is funded', `The steps do not open "${screen}"`);
  await this.driver.openSettings(this.player);
  this.funding = await this.driver.fundingSeenInTheSettings(this.player);
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
