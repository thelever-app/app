import { execFileSync } from 'node:child_process';

/**
 * The licences a dependency of TheLever may have: the ones compatible with the AGPL-3.0 that the
 * app can redistribute keeping their notices. Any other, or none at all, is reviewed before it
 * comes in.
 */
export const ALLOWED_LICENCES: ReadonlySet<string> = new Set([
  'MIT',
  'ISC',
  'BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'Unlicense',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Apache-2.0',
  'MPL-2.0',
  'OFL-1.1',
]);

/** A dependency as `pnpm licenses list --json` gives it, under the licence it declares. */
export interface LicensedPackage {
  readonly name: string;
  readonly versions: readonly string[];
  readonly paths: readonly string[];
  readonly license: string;
}

/** What `pnpm licenses list --json` answers: the dependencies by the licence they declare. */
export type LicenceListing = Readonly<Record<string, readonly LicensedPackage[]>>;

/** The production dependencies installed under `dir`, of the whole workspace with `recursive`. */
export function productionLicences(dir: string, recursive = false): LicenceListing {
  const output = execFileSync(
    'pnpm',
    [...(recursive ? ['-r'] : []), 'licenses', 'list', '--prod', '--json'],
    { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(output) as LicenceListing;
}

/** Each dependency whose licence is not allowed, as `name (licence)`, in order. */
export function notAllowed(listing: LicenceListing): string[] {
  return Object.entries(listing)
    .filter(([licence]) => !ALLOWED_LICENCES.has(licence))
    .flatMap(([licence, packages]) => packages.map(({ name }) => `${name} (${licence})`))
    .sort();
}
