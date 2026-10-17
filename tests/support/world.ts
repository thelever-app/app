import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { AcceptanceDriver } from './acceptance-driver.ts';
import type { GameDriver } from './driver.ts';

/** One instance per scenario, shared by its steps through `this`. */
export class GameWorld extends World {
  readonly driver: GameDriver;

  // TODO: scenario state the steps need to share, if any.

  constructor(options: IWorldOptions) {
    super(options);
    const { driver } = options.parameters;
    if (driver === 'acceptance') this.driver = new AcceptanceDriver();
    else throw new Error(`Unknown driver: ${driver}`);
  }
}

setWorldConstructor(GameWorld);
