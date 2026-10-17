// The acceptance profile runs every scenario not tagged @todo against the application layer (ADR 0001).
// The e2e profile, with Playwright against the real system, arrives with the room server in TSK-24.

export default {};

export const acceptance = {
  paths: ['features/**/*.feature'],
  import: ['support/**/*.ts', 'steps/**/*.ts'],
  tags: 'not @todo',
  worldParameters: { driver: 'acceptance' },
};
