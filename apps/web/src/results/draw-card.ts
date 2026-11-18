import { faceUri } from '../avatar/avatar.tsx';
import { peopleOn, type CardContent, type CardPerson } from './card-content.ts';

/** A vertical image for the stories of a phone. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;
const PADDING = 80;

/** The colours of the card, read from the tokens of the design, so the image matches the app. */
function tokens(): (name: string, fallback: string) => string {
  const style = getComputedStyle(document.documentElement);
  return (name, fallback) => style.getPropertyValue(name).trim() || fallback;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`the image ${src.slice(0, 32)} did not load`));
    image.src = src;
  });
}

/** Breaks a text into the lines that fit the width, word by word. */
function linesOf(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line === '' ? word : `${line} ${word}`;
    if (context.measureText(next).width > width && line !== '') {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

/**
 * Draws the card on the whole canvas: the stripes of the track on top, what it says in the middle
 * and where to play at the foot. The faces load first, so it resolves once everything is drawn.
 */
export async function drawCard(
  context: CanvasRenderingContext2D,
  content: CardContent,
): Promise<void> {
  const color = tokens();
  const ink = color('--color-ink', '#17140F');
  const accent = color('--color-accent', '#FFD23F');
  const paper = color('--color-bg', '#FBF6EC');
  const muted = '#B8AF9C';
  const display = color('--font-display', "'Barlow Condensed', sans-serif");
  const body = color('--font-body', 'Barlow, sans-serif');
  const people = peopleOn(content);
  const faces = new Map<string, HTMLImageElement>();
  await Promise.all(
    people.map(async ({ avatar }) => {
      if (!faces.has(avatar.face)) faces.set(avatar.face, await loadImage(faceUri(avatar.face)));
    }),
  );

  context.fillStyle = ink;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  for (let x = -56; x < CARD_WIDTH + 56; x += 80) {
    context.fillStyle = accent;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 40, 0);
    context.lineTo(x + 96, 56);
    context.lineTo(x + 56, 56);
    context.closePath();
    context.fill();
  }

  const width = CARD_WIDTH - 2 * PADDING;
  let y = 360;
  const label = (text: string) => {
    context.fillStyle = muted;
    context.font = `600 36px ${body}`;
    context.fillText(text.toUpperCase(), PADDING, y);
    y += 72;
  };
  const rule = () => {
    context.fillStyle = '#3A352C';
    context.fillRect(PADDING, y, width, 3);
    y += 72;
  };

  context.textBaseline = 'alphabetic';
  label(content.eyebrow);
  context.fillStyle = accent;
  context.font = `600 180px ${display}`;
  context.fillText(content.headline, PADDING, y + 110);
  y += 180;
  if (content.subline) {
    context.fillStyle = paper;
    context.font = `400 48px ${body}`;
    context.fillText(content.subline, PADDING, y);
    y += 60;
  }
  for (const section of content.sections) {
    rule();
    label(section.label);
    if (section.kind === 'people') {
      drawPeople(context, section.people, faces, color, { y, display, paper });
      y += 200;
    }
    if (section.kind === 'chips') {
      context.font = `600 44px ${body}`;
      let x = PADDING;
      for (const { text, people: partners } of section.chips) {
        const names = partners.flatMap(({ name }) => (name ? [name] : []));
        const shown = names.length > 0 ? `${text}, ${names.join(', ')}` : text;
        const chipWidth = context.measureText(shown).width + 64 + partners.length * 72;
        if (x + chipWidth > PADDING + width) {
          x = PADDING;
          y += 100;
        }
        context.fillStyle = accent;
        context.beginPath();
        context.roundRect(x, y - 56, chipWidth, 80, 40);
        context.fill();
        context.fillStyle = ink;
        context.fillText(shown, x + 32, y);
        let face = x + 32 + context.measureText(shown).width + 16;
        for (const { avatar } of partners) {
          drawFace(context, avatar, faces, color, { x: face, y: y - 48, size: 64 });
          face += 72;
        }
        x += chipWidth + 24;
      }
      y += 100;
    }
    if (section.kind === 'dilemma') {
      context.fillStyle = paper;
      context.font = `600 64px ${display}`;
      for (const line of linesOf(context, section.text, width).slice(0, 6)) {
        context.fillText(line, PADDING, y);
        y += 76;
      }
      y += 24;
      for (const bar of section.bars) {
        context.font = `400 40px ${body}`;
        context.fillStyle = paper;
        const [first = ''] = linesOf(context, bar.text, width - 160);
        context.fillText(first, PADDING, y);
        context.textAlign = 'right';
        context.fillText(`${bar.percent} %`, PADDING + width, y);
        context.textAlign = 'left';
        y += 28;
        context.fillStyle = '#3A352C';
        context.fillRect(PADDING, y, width, 24);
        context.fillStyle = accent;
        context.fillRect(PADDING, y, (width * bar.percent) / 100, 24);
        y += 72;
      }
    }
  }

  context.fillStyle = '#3A352C';
  context.fillRect(0, CARD_HEIGHT - 160, CARD_WIDTH, 3);
  context.fillStyle = muted;
  context.font = `400 40px ${body}`;
  context.fillText(content.footer, PADDING, CARD_HEIGHT - 70);
}

function drawPeople(
  context: CanvasRenderingContext2D,
  people: readonly CardPerson[],
  faces: ReadonlyMap<string, HTMLImageElement>,
  color: (name: string, fallback: string) => string,
  { y, display, paper }: { readonly y: number; readonly display: string; readonly paper: string },
): void {
  let x = PADDING;
  for (const { avatar, name } of people) {
    drawFace(context, avatar, faces, color, { x, y: y - 20, size: 140 });
    x += 170;
    if (name) {
      context.fillStyle = paper;
      context.font = `600 88px ${display}`;
      context.fillText(name, x, y + 80);
      x += context.measureText(name).width + 48;
    }
  }
}

/** An avatar as the app draws it: the face on a circle of the colour of the player. */
function drawFace(
  context: CanvasRenderingContext2D,
  avatar: CardPerson['avatar'],
  faces: ReadonlyMap<string, HTMLImageElement>,
  color: (name: string, fallback: string) => string,
  { x, y, size }: { readonly x: number; readonly y: number; readonly size: number },
): void {
  context.fillStyle = color(`--color-player-${avatar.color}`, '#D6C58E');
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  const face = faces.get(avatar.face);
  if (face) context.drawImage(face, x, y, size, size);
}
