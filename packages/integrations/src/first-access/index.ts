/**
 * @thelever-app/integrations/first-access
 *
 * The first access as a whole, from what Identity and Consent publish: where it is for an
 * identity, and the gate that stops who has not finished it (ADR 0001).
 */
export { FirstAccessGate } from './first-access-gate.ts';
export { FirstAccessRequiredError } from './first-access-required.error.ts';
export { type FirstAccessStatus, type FirstAccessStep, statusOf } from './first-access-status.ts';
