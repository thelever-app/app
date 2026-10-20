import { readFileSync, writeFileSync } from 'node:fs';
import { tokensCss, type DesignTokens } from '../src/tokens-css.ts';

const source = new URL('../src/tokens.json', import.meta.url);
const target = new URL('../src/tokens.css', import.meta.url);

const tokens = JSON.parse(readFileSync(source, 'utf8')) as DesignTokens;
writeFileSync(target, tokensCss(tokens));
console.log(`Wrote ${target.pathname}`);
