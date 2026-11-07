import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { CATEGORIES } from './categories.ts';
import { useDilemmaSearch } from './use-dilemma-search.ts';
import styles from './pick-dilemmas-sheet.module.css';
import sheet from './sheet.module.css';

interface PickDilemmasSheetProps {
  readonly roomId: string;
  /** The ones the host picked before, checked from the start. */
  readonly picked: readonly string[];
  readonly onPick: (dilemmaIds: readonly string[]) => void;
  readonly onClose: () => void;
}

/**
 * The host searches the catalog by category and tag and picks the dilemmas of the game; or, with
 * some picked before, unchecks them all to go back to a game by category.
 */
export function PickDilemmasSheet({ roomId, picked, onPick, onClose }: PickDilemmasSheetProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState('');
  const [chosen, setChosen] = useState<readonly string[]>(picked);
  const search = useDilemmaSearch(roomId, { category, tags });
  // With dilemmas picked before, unchecking them all goes back to a game by category.
  const byCategory = chosen.length === 0 && picked.length > 0;
  const label = byCategory
    ? t('pickDilemmas.byCategory')
    : chosen.length === 0
      ? t('pickDilemmas.none')
      : t('pickDilemmas.play', { count: chosen.length });

  const toggle = (dilemmaId: string) => {
    setChosen(
      chosen.includes(dilemmaId) ? chosen.filter((id) => id !== dilemmaId) : [...chosen, dilemmaId],
    );
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={sheet.sheet} aria-describedby={undefined}>
          <div aria-hidden="true" className={sheet.handle} />
          <div className={sheet.top}>
            <Dialog.Title className={sheet.title}>{t('pickDilemmas.title')}</Dialog.Title>
            <Dialog.Close className={sheet.close} aria-label={t('pickDilemmas.back')}>
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <label className={styles.searchField}>
            <Icon name="search" size={22} />
            <input
              type="search"
              className={styles.searchInput}
              aria-label={t('pickDilemmas.search')}
              placeholder={t('pickDilemmas.searchPlaceholder')}
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </label>
          <div className={styles.chips} role="radiogroup" aria-label={t('settings.category')}>
            {[undefined, ...CATEGORIES].map((id) => (
              <button
                key={id ?? 'all'}
                type="button"
                role="radio"
                aria-checked={category === id}
                className={styles.chip}
                onClick={() => setCategory(id)}
              >
                {id ? t(`categories.${id}`) : t('pickDilemmas.all')}
              </button>
            ))}
          </div>
          <div className={sheet.content}>
            <p className={sheet.hint}>{t('pickDilemmas.hint')}</p>
            {search.status === 'found' && search.dilemmas.length === 0 && (
              <p className={sheet.hint}>{t('pickDilemmas.empty')}</p>
            )}
            {search.status === 'found' &&
              search.dilemmas.map((dilemma) => {
                const checked = chosen.includes(dilemma.dilemmaId);
                return (
                  <button
                    key={dilemma.dilemmaId}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    className={sheet.dilemma}
                    onClick={() => toggle(dilemma.dilemmaId)}
                  >
                    <Icon name={checked ? 'checkBox' : 'checkBoxBlank'} size={22} />
                    <span className={sheet.dilemmaText}>
                      <span className={sheet.dilemmaTitle}>{dilemma.text}</span>
                      <span className={sheet.dilemmaMeta}>
                        {dilemma.tags.map((tag) => `#${tag}`).join(' ')}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
          <button
            type="button"
            className={sheet.primary}
            disabled={chosen.length === 0 && !byCategory}
            onClick={() => {
              onPick(chosen);
              onClose();
            }}
          >
            {label}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
