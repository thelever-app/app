import { faceUri } from '../avatar/avatar.tsx';
import { iconUrl, type IconName } from '../components/icon.tsx';
import { peopleOn, type CardChip, type CardContent, type CardPerson } from './card-content.ts';

/** A vertical image for the stories of a phone: the card of the design, four times its size. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;
const PADDING = 80;
const WIDTH = CARD_WIDTH - 2 * PADDING;
const STRIPES = 56;
const FOOTER = 160;

/** The colours of the card on ink that the tokens do not have. */
const PAPER = '#F5EFE2';
const MUTED = '#B8AF9C';
const RULE = '#3A352C';

interface Palette {
  readonly ink: string;
  readonly signal: string;
  readonly display: string;
  readonly text: string;
  /** The colour of a token, as the page has it. */
  readonly token: (name: string, fallback: string) => string;
}

/** The colours and fonts of the card, read from the tokens of the design, so the image matches the app. */
function paletteOf(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: token('--color-ink', '#17140F'),
    signal: token('--color-primary', '#FFD23F'),
    display: token('--font-display', "'Barlow Condensed', sans-serif"),
    text: token('--font-text', 'Barlow, sans-serif'),
    token,
  };
}

/** The faces and the symbols the card draws, loaded before it draws anything. */
interface Images {
  readonly faces: ReadonlyMap<string, HTMLImageElement>;
  readonly icons: ReadonlyMap<IconName, HTMLImageElement>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`the image ${src.slice(0, 32)} did not load`));
    image.src = src;
  });
}

async function imagesOf(content: CardContent): Promise<Images> {
  const faces = new Map<string, HTMLImageElement>();
  const icons = new Map<IconName, HTMLImageElement>();
  const chips = content.sections.flatMap((section) =>
    section.kind === 'chips' ? section.chips : [],
  );
  await Promise.all([
    ...[...new Set(peopleOn(content).map(({ avatar }) => avatar.face))].map(async (face) => {
      faces.set(face, await loadImage(faceUri(face)));
    }),
    ...[...new Set(chips.map(({ icon }) => icon))].map(async (icon) => {
      icons.set(icon, await loadImage(iconUrl(icon)));
    }),
  ]);
  return { faces, icons };
}

/** A canvas only draws a web font once the page has it: the ones the card writes with, first. */
async function fontsFor(palette: Palette): Promise<void> {
  const fonts = (document as Partial<Document>).fonts;
  if (!fonts) return;
  await Promise.all(
    [`600 16px ${palette.display}`, `400 16px ${palette.text}`, `600 16px ${palette.text}`].map(
      (font) => fonts.load(font).catch(() => []),
    ),
  );
}

/** A part of the card, measured first and drawn from its top once the whole card is centred. */
interface Block {
  readonly height: number;
  readonly draw: (top: number) => void;
}

/**
 * Draws the card on the whole canvas: the stripes of the track on top, what it says centred in the
 * middle and where to play at the foot. The faces, the symbols and the fonts load first, so it
 * resolves once everything is drawn.
 */
export async function drawCard(
  context: CanvasRenderingContext2D,
  content: CardContent,
): Promise<void> {
  const palette = paletteOf();
  const [images] = await Promise.all([imagesOf(content), fontsFor(palette)]);
  const pen = new Pen(context, palette, images);

  context.fillStyle = palette.ink;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  pen.stripes();

  const blocks: Block[] = [pen.label(content.eyebrow)];
  const group = content.sections.some(({ kind }) => kind === 'dilemma');
  blocks.push(pen.headline(content.headline, group ? 136 : 180));
  if (content.subline) blocks.push(pen.paragraph(content.subline, 52, 72, PAPER));
  for (const section of content.sections) {
    blocks.push(pen.rule(), pen.label(section.label));
    if (section.kind === 'people') blocks.push(pen.people(section.people, section.someone));
    if (section.kind === 'chips') blocks.push(pen.chips(section.chips));
    if (section.kind === 'dilemma') {
      blocks.push(pen.dilemma(section.text), ...section.bars.map((bar) => pen.bar(bar)));
    }
  }

  const gap = group ? 48 : 56;
  const height = blocks.reduce((sum, block) => sum + block.height, 0) + gap * (blocks.length - 1);
  const area = CARD_HEIGHT - STRIPES - FOOTER;
  let top = STRIPES + Math.max(PADDING, (area - height) / 2);
  for (const block of blocks) {
    block.draw(top);
    top += block.height + gap;
  }

  context.fillStyle = RULE;
  context.fillRect(0, CARD_HEIGHT - FOOTER, CARD_WIDTH, 4);
  pen.write(content.footer, `400 44px ${palette.text}`, MUTED, PADDING, CARD_HEIGHT - FOOTER / 2);
}

/** What draws each kind of part of the card, with the sizes of the design times four. */
class Pen {
  readonly #context: CanvasRenderingContext2D;
  readonly #palette: Palette;
  readonly #images: Images;

  constructor(context: CanvasRenderingContext2D, palette: Palette, images: Images) {
    this.#context = context;
    this.#palette = palette;
    this.#images = images;
    context.textBaseline = 'middle';
  }

  /** One line of text, its middle at `middle`. */
  write(text: string, font: string, color: string, x: number, middle: number, spacing = 0): void {
    const context = this.#context;
    context.font = font;
    context.fillStyle = color;
    if ('letterSpacing' in context) context.letterSpacing = `${spacing}px`;
    context.fillText(text, x, middle);
    if ('letterSpacing' in context) context.letterSpacing = '0px';
  }

  width(text: string, font: string): number {
    this.#context.font = font;
    return this.#context.measureText(text).width;
  }

  stripes(): void {
    const context = this.#context;
    context.fillStyle = this.#palette.signal;
    for (let x = -STRIPES; x < CARD_WIDTH + STRIPES; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 40, 0);
      context.lineTo(x + 40 + STRIPES, STRIPES);
      context.lineTo(x + STRIPES, STRIPES);
      context.closePath();
      context.fill();
    }
  }

  label(text: string): Block {
    return {
      height: 56,
      draw: (top) =>
        this.write(
          text.toUpperCase(),
          `600 40px ${this.#palette.text}`,
          MUTED,
          PADDING,
          top + 28,
          4,
        ),
    };
  }

  headline(text: string, size: number): Block {
    return {
      height: size,
      draw: (top) =>
        this.write(
          text,
          `600 ${size}px ${this.#palette.display}`,
          this.#palette.signal,
          PADDING,
          top + size / 2,
        ),
    };
  }

  paragraph(text: string, size: number, lineHeight: number, color: string, maxLines = 6): Block {
    const font = `400 ${size}px ${this.#palette.text}`;
    const lines = this.#linesOf(text, font, WIDTH).slice(0, maxLines);
    return {
      height: lines.length * lineHeight,
      draw: (top) =>
        lines.forEach((line, index) =>
          this.write(line, font, color, PADDING, top + lineHeight * (index + 0.5)),
        ),
    };
  }

  rule(): Block {
    return {
      height: 4,
      draw: (top) => {
        this.#context.fillStyle = RULE;
        this.#context.fillRect(PADDING, top, WIDTH, 4);
      },
    };
  }

  /** Each person, their avatar and their nickname, or «alguien del grupo» if the player hides it. */
  people(people: readonly CardPerson[], someone: string): Block {
    const size = 176;
    const nameFont = `600 116px ${this.#palette.display}`;
    const someoneFont = `400 52px ${this.#palette.text}`;
    const items = people.map((person) => {
      const font = person.name ? nameFont : someoneFont;
      const text = person.name ?? someone;
      return { person, font, text, width: size + 40 + this.width(text, font) };
    });
    const rows = this.#rowsOf(items, 64);
    return {
      height: rows.length * size + (rows.length - 1) * 32,
      draw: (top) =>
        rows.forEach((row, index) => {
          const rowTop = top + index * (size + 32);
          for (const { item, x } of row) {
            this.#face(item.person, x, rowTop, size);
            const color = item.person.name ? PAPER : MUTED;
            this.write(item.text, item.font, color, x + size + 40, rowTop + size / 2);
          }
        }),
    };
  }

  /** Each title as a signal chip: its symbol, what it says and the face of a partner. */
  chips(chips: readonly CardChip[]): Block {
    const height = 120;
    const font = `600 52px ${this.#palette.text}`;
    const items = chips.map((chip) => ({
      chip,
      width: 16 + 88 + 24 + this.width(chip.shown, font) + chip.people.length * 104 + 40,
    }));
    const rows = this.#rowsOf(items, 24);
    return {
      height: rows.length * height + (rows.length - 1) * 24,
      draw: (top) =>
        rows.forEach((row, index) => {
          const rowTop = top + index * (height + 24);
          for (const { item, x } of row) this.#chip(item.chip, x, rowTop, item.width, height, font);
        }),
    };
  }

  dilemma(text: string): Block {
    const font = `600 68px ${this.#palette.display}`;
    const lines = this.#linesOf(text, font, WIDTH).slice(0, 6);
    return {
      height: lines.length * 84,
      draw: (top) =>
        lines.forEach((line, index) =>
          this.write(line, font, PAPER, PADDING, top + 84 * (index + 0.5)),
        ),
    };
  }

  /** An option, with its share, and its bar in the colour of the option, lighter on the ink. */
  bar({ text, percent, color }: { text: string; percent: number; color: string }): Block {
    const font = `400 44px ${this.#palette.text}`;
    const shown = `${percent} %`;
    const [first = ''] = this.#linesOf(text, font, WIDTH - this.width(shown, font) - 32);
    return {
      height: 56 + 24 + 32,
      draw: (top) => {
        const context = this.#context;
        this.write(first, font, PAPER, PADDING, top + 28);
        context.textAlign = 'right';
        this.write(shown, font, PAPER, PADDING + WIDTH, top + 28);
        context.textAlign = 'left';
        const barTop = top + 56 + 24;
        context.fillStyle = RULE;
        context.beginPath();
        context.roundRect(PADDING, barTop, WIDTH, 32, 16);
        context.fill();
        context.save();
        context.beginPath();
        context.roundRect(PADDING, barTop, WIDTH, 32, 16);
        context.clip();
        context.fillStyle = lighter(this.#palette.token(color, '#1358DE'));
        context.fillRect(PADDING, barTop, (WIDTH * percent) / 100, 32);
        context.restore();
      },
    };
  }

  #chip(chip: CardChip, x: number, top: number, width: number, height: number, font: string) {
    const context = this.#context;
    const { ink, signal } = this.#palette;
    context.fillStyle = signal;
    context.beginPath();
    context.roundRect(x, top, width, height, height / 2);
    context.fill();
    const circle = 88;
    const circleTop = top + (height - circle) / 2;
    context.fillStyle = ink;
    context.beginPath();
    context.arc(x + 16 + circle / 2, circleTop + circle / 2, circle / 2, 0, Math.PI * 2);
    context.fill();
    const icon = this.#images.icons.get(chip.icon);
    if (icon) {
      const size = 56;
      context.drawImage(
        tinted(icon, size, signal),
        x + 16 + (circle - size) / 2,
        circleTop + (circle - size) / 2,
      );
    }
    const textX = x + 16 + circle + 24;
    this.write(chip.shown, font, ink, textX, top + height / 2);
    let face = textX + this.width(chip.shown, font) + 16;
    for (const person of chip.people) {
      this.#face(person, face, circleTop, circle);
      face += 104;
    }
  }

  /** An avatar as the app draws it: the face on a circle of the colour of the player. */
  #face({ avatar }: CardPerson, x: number, y: number, size: number): void {
    const context = this.#context;
    context.fillStyle = this.#palette.token(`--color-player-${avatar.color}`, '#D6C58E');
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
    const face = this.#images.faces.get(avatar.face);
    if (face) context.drawImage(face, x, y, size, size);
  }

  /** Breaks a text into the lines that fit the width, word by word. */
  #linesOf(text: string, font: string, width: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const next = line === '' ? word : `${line} ${word}`;
      if (this.width(next, font) > width && line !== '') {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line !== '') lines.push(line);
    return lines;
  }

  /** Puts the items one after another, in as many rows as they need to fit the width. */
  #rowsOf<T extends { readonly width: number }>(
    items: readonly T[],
    gap: number,
  ): { item: T; x: number }[][] {
    const rows: { item: T; x: number }[][] = [];
    let x = PADDING;
    for (const item of items) {
      const row = rows.at(-1);
      if (!row || x + item.width > PADDING + WIDTH) {
        rows.push([{ item, x: PADDING }]);
        x = PADDING + item.width + gap;
      } else {
        row.push({ item, x });
        x += item.width + gap;
      }
    }
    return rows;
  }
}

/** A symbol of the app in one colour: the SVG is black, so it is painted over within its shape. */
function tinted(image: HTMLImageElement, size: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.drawImage(image, 0, 0, size, size);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = color;
  context.fillRect(0, 0, size, size);
  return canvas;
}

/** Halfway to white: the colour of an option reads on the ink of the card. */
function lighter(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return color;
  const channels = [0, 2, 4].map((at) =>
    Math.round((parseInt(hex.slice(at, at + 2), 16) + 255) / 2),
  );
  return `rgb(${channels.join(', ')})`;
}
