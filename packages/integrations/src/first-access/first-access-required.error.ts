import type { FirstAccessStep } from './first-access-status.ts';

/** Nobody creates a room, joins one or votes before finishing the first access. */
export class FirstAccessRequiredError extends Error {
  readonly step: Exclude<FirstAccessStep, 'done'> | 'not-begun';

  constructor(identity: string, step: Exclude<FirstAccessStep, 'done'> | 'not-begun') {
    super(`${identity} has not finished the first access (${step})`);
    this.name = 'FirstAccessRequiredError';
    this.step = step;
  }
}
