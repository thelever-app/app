import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  BeforeStep,
  setDefaultTimeout,
  Status,
} from '@cucumber/cucumber';
import { E2eDriver } from './e2e-driver.ts';
import { startE2eStack, stopE2eStack } from './e2e-stack.ts';
import { problemsOn } from './screen-checks.ts';
import type { GameWorld } from './world.ts';

// The e2e steps drive browsers and wait for reconnections: setting up a room of three takes some 9
// seconds and each round played some 5 more, and a busy machine can take twice as long. The limit
// only stops a step that hangs, so it stays well above what any step takes; the acceptance ones
// never get near it.
setDefaultTimeout(90_000);

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

// A scenario whose game has ended plays it through once its Givens have set it up: at its first
// When or Then. Playing every round and every screen of the results takes a while.
BeforeStep({ timeout: 180_000 }, async function (this: GameWorld, { pickleStep }) {
  if (pickleStep.type !== 'Context') await this.endIfRequested();
});

// Cucumber runs After hooks in the reverse order they are defined: this one runs before the
// driver closes the screens. Only after a passed scenario, so a failure is not buried in noise.
After({ tags: '@ui', timeout: 60_000 }, async function (this: GameWorld, { result }) {
  if (!(this.driver instanceof E2eDriver) || result?.status !== Status.PASSED) return;

  // Every screen at once: each one is a browser of its own, and they are checked as they rest.
  const found = await Promise.all(this.driver.screens().map((page) => problemsOn(page)));
  const problems = found.flatMap((onScreen, index) =>
    onScreen.map((problem) => `Screen ${index + 1}, ${problem}`),
  );
  if (problems.length > 0) {
    throw new Error(`What players see has problems:\n${problems.join('\n')}`);
  }
});
