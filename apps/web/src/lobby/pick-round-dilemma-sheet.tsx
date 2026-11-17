import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import { CATEGORIES, type Category } from './categories.ts';
import { MoreDilemmas } from './more-dilemmas.tsx';
import { type FoundDilemma, useDilemmaSearch } from './use-dilemma-search.ts';
import styles from './pick-round-dilemma-sheet.module.css';
import sheet from './sheet.module.css';

interface PickRoundDilemmaSheetProps {
  readonly roomId: string;
  /** The number of the round, from 1, in the order the game plays them. */
  readonly roundNumber: number;
  /** The dilemma the round has now, checked from the start. */
  readonly current?: string | undefined;
  /** The dilemmas in the other rounds, with the number of each round: none can be chosen again. */
  readonly taken: ReadonlyMap<string, number>;
  readonly onPick: (dilemma: FoundDilemma) => void;
  readonly onClose: () => void;
}

/**
 * The dilemma of one round: whoever chooses it, the host or a player, searches the catalog by
 * category and by text and chooses one that is in no other round. A full screen over the lobby.
 */
export function PickRoundDilemmaSheet({
  roomId,
  roundNumber,
  current,
  taken,
  onPick,
  onClose,
}: PickRoundDilemmaSheetProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [text, setText] = useState('');
  // The one checked, once the player taps it; the one the round has until then.
  const [chosen, setChosen] = useState<FoundDilemma | undefined>(undefined);
  const chosenId = chosen?.dilemmaId ?? current;
  const search = useDilemmaSearch(roomId, { category, text });
  const found = search.status === 'failed' ? [] : search.dilemmas;

  const confirm = () => {
    if (chosen && chosen.dilemmaId !== current) onPick(chosen);
    onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Content className={styles.screen} aria-describedby={undefined}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <Dialog.Close className={styles.back} aria-label={t('pickDilemmas.back')}>
                <Icon name="arrowBack" />
              </Dialog.Close>
              <Dialog.Title className={sheet.title}>
                {t('pickDilemmas.title', { number: roundNumber })}
              </Dialog.Title>
            </div>
            <label className={styles.searchField}>
              <Icon name="search" size={22} />
              <input
                type="search"
                className={styles.searchInput}
                aria-label={t('pickDilemmas.search')}
                placeholder={t('pickDilemmas.searchPlaceholder')}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <div
              className={styles.chips}
              role="radiogroup"
              aria-label={t('pickDilemmas.categories')}
            >
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
          </header>
          <div className={styles.list} aria-busy={search.status === 'searching'}>
            <p className={sheet.hint}>{t('pickDilemmas.hint')}</p>
            {search.status === 'found' && found.length === 0 && (
              <p className={sheet.hint}>{t('pickDilemmas.empty')}</p>
            )}
            <div className={styles.dilemmas} role="radiogroup" aria-label={t('pickDilemmas.list')}>
              {found.map((dilemma) => {
                const inRound = taken.get(dilemma.dilemmaId);
                const checked = inRound === undefined && chosenId === dilemma.dilemmaId;
                return (
                  <button
                    key={dilemma.dilemmaId}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-disabled={inRound !== undefined}
                    className={`${sheet.dilemma} ${styles.dilemma}`}
                    onClick={() => inRound === undefined && setChosen(dilemma)}
                  >
                    <Icon
                      name={
                        inRound !== undefined
                          ? 'block'
                          : checked
                            ? 'radioChecked'
                            : 'radioUnchecked'
                      }
                      size={22}
                    />
                    <span className={sheet.dilemmaText}>
                      <span className={sheet.dilemmaTitle}>
                        <DilemmaText
                          text={dilemma.text}
                          personInTheGap={t('pickDilemmas.someone')}
                        />
                      </span>
                      {inRound !== undefined ? (
                        <span className={`${sheet.dilemmaMeta} ${styles.taken}`}>
                          {t('pickDilemmas.taken', { number: inRound })}
                        </span>
                      ) : (
                        <span className={sheet.dilemmaMeta}>
                          {[
                            t(`categories.${dilemma.category}`, { defaultValue: dilemma.category }),
                            t('pickDilemmas.options', { count: dilemma.optionCount }),
                          ].join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <MoreDilemmas search={search} />
          </div>
          <footer className={styles.footer}>
            <button
              type="button"
              className={sheet.primary}
              disabled={chosenId === undefined}
              onClick={confirm}
            >
              {chosenId === undefined
                ? t('pickDilemmas.none')
                : t('pickDilemmas.put', { number: roundNumber })}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
