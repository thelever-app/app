import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from 'playwright';

/** The rules of WCAG 2.2 at levels A and AA, which every screen must pass. */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** The narrowest phone, the widest one and a desktop. */
const SCREENS = [
  { width: 320, height: 640 },
  { width: 480, height: 800 },
  { width: 1280, height: 800 },
];
/** On wider screens, the web is a centred column this wide at most. */
const COLUMN_MAX_WIDTH = 480;

/**
 * What is wrong with the screen of the page, as it is now, at every width: content that scrolls
 * sideways, a column that is not centred or too wide, and any failure of accessibility.
 */
export async function problemsOn(page: Page): Promise<string[]> {
  const problems: string[] = [];
  for (const size of SCREENS) {
    await page.setViewportSize(size);
    const at = `at ${size.width} px`;

    const contentWidth: number = await page.evaluate('document.documentElement.scrollWidth');
    if (contentWidth > size.width) problems.push(`${at}, the content scrolls sideways`);

    const column = await page.locator('#root').boundingBox();
    if (!column) {
      problems.push(`${at}, there is no column`);
    } else {
      if (column.width > COLUMN_MAX_WIDTH) {
        problems.push(`${at}, the column is ${column.width} px wide`);
      }
      const right = size.width - column.x - column.width;
      if (Math.abs(column.x - right) > 1) problems.push(`${at}, the column is not centred`);
    }

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    for (const { id, help, nodes } of violations) {
      const where = nodes.map(({ target }) => target.join(' ')).join(', ');
      problems.push(`${at}, ${id}: ${help} (${where})`);
    }
  }
  return problems;
}
