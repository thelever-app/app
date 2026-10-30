// The acceptance profile runs every scenario not tagged @todo against the application layer (ADR 0001).
// The e2e profile runs those tagged @ui in browsers against the room server and the built web;
// it needs the Auth emulator, so it runs through `pnpm test:e2e` at the root.

export default {};

export const acceptance = {
  paths: ['features/**/*.feature'],
  import: ['support/**/*.ts', 'steps/**/*.ts'],
  tags: 'not @todo',
  worldParameters: { driver: 'acceptance' },
};

export const e2e = {
  paths: ['features/**/*.feature'],
  import: ['support/**/*.ts', 'steps/**/*.ts'],
  tags: '@ui and not @todo',
  worldParameters: { driver: 'e2e' },
};
