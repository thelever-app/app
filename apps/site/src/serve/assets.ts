import { fileURLToPath } from 'node:url';

function fileOf(specifier: string): string {
  return fileURLToPath(import.meta.resolve(specifier));
}

const BRAND = new URL('../../../web/src/assets/brand/', import.meta.url);

/**
 * What the pages load from /_site/, by name: the stylesheet, the fonts of the app and the
 * illustrations of La Palanca, which the web of the app keeps and the image copies next to it.
 */
export const ASSETS: Readonly<Record<string, { readonly file: string; readonly type: string }>> = {
  'site.css': {
    file: fileURLToPath(new URL('../../assets/site.css', import.meta.url)),
    type: 'text/css; charset=utf-8',
  },
  'mascot-waving.svg': {
    file: fileURLToPath(new URL('mascot-waving.svg', BRAND)),
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
};
