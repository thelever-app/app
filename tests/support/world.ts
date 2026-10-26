import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { AcceptanceDriver } from './acceptance-driver.ts';
import type { GameDriver } from './driver.ts';

/** One instance per scenario, shared by its steps through `this`. */
export class GameWorld extends World {
  readonly driver: GameDriver;

  /** The answer a step changed, so a later step can refer to it as "that dilemma". */
  changedAnswer: { readonly player: string; readonly position: number } | undefined;

  /** The player who reconnected, so a later step can refer to them as "his". */
  reconnectedPlayer: string | undefined;

  /** The players a step looked through, so a later step can refer to them as "they". */
  viewers: readonly string[] = [];

  constructor(options: IWorldOptions) {
    super(options);
    const { driver } = options.parameters;
    if (driver === 'acceptance') this.driver = new AcceptanceDriver();
    else throw new Error(`Unknown driver: ${driver}`);
  }
}

setWorldConstructor(GameWorld);
