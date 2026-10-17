import { After, Before } from '@cucumber/cucumber';
import type { GameWorld } from './world.ts';

Before(async function (this: GameWorld) {
  await this.driver.start();
});

After(async function (this: GameWorld) {
  await this.driver.stop();
});
