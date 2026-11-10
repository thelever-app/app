import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { GameWorld } from '../support/world.ts';

/** How long a sound may take to play once its moment happened on the screen. */
const HEARING_MS = 5_000;

/** The moments of the game as the screen names their sounds. */
const SOUND = {
  joining: 'player-joined',
  starting: 'game-started',
  answer: 'answer-confirmed',
  lastSeconds: 'last-seconds',
  reveal: 'dilemma-revealed',
} as const;

/** Waits until the device of `player` has played the sound of `moment`. */
async function hears(world: GameWorld, player: string, moment: string): Promise<void> {
  const deadline = Date.now() + HEARING_MS;
  for (;;) {
    const heard = await world.driver.soundsHeardBy(player);
    if (heard.includes(moment)) return;
    if (Date.now() > deadline) {
      assert.fail(`${player} did not hear ${moment}; heard ${heard.join(', ') || 'nothing'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Gives the screen of `player` the time a sound would take, and checks `moment` did not sound. */
async function doesNotHear(world: GameWorld, player: string, moment?: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, HEARING_MS / 2));
  const heard = await world.driver.soundsHeardBy(player);
  if (moment) assert.ok(!heard.includes(moment), `${player} heard ${moment}`);
  else assert.deepEqual(heard, [], `${player} heard ${heard.join(', ')}`);
}

// In the lobby

Given('{string} is in the lobby', async function (this: GameWorld, player: string) {
  await this.hostIs(player);
});

When('{string} joins the room', async function (this: GameWorld, player: string) {
  await this.isInTheRoom(player);
});

Then(
  '{string} hears the sound effect of a player joining',
  async function (this: GameWorld, player: string) {
    await hears(this, player, SOUND.joining);
  },
);

Given(
  'a lobby with {string} and {string}',
  async function (this: GameWorld, host: string, guest: string) {
    await this.hostIs(host);
    await this.isInTheRoom(guest);
  },
);

Then(
  '{string} and {string} hear the sound effect of the game starting',
  async function (this: GameWorld, first: string, second: string) {
    await hears(this, first, SOUND.starting);
    await hears(this, second, SOUND.starting);
  },
);

// In a round

Given(
  '{string} is in the decision phase of a round',
  async function (this: GameWorld, player: string) {
    await this.hostIs(player);
    await this.game();
  },
);

Given(
  '{string} and {string} are in the decision phase of a round',
  async function (this: GameWorld, host: string, guest: string) {
    await this.hostIs(host);
    await this.isInTheRoom(guest);
    await this.game();
  },
);

When('{string} answers the dilemma', async function (this: GameWorld, player: string) {
  await this.driver.answer(player);
});

Then(
  '{string} hears the sound effect of an answer',
  async function (this: GameWorld, player: string) {
    await hears(this, player, SOUND.answer);
  },
);

Then('the device of {string} vibrates', async function (this: GameWorld, player: string) {
  assert.ok(
    (await this.driver.vibrationsOf(player)) > 0,
    `the device of ${player} did not vibrate`,
  );
});

Then(
  '{string} and {string} hear the sound effect of the reveal',
  async function (this: GameWorld, first: string, second: string) {
    await hears(this, first, SOUND.reveal);
    await hears(this, second, SOUND.reveal);
  },
);

Then('their devices vibrate', async function (this: GameWorld) {
  for (const player of this.present()) {
    assert.ok(
      (await this.driver.vibrationsOf(player)) > 0,
      `the device of ${player} did not vibrate`,
    );
  }
});

Given(
  '{string} has not answered the dilemma of the round',
  async function (this: GameWorld, player: string) {
    await this.hostIs(player);
  },
);

Given('{string} has answered it', async function (this: GameWorld, player: string) {
  await this.isInTheRoom(player);
  // Someone else who has not answered keeps the round open while each screen opens it again.
  await this.isInTheRoom('Marta');
  await this.game();
  await this.driver.answer(player);
});

When('the last seconds of the time per dilemma begin', async function (this: GameWorld) {
  await this.game();
  await this.driver.reachLastSeconds();
});

Then('{string} hears a tick every second', async function (this: GameWorld, player: string) {
  // Three ticks in a row, one a second, are enough to tell a tick a second from a single warning.
  const started = Date.now();
  await hears(this, player, SOUND.lastSeconds);
  for (;;) {
    const ticks = (await this.driver.soundsHeardBy(player)).filter(
      (sound) => sound === SOUND.lastSeconds,
    );
    if (ticks.length >= 3) break;
    if (Date.now() - started > HEARING_MS + 3_000) {
      assert.fail(`${player} heard ${ticks.length} ticks`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

Then('{string} does not hear them', async function (this: GameWorld, player: string) {
  await doesNotHear(this, player, SOUND.lastSeconds);
});

// Muting

Given('a device where the player has never muted the game', function (this: GameWorld) {
  this.player = 'Luis';
});

When('the player joins a room', async function (this: GameWorld) {
  await this.isInTheRoom(this.player);
});

Then('the game is not muted', async function (this: GameWorld) {
  assert.equal(await this.driver.isMuted(this.player), false);
});

Given('{string} has muted the game', async function (this: GameWorld, player: string) {
  await this.hostIs(player);
  await this.driver.mute(player);
});

When('the dilemma of the round is revealed', async function (this: GameWorld) {
  await this.game();
  await this.driver.runOutRound();
});

Then('{string} hears no sound effect', async function (this: GameWorld, player: string) {
  await doesNotHear(this, player);
});

Then('the device of {string} does not vibrate', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.vibrationsOf(player), 0, `the device of ${player} vibrated`);
});

When('{string} opens the app again', async function (this: GameWorld, player: string) {
  await this.driver.reopenApp(player);
});

Then('the game is still muted for {string}', async function (this: GameWorld, player: string) {
  assert.equal(await this.driver.isMuted(player), true);
});

// Motion

Given('a device with reduced motion', function (this: GameWorld) {
  this.player = 'Ana';
  this.driver.reduceMotionFor(this.player);
});

When('the player goes through the lobby and a round', async function (this: GameWorld) {
  await this.hostIs(this.player);
  await this.isInTheRoom('Luis');
  await this.game();
  await this.driver.answer(this.player);
  await this.driver.runOutRound();
});

Then('no component moves or changes size', async function (this: GameWorld) {
  assert.deepEqual(await this.driver.movementsSeenBy(this.player), []);
});
