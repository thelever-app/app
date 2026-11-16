/** Markup already escaped, which another template takes as it is. */
export class Html {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

/** What goes into a template: text, which is escaped, markup, or nothing. */
type Piece = Html | string | number | false | null | undefined | readonly Piece[];

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character]!);
}

function render(piece: Piece): string {
  if (piece instanceof Html) return piece.value;
  if (Array.isArray(piece)) return piece.map(render).join('');
  if (piece === undefined || piece === null || piece === false) return '';
  return escape(String(piece));
}

/** A template of HTML that escapes every text it is given, in the content and in the attributes. */
export function html(strings: TemplateStringsArray, ...pieces: readonly Piece[]): Html {
  return new Html(
    strings.reduce((page, string, index) => page + render(pieces[index - 1]) + string),
  );
}
