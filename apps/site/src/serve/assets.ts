import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type Face, faceSvg } from '@thelever-app/ui';

function fileOf(specifier: string): string {
  return fileURLToPath(import.meta.resolve(specifier));
}

const BRAND = new URL('../../../web/src/assets/brand/', import.meta.url);

/** What the service sends for an asset: its content, read once, and its type. */
interface Asset {
  readonly content: Buffer;
  readonly type: string;
}

/** The faces the screens of the app in miniature show, drawn as the app draws them. */
const FACES_SHOWN: readonly Face[] = ['face-01', 'face-02', 'face-03', 'face-04', 'face-05'];

/**
 * The files the pages load from /_site/, by name: the stylesheet, the fonts of the app and the
 * illustrations of La Palanca, which the web of the app keeps and the image copies next to it.
 */
const FILES: ReadonlyMap<string, { readonly file: string; readonly type: string }> = new Map(
  Object.entries({
    'site.css': {
      file: fileURLToPath(new URL('../../assets/site.css', import.meta.url)),
      type: 'text/css; charset=utf-8',
    },
    'mascot-waving.svg': {
      file: fileURLToPath(new URL('mascot-waving.svg', BRAND)),
      type: 'image/svg+xml',
    },
    'waving-at-junction.svg': {
      file: fileURLToPath(new URL('waving-at-junction.svg', BRAND)),
      type: 'image/svg+xml',
    },
    'doubting-at-track-end.svg': {
      file: fileURLToPath(new URL('doubting-at-track-end.svg', BRAND)),
      type: 'image/svg+xml',
    },
    'fonts/barlow-400.woff2': {
      file: fileOf('@fontsource/barlow/files/barlow-latin-400-normal.woff2'),
      type: 'font/woff2',
    },
    'fonts/barlow-500.woff2': {
      file: fileOf('@fontsource/barlow/files/barlow-latin-500-normal.woff2'),
      type: 'font/woff2',
    },
    'fonts/barlow-600.woff2': {
      file: fileOf('@fontsource/barlow/files/barlow-latin-600-normal.woff2'),
      type: 'font/woff2',
    },
    'fonts/barlow-condensed-600.woff2': {
      file: fileOf('@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2'),
      type: 'font/woff2',
    },
    'fonts/barlow-condensed-700.woff2': {
      file: fileOf('@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2'),
      type: 'font/woff2',
    },
  }),
);

/** What the pages load from /_site/, by name: the files, and the faces of the players. */
export const ASSETS: ReadonlyMap<string, Asset> = new Map([
  ...[...FILES].map(([name, { file, type }]): [string, Asset] => [
    name,
    { content: readFileSync(file), type },
  ]),
  ...FACES_SHOWN.map((face): [string, Asset] => [
    `faces/${face}.svg`,
    { content: Buffer.from(faceSvg(face)), type: 'image/svg+xml' },
  ]),
]);

/** The first characters of the hash of each asset: what its address changes with. */
const VERSIONS = new Map(
  [...ASSETS].map(([name, { content }]) => [
    name,
    createHash('sha256').update(content).digest('hex').slice(0, 12),
  ]),
);

/**
 * The address a page loads an asset from, which changes with its content: a browser or the CDN
 * that kept an earlier version asks for the new one instead of using it with pages it does not fit.
 */
export function assetPath(name: string): string {
  const version = VERSIONS.get(name);
  if (version === undefined) throw new Error(`There is no asset ${name}`);
  return `/_site/${name}?v=${version}`;
}
