import { After, Before, setDefaultTimeout } from '@cucumber/cucumber';
import type { GameWorld } from './world.ts';

// A browser needs more than the 5 seconds Cucumber allows by default. Acceptance steps finish in milliseconds.
setDefaultTimeout(30_000);

Before(async function (this: GameWorld) {
  await this.driver.start();
});

After(async function (this: GameWorld) {
  await this.driver.stop();
});
