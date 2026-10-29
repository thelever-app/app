import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { E2eDriver } from './e2e-driver.ts';
import { startE2eStack, stopE2eStack } from './e2e-stack.ts';
import { problemsOn } from './screen-checks.ts';
import type { GameWorld } from './world.ts';

// The e2e steps drive browsers and wait for reconnections; the acceptance ones never get near this.
setDefaultTimeout(30_000);

BeforeAll({ timeout: 60_000 }, async function () {
  if (this.parameters.driver === 'e2e') await startE2eStack();
});

AfterAll(async function () {
  await stopE2eStack();
});

Before(async function (this: GameWorld) {
  await this.driver.start();
});

After(async function (this: GameWorld) {
  await this.driver.stop();
});

// Cucumber runs After hooks in the reverse order they are defined: this one runs before the
// driver closes the screens. Only after a passed scenario, so a failure is not buried in noise.
After({ tags: '@ui', timeout: 60_000 }, async function (this: GameWorld, { result }) {
  if (!(this.driver instanceof E2eDriver) || result?.status !== Status.PASSED) return;

  const problems: string[] = [];
  for (const [index, page] of this.driver.screens().entries()) {
    for (const problem of await problemsOn(page)) problems.push(`Screen ${index + 1}, ${problem}`);
  }
  if (problems.length > 0) {
    throw new Error(`What players see has problems:\n${problems.join('\n')}`);
  }
});
