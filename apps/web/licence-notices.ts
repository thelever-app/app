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
  /** The licence text the package ships, with its copyright; none if it ships no such file. */
  readonly text: string | null;
}

/** The files a package keeps its licence and its copyright in. */
const LICENCE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt))?$/i;

/** The licence text in the folder of the package, if it ships one. */
export function licenceTextIn(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((file) => LICENCE_FILE.test(file))
    .sort();
  if (files.length === 0) return null;
  return files.map((file) => readFileSync(path.join(dir, file), 'utf8').trim()).join('\n\n');
}

/**
 * Every package of the listing with its licence and the text it ships, in alphabetical order: what
 * its licence asks to keep when the app hands its code to each browser.
 */
export function noticesOf(
  listing: LicenceListing,
  textIn: (dir: string) => string | null = licenceTextIn,
): LicenceNotice[] {
  return Object.entries(listing)
    .flatMap(([licence, packages]) =>
      packages.flatMap(({ name, versions, paths }) =>
        versions.map((version, index) => ({
          name,
          version,
          licence,
          text: paths[index] ? textIn(paths[index]) : null,
        })),
      ),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

/**
 * Writes the notices of the production dependencies of the web next to its build, and serves them
 * while developing it.
 */
export function licenceNotices(): Plugin {
  const notices = () => JSON.stringify(noticesOf(productionLicences(import.meta.dirname)));
  return {
    name: 'licence-notices',
    configureServer(server) {
      server.middlewares.use(`/${NOTICES_FILE}`, (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.end(notices());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: NOTICES_FILE, source: notices() });
    },
  };
}
