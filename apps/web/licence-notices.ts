import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { productionLicences, type LicenceListing } from '@thelever-app/config/licences';
import type { Plugin } from 'vite';

/** Where the app reads the notices of its third-party code from, next to its build. */
export const NOTICES_FILE = 'third-party-licences.json';

/** The notice of one third-party package, as Credits and licences shows it. */
export interface LicenceNotice {
  readonly name: string;
  readonly version: string;
  readonly licence: string;
  /** Who the package names as its author; none if it names nobody. */
  readonly author: string | null;
  /** The licence text the package ships, with its copyright; none if it ships no such file. */
  readonly text: string | null;
}

/** What the build writes: every notice, and once each the text of the licences some ship without. */
export interface NoticesFile {
  readonly notices: readonly LicenceNotice[];
  readonly licences: Readonly<Record<string, string>>;
}

/** The files a package keeps its licence and its copyright in. */
const LICENCE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt))?$/i;

/** The canonical texts of the licences, by their SPDX id, for the packages that ship none. */
const CANONICAL_DIR = path.join(import.meta.dirname, 'licences');

/** The licence text in the folder of the package, if it ships one. */
export function licenceTextIn(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((file) => LICENCE_FILE.test(file))
    .sort();
  if (files.length === 0) return null;
  return files.map((file) => readFileSync(path.join(dir, file), 'utf8').trim()).join('\n\n');
}

/** The canonical text of the licence, as its steward publishes it; none if the repo lacks it. */
export function canonicalTextOf(licence: string): string | null {
  const file = path.join(CANONICAL_DIR, `${licence}.txt`);
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
}

/**
 * Every package of the listing with its licence and the text it ships, in alphabetical order, and
 * the canonical text of each licence a package ships without: what its licence asks to keep when
 * the app hands its code to each browser. A licence with neither stops the build.
 */
export function noticesOf(
  listing: LicenceListing,
  textIn: (dir: string) => string | null = licenceTextIn,
  canonicalOf: (licence: string) => string | null = canonicalTextOf,
): NoticesFile {
  const notices = Object.entries(listing)
    .flatMap(([licence, packages]) =>
      packages.flatMap(({ name, versions, paths, author }) =>
        versions.map((version, index) => ({
          name,
          version,
          licence,
          author: author ?? null,
          text: paths[index] ? textIn(paths[index]) : null,
        })),
      ),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  const licences: Record<string, string> = {};
  for (const { name, licence, text } of notices) {
    if (text !== null || licences[licence] !== undefined) continue;
    const canonical = canonicalOf(licence);
    if (canonical === null) {
      throw new Error(
        `${name} ships no licence text and the repo has no text of ${licence}: add apps/web/licences/${licence}.txt`,
      );
    }
    licences[licence] = canonical;
  }
  return { notices, licences };
}

/**
 * Writes the notices of the production dependencies of the web next to its build, and serves them
 * while developing it, read once.
 */
export function licenceNotices(): Plugin {
  let notices: string | undefined;
  const json = () =>
    (notices ??= JSON.stringify(noticesOf(productionLicences(import.meta.dirname))));
  return {
    name: 'licence-notices',
    configureServer(server) {
      server.middlewares.use(`/${NOTICES_FILE}`, (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.end(json());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: NOTICES_FILE, source: json() });
    },
  };
}
