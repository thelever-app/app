import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { FirstAccessScreen } from '../support/driver.ts';
import { SOMEONE, type GameWorld } from '../support/world.ts';

const HOUR = 60 * 60;

/** The countries the scenarios name, by an ISO code of each. */
const COUNTRIES: Readonly<Record<string, string>> = {
  'in the EEA': 'ES',
  'in the rest of the world': 'US',
  'a sanctioned country': 'RU',
  'the United Kingdom': 'GB',
};

function countryOf(where: string): string {
  const country = COUNTRIES[where];
  if (!country) throw new Error(`No country of the test data for "${where}"`);
  return country;
}

async function screenIs(world: GameWorld, expected: FirstAccessScreen): Promise<void> {
  assert.equal(await world.driver.firstAccessScreenOf(world.player), expected);
}

// A device that has never used TheLever

Given('a device that has never used TheLever', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.newDevice(this.player, { country: countryOf('in the EEA') });
});

Given(
  /^a device (in the EEA|in the rest of the world) that has never used TheLever$/,
  async function (this: GameWorld, where: string) {
    this.player = SOMEONE.player;
    await this.driver.newDevice(this.player, { country: countryOf(where) });
  },
);

Given(
  /^the user is (in the EEA|in the rest of the world)$/,
  async function (this: GameWorld, where: string) {
    await this.driver.newDevice(this.player, { country: countryOf(where) });
  },
);

Given(
  /^the user is in (a sanctioned country|the United Kingdom)$/,
  async function (this: GameWorld, where: string) {
    await this.driver.newDevice(this.player, { country: countryOf(where) });
  },
);

Given('an invitation link to an existing room', async function (this: GameWorld) {
  await this.host();
});

When('the user opens the app', async function (this: GameWorld) {
  await this.driver.openApp(this.player);
});

When('the user opens the invitation link', async function (this: GameWorld) {
  await this.driver.openApp(this.player, 'invitation');
});

When('declares an age of {int}', async function (this: GameWorld, age: number) {
  await this.driver.declareAge(this.player, age);
});

When(
  'chooses the year of birth of someone who turns {int} this year',
  async function (this: GameWorld, age: number) {
    await this.driver.chooseBirthYear(this.player, new Date().getUTCFullYear() - age);
  },
);

When('accepts the terms of use', async function (this: GameWorld) {
  await this.driver.acceptTerms(this.player);
});

When('does not accept the terms of use', async function (this: GameWorld) {
  await this.driver.declineTerms(this.player);
});

When('gives the game consent', async function (this: GameWorld) {
  await this.driver.giveGameConsent(this.player);
});

When(/^(?:the user )?answers the cookie consent$/, async function (this: GameWorld) {
  await this.driver.answerCookieConsent(this.player);
});

When('the user completes the first access', async function (this: GameWorld) {
  await this.driver.openApp(this.player);
  await this.driver.declareAge(this.player, 25);
  await this.driver.acceptTerms(this.player);
  await this.driver.giveGameConsent(this.player);
  await this.driver.answerCookieConsent(this.player);
});

// Where the first access is

Then('the user reaches the home screen', async function (this: GameWorld) {
  await screenIs(this, 'home');
});

Then(
  'the user sees a summary of the terms of use and can open the full text and the privacy policy',
  async function (this: GameWorld) {
    await screenIs(this, 'terms');
    assert.deepEqual(await this.driver.legalTextsOfferedTo(this.player), ['terms', 'privacy']);
  },
);

Then(
  'the accepted version of the terms is recorded when the user accepts them',
  async function (this: GameWorld) {
    await this.driver.acceptTerms(this.player);
    await this.driver.giveGameConsent(this.player);
    assert.equal(
      await this.driver.acceptedVersionOf(this.player, 'terms-of-use'),
      await this.driver.currentVersionOf('terms-of-use'),
    );
  },
);

Then('the user cannot access any feature of the app', async function (this: GameWorld) {
  assert.equal(await this.driver.canUseTheApp(this.player), false);
});

Then(
  'the user stays on the terms of use, able to accept them later',
  async function (this: GameWorld) {
    await screenIs(this, 'terms');
  },
);

Then(
  'the user is asked for the explicit consent to process, to play, their votes, predictions and reactions and what others predict or react about them, in a separate statement that is not preselected',
  async function (this: GameWorld) {
    await screenIs(this, 'game-consent');
    assert.equal(await this.driver.preselected(this.player, 'game-consent'), false);
  },
);

Then(
  'the user cannot access any feature of the app until giving it',
  async function (this: GameWorld) {
    assert.equal(await this.driver.canUseTheApp(this.player), false);
  },
);

Then('the accepted version of the game consent is recorded', async function (this: GameWorld) {
  await this.driver.giveGameConsent(this.player);
  assert.equal(
    await this.driver.acceptedVersionOf(this.player, 'game-consent'),
    await this.driver.currentVersionOf('game-consent'),
  );
});

Then(
  'the user is asked for a year of birth with no year preselected',
  async function (this: GameWorld) {
    await screenIs(this, 'age');
    assert.equal(await this.driver.preselected(this.player, 'year'), false);
  },
);

Then('the screen does not mention any minimum age', async function (this: GameWorld) {
  assert.equal(await this.driver.mentionsMinimumAge(this.player), false);
});

Then('the user is asked for a nickname to join that room', async function (this: GameWorld) {
  await screenIs(this, 'join');
});

Then('the user is shown the terms of use', async function (this: GameWorld) {
  await screenIs(this, 'terms');
});

Then(
  'the user is also asked for the month of birth, with no month preselected',
  async function (this: GameWorld) {
    await screenIs(this, 'month');
    assert.equal(await this.driver.preselected(this.player, 'month'), false);
  },
);

Then(
  'the user is told that TheLever is not available in their country',
  async function (this: GameWorld) {
    await screenIs(this, 'blocked-country');
  },
);

Then('the region is stored with the declared age', async function (this: GameWorld) {
  const kept = await this.driver.keptFirstAccessOf(this.player);
  assert.equal(kept.region, 'eea');
  assert.equal(typeof kept.birthYear, 'number');
});

Then('the IP address is not stored', async function (this: GameWorld) {
  const kept = await this.driver.keptFirstAccessOf(this.player);
  const fields = Object.keys(kept).join(' ').toLowerCase();
  assert.doesNotMatch(fields, /ip|address/);
});

Given(
  'a device in the EEA where the user declared an age of {int}',
  async function (this: GameWorld, age: number) {
    this.player = SOMEONE.player;
    await this.driver.newDevice(this.player, { country: countryOf('in the EEA') });
    await this.driver.openApp(this.player);
    await this.driver.declareAge(this.player, age);
  },
);

When('the user opens the app again', async function (this: GameWorld) {
  await this.driver.openApp(this.player);
});

Then(
  'the user reaches the home screen without being asked for age, terms or the game consent',
  async function (this: GameWorld) {
    await screenIs(this, 'home');
  },
);

// Documents that changed

Given(
  'a player who accepted a previous version of the terms of use',
  async function (this: GameWorld) {
    this.player = SOMEONE.player;
    await this.driver.finishFirstAccess(this.player);
    await this.driver.acceptedAnEarlierVersion(this.player, 'terms-of-use');
  },
);

Given('a new version marked as substantial has been published', async function (this: GameWorld) {
  await this.driver.publishVersionThatAsksAgain('terms-of-use');
});

Given('a player who gave a previous version of the game consent', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.finishFirstAccess(this.player);
  await this.driver.acceptedAnEarlierVersion(this.player, 'game-consent');
});

Given(
  'a new version that requires new consent has been published',
  async function (this: GameWorld) {
    await this.driver.publishVersionThatAsksAgain('game-consent');
  },
);

When('the player opens the app', async function (this: GameWorld) {
  await this.driver.openApp(this.player);
});

Then(
  'the player is asked to accept the new terms before playing',
  async function (this: GameWorld) {
    await screenIs(this, 'new-terms');
    assert.equal(await this.driver.canUseTheApp(this.player), false);
  },
);

Then('the accepted version is recorded', async function (this: GameWorld) {
  await this.driver.acceptTerms(this.player);
  assert.equal(
    await this.driver.acceptedVersionOf(this.player, 'terms-of-use'),
    await this.driver.currentVersionOf('terms-of-use'),
  );
});

Then(
  'the player sees the game consent screen with a notice that it has changed, separate from the terms of use',
  async function (this: GameWorld) {
    await screenIs(this, 'game-consent');
    assert.equal(await this.driver.toldTheGameConsentChanged(this.player), true);
  },
);

Then('the player cannot create or join a room until giving it', async function (this: GameWorld) {
  assert.equal(await this.driver.canUseTheApp(this.player), false);
});

Then('the accepted version is recorded when the player gives it', async function (this: GameWorld) {
  await this.driver.giveGameConsent(this.player);
  assert.equal(
    await this.driver.acceptedVersionOf(this.player, 'game-consent'),
    await this.driver.currentVersionOf('game-consent'),
  );
});

// On the device only

Given('the user is asked for the game consent', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.newDevice(this.player, { country: countryOf('in the EEA') });
  await this.driver.openApp(this.player);
  await this.driver.declareAge(this.player, 25);
});

Then(
  'before the checkboxes the user is told that the votes are used only to play and, under this consent, are not sold or used for ads, profiling or research, are seen only by the group, and are deleted within 24 hours except their history',
  async function (this: GameWorld) {
    const points = await this.driver.consentPointsShownTo(this.player);
    assert.deepEqual(points.slice(0, 4), ['play', 'notSold', 'group', 'deleted']);
  },
);

Then(
  'that their history stays on the phone or in the account until they delete it or do not open the app for 24 months',
  async function (this: GameWorld) {
    assert.ok((await this.driver.consentPointsShownTo(this.player)).includes('deleted'));
  },
);

Then('why the consent is asked separately', async function (this: GameWorld) {
  assert.equal(await this.driver.toldWhyTheConsentIsApart(this.player), true);
});

Then(
  'the user can open the privacy policy, which explains that the ranking and, in nominal rooms, the split of the group stay in the history of the others',
  async function (this: GameWorld) {
    assert.ok((await this.driver.legalTextsOfferedTo(this.player)).includes('privacy'));
  },
);

Then('the user can open {string}', async function (this: GameWorld, page: string) {
  assert.equal(page, 'How TheLever is funded');
  assert.equal(await this.driver.openHowTheLeverIsFunded(this.player), true);
});

Given('a browser that sends the Global Privacy Control signal', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.newDevice(this.player, {
    country: countryOf('in the EEA'),
    globalPrivacyControl: true,
  });
  await this.driver.openApp(this.player);
  await this.driver.declareAge(this.player, 25);
  await this.driver.acceptTerms(this.player);
  await this.driver.giveGameConsent(this.player);
});

Then('personalised ads are not enabled', async function (this: GameWorld) {
  assert.equal(await this.driver.personalisedAdsAllowedFor(this.player), false);
});

Then('the user is told why', async function (this: GameWorld) {
  assert.equal(await this.driver.toldAboutGlobalPrivacyControl(this.player), true);
});

Given('the app is not installed on the home screen', async function (this: GameWorld) {
  await this.driver.browserOffersToInstall(this.player);
});

// Reaching the home screen is the step above: where the first access leaves the device.

Then('the user is offered to install the app', async function (this: GameWorld) {
  assert.equal(await this.driver.offeredToInstall(this.player), true);
});

Given('the user closed the offer to install the app', async function (this: GameWorld) {
  this.player = SOMEONE.player;
  await this.driver.finishFirstAccess(this.player);
  await this.driver.browserOffersToInstall(this.player);
  await this.driver.reachHome(this.player);
  await this.driver.closeInstallOffer(this.player);
});

When(
  'the user reaches the home screen again before {int} days have passed',
  async function (this: GameWorld, days: number) {
    await this.driver.letDaysPassOnTheDevice(this.player, days - 1);
    await this.driver.reachHome(this.player);
  },
);

Then('the user is not offered to install the app', async function (this: GameWorld) {
  assert.equal(await this.driver.offeredToInstall(this.player), false);
});

When(
  '{int} days have passed and the user finishes a game',
  async function (this: GameWorld, days: number) {
    await this.driver.letDaysPassOnTheDevice(this.player, days);
    await this.driver.finishAGame(this.player);
    await this.driver.reachHome(this.player);
  },
);

Then('the user is offered to install the app again', async function (this: GameWorld) {
  assert.equal(await this.driver.offeredToInstall(this.player), true);
});

// The deletion of the game data

Given(
  'a room where the player played closed {int} hours ago',
  async function (this: GameWorld, hours: number) {
    this.player = SOMEONE.player;
    await this.isInTheRoom(this.player);
    this.requestGame();
    // Votes, vote predictions and points: the reveal of a round has them all.
    await this.toRevealOf(1);
    for (const player of this.present()) {
      await this.driver.leave(player);
      this.away.add(player);
    }
    await this.driver.letTimePass(hours * HOUR);
    await this.driver.deleteClosedRooms();
  },
);

Then(
  'no vote, prediction, reaction or point of any player from that game is kept',
  async function (this: GameWorld) {
    assert.equal(await this.driver.isGameDataKept(), false);
  },
);

When(
  'the user opens the app from a link with the source {string}, the campaign {string} and the content {string}',
  async function (this: GameWorld, source: string, campaign: string, content: string) {
    await this.driver.openAppFrom(this.player, { source, campaign, content });
    this.visitOrigin = { source, campaign, content };
  },
);

Then(
  'the first visit is recorded with that source, that campaign and that content',
  async function (this: GameWorld) {
    assert.deepEqual(await this.driver.firstVisitOf(this.player), this.visitOrigin);
  },
);
