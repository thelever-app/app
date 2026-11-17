import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { LanguageDto } from '@thelever-app/protocol';
import type { PublicPageView } from '../support/driver.ts';
import type { GameWorld } from '../support/world.ts';

/** The languages the scenarios name, and their codes. */
const LANGUAGES: Readonly<Record<string, string>> = { English: 'en', Spanish: 'es' };

function codeOf(language: string): string {
  const code = LANGUAGES[language];
  assert.ok(code, `The steps do not know the language "${language}"`);
  return code;
}

async function pageOf(world: GameWorld, name: string, language = 'es'): Promise<PublicPageView> {
  const page = await world.driver.publicPageOf(name, language);
  assert.ok(page, `"${name}" has no public page in ${language}`);
  return page;
}

Given(
  'the dilemma {string} is in the general catalog',
  async function (this: GameWorld, name: string) {
    this.dilemmaName = name;
    await this.driver.catalogDilemmaNamed(name);
  },
);

Given(
  'the dilemma {string} is in the general catalog without reviewed arguments',
  async function (this: GameWorld, name: string) {
    this.dilemmaName = name;
    await this.driver.catalogDilemmaNamed(name);
  },
);

Given('{string} has reviewed arguments', async function (this: GameWorld, name: string) {
  await this.driver.reviewArgumentsOf(name);
});

Given('the arguments of {string} are reviewed', async function (this: GameWorld, name: string) {
  await this.driver.reviewArgumentsOf(name);
});

Given('the dilemma {string} is a private dilemma', async function (this: GameWorld, name: string) {
  await this.driver.dilemmaOutsideTheCatalogNamed(name, 'private');
});

Given(
  'the dilemma {string} is a dilemma in exploration',
  async function (this: GameWorld, name: string) {
    await this.driver.dilemmaOutsideTheCatalogNamed(name, 'in-exploration');
  },
);

Given(
  'the dilemma {string} is a dilemma for adults',
  async function (this: GameWorld, name: string) {
    // With its arguments reviewed, so its age is all that keeps it off the web.
    await this.driver.catalogDilemmaNamed(name, { minimumAge: 18 });
    await this.driver.reviewArgumentsOf(name);
  },
);

Given(
  'the dilemma {string} is a compromising dilemma',
  async function (this: GameWorld, name: string) {
    // With its arguments reviewed, so being compromising is all that keeps it off the web.
    await this.driver.catalogDilemmaNamed(name, { compromising: true });
    await this.driver.reviewArgumentsOf(name);
  },
);

// Nothing counts the answers of a dilemma before the world result does: the public page has
// nothing to show of them either way.
Given('{string} has more than 20 answers', function (this: GameWorld, name: string) {
  this.dilemmaName = name;
});

Given('{string} is removed from the catalog', async function (this: GameWorld, name: string) {
  this.dilemmaName = name;
  await this.driver.removeFromTheCatalog(name);
});

When('the public pages are generated', async function (this: GameWorld) {
  await this.driver.generatePublicPages();
});

When('a visitor opens the public page of {string}', async function (this: GameWorld, name: string) {
  await this.driver.generatePublicPages();
  this.publicPage = await pageOf(this, name);
});

When('a visitor opens its public page', async function (this: GameWorld) {
  await this.driver.generatePublicPages();
  this.publicPage = await pageOf(this, this.dilemmaName);
});

When(
  'a visitor chooses {word} in the language menu of the public page of {string}',
  async function (this: GameWorld, language: string, name: string) {
    await this.driver.generatePublicPages();
    this.publicPage = await this.driver.switchLanguageOfThePublicPage(name, codeOf(language));
  },
);

When(
  'a visitor chooses to play {string} with the group',
  async function (this: GameWorld, name: string) {
    await this.driver.generatePublicPages();
    await this.driver.playWithTheGroupFromThePublicPage(name);
    this.dilemmaToPlayWithTheGroup = name;
  },
);

Given('the visitor has never chosen a language in the app', async function (this: GameWorld) {
  await this.driver.visitorWithoutAChosenLanguage();
});

When(
  'a visitor chooses to play {string} with the group from its public page in {word}',
  async function (this: GameWorld, name: string, language: string) {
    await this.driver.generatePublicPages();
    await this.driver.playWithTheGroupFromThePublicPage(name, codeOf(language));
    this.dilemmaToPlayWithTheGroup = name;
  },
);

Then('the app opens in {word}', async function (this: GameWorld, language: string) {
  assert.equal(await this.driver.languageOfTheApp(), codeOf(language));
});

Then(
  '{string} has a public page in each language of the app',
  async function (this: GameWorld, name: string) {
    for (const language of LanguageDto.options) await pageOf(this, name, language);
  },
);

Then('each version links to the others', async function (this: GameWorld) {
  for (const language of LanguageDto.options) {
    const page = await pageOf(this, this.dilemmaName, language);
    const others = LanguageDto.options.filter((other) => other !== language);
    assert.deepEqual([...page.otherLanguages].sort(), [...others].sort());
  }
});

Then('{string} has no public page', async function (this: GameWorld, name: string) {
  for (const language of LanguageDto.options) {
    assert.equal(await this.driver.publicPageOf(name, language), undefined);
  }
});

Then(
  'the visitor sees the dilemma, its options and the arguments for and against each option',
  function (this: GameWorld) {
    const page = this.publicPage!;
    assert.ok(page.text, 'the page shows no dilemma');
    assert.ok(page.options.length >= 2, 'the page shows no options');
    assert.equal(page.arguments.length, page.options.length);
    for (const argument of page.arguments) {
      assert.ok(argument.for && argument.against, 'an option lacks an argument for or against');
    }
  },
);

Then('the visitor does not see who created it', function (this: GameWorld) {
  assert.equal(this.publicPage!.author, undefined);
});

Then('the visitor does not see how the world voted', function (this: GameWorld) {
  assert.equal(this.publicPage!.worldResult, undefined);
});

Then(
  'the visitor sees the public page of {string} in {word}',
  async function (this: GameWorld, name: string, language: string) {
    const code = codeOf(language);
    assert.equal(this.publicPage!.language, code);
    assert.equal(this.publicPage!.text, (await pageOf(this, name, code)).text);
  },
);

Then(
  'a room is created whose first dilemma is {string}',
  async function (this: GameWorld, name: string) {
    assert.equal(await this.driver.firstDilemmaOfTheVisitorRoom(), name);
  },
);

Then('the address of its page answers that it no longer exists', async function (this: GameWorld) {
  assert.equal(await this.driver.statusOfThePublicPageOf(this.dilemmaName), 410);
});

Then(
  'the public page of {string} shows its arguments and can be indexed',
  async function (this: GameWorld, name: string) {
    const page = await pageOf(this, name);
    assert.equal(page.arguments.length, page.options.length);
    assert.equal(page.indexable, true);
  },
);

Then('the sitemap does not include it', async function (this: GameWorld) {
  assert.equal(await this.driver.sitemapIncludes(this.dilemmaName), false);
});

Then('the sitemap includes it', async function (this: GameWorld) {
  assert.equal(await this.driver.sitemapIncludes(this.dilemmaName), true);
});

Then('a banner ad appears below the arguments', async function (this: GameWorld) {
  assert.ok(await this.driver.bannerAdBelowTheArguments(), 'no ad appears below the arguments');
});

When(
  'a visitor chooses to vote on the public page of {string}',
  async function (this: GameWorld, name: string) {
    await this.driver.generatePublicPages();
    await this.driver.voteFromThePublicPage(name);
  },
);

Then(
  'the app opens on {string} ready to vote alone',
  async function (this: GameWorld, name: string) {
    assert.equal(await this.driver.dilemmaReadyToVoteAlone(), name);
  },
);

When('a visitor votes {string} alone in the app', async function (this: GameWorld, name: string) {
  await this.driver.voteAlone(name);
});

Then(
  'the vote counts for the world result of {string}',
  async function (this: GameWorld, name: string) {
    assert.equal(await this.driver.worldAnswersOf(name), 1);
  },
);

Then('nobody can see what the visitor voted', async function (this: GameWorld) {
  assert.equal(await this.driver.voteOfTheVisitorIsKept(), false);
});

Given(
  '{string} has {int} answers',
  async function (this: GameWorld, name: string, answers: number) {
    await this.driver.dilemmaWithWorldAnswers(name, answers);
  },
);

Then('the visitor sees that there are still too few answers', async function (this: GameWorld) {
  assert.equal((await this.driver.worldResultSeen()).tooFewAnswers, true);
});

Then('sees no figures of the world result', async function (this: GameWorld) {
  assert.deepEqual((await this.driver.worldResultSeen()).figures, []);
});
