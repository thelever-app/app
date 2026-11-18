// The acceptance profile runs every scenario not tagged @todo against the application layer (ADR 0001),
// but those tagged @screen, which happen only on the device.
// The e2e profile runs those tagged @ui in browsers against the room server and the built web;
// it needs the Auth emulator, so it runs through `pnpm test:e2e` at the root. Its scenarios run in
// two workers at once, each against a stack of its own. It writes each step as it finishes, a line
// each, because `firebase emulators:exec` only passes whole lines on, and how long each step took
// to reports/e2e-usage.txt, slowest first, to see where the time goes. With E2E_SHARD, such as 2/3,
// it runs only that share of the scenarios, so CI splits them among jobs at once.

export default {};

export const acceptance = {
  paths: ['features/**/*.feature'],
  import: ['support/**/*.ts', 'steps/**/*.ts'],
  tags: 'not @todo and not @screen',
  worldParameters: { driver: 'acceptance' },
};

export const e2e = {
  paths: ['features/**/*.feature'],
  import: ['support/**/*.ts', 'steps/**/*.ts'],
  tags: '@ui and not @todo',
  parallel: 2,
  shard: process.env.E2E_SHARD,
  format: ['pretty', 'usage:reports/e2e-usage.txt'],
  worldParameters: { driver: 'e2e' },
};
