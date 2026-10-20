/** The shape of `tokens.json` as the design system artifact exports it. */
export interface DesignTokens {
  readonly name: string;
  readonly color: {
    readonly themes: readonly { readonly id: string }[];
    readonly tokens: readonly { readonly name: string; readonly value: Record<string, string> }[];
  };
  readonly type: {
    readonly families: Record<string, string>;
    readonly groups: readonly {
      readonly family: string;
      readonly styles: readonly {
        readonly name: string;
        readonly fontSize: string;
        readonly lineHeight: string;
        readonly fontWeight: number;
        readonly letterSpacing?: string;
      }[];
    }[];
  };
  readonly spacing: {
    readonly tokens: readonly { readonly name: string; readonly value: string }[];
  };
  readonly radius: {
    readonly tokens: readonly { readonly name: string; readonly value: string }[];
  };
}

const LIGHT = 'light';
const DARK = 'dark';

/** Turns the design tokens into CSS custom properties, light by default and dark when the device asks for it. */
export function tokensCss(tokens: DesignTokens): string {
  // Lower case, as Prettier writes them, so the generated file is already formatted.
  const colors = (theme: string) =>
    tokens.color.tokens.map(
      ({ name, value }) =>
        `  --color-${name}: ${(value[theme] ?? value[LIGHT] ?? '').toLowerCase()};`,
    );
  const families = Object.entries(tokens.type.families).map(
    ([name, value]) => `  --font-${name}: ${value};`,
  );
  const typeStyles = tokens.type.groups.flatMap(({ family, styles }) =>
    styles.flatMap(({ name, fontSize, lineHeight, fontWeight, letterSpacing }) => [
      `  --type-${name}-family: var(--font-${family});`,
      `  --type-${name}-size: ${fontSize};`,
      `  --type-${name}-line-height: ${lineHeight};`,
      `  --type-${name}-weight: ${fontWeight};`,
      `  --type-${name}-letter-spacing: ${letterSpacing ?? 'normal'};`,
    ]),
  );
  const lengths = [...tokens.spacing.tokens, ...tokens.radius.tokens].map(
    ({ name, value }) => `  --${name}: ${value};`,
  );

  return [
    `/* ${tokens.name}: generated from tokens.json by \`pnpm --filter @thelever-app/ui tokens\`. Do not edit. */`,
    ':root {',
    '  color-scheme: light dark;',
    ...colors(LIGHT),
    ...families,
    ...typeStyles,
    ...lengths,
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    ...colors(DARK).map((line) => `  ${line}`),
    '  }',
    '}',
    '',
  ].join('\n');
}
