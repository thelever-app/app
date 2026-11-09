import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import { useDilemmaSearch } from './use-dilemma-search.ts';
import sheet from './sheet.module.css';

interface AddDilemmaSheetProps {
  readonly roomId: string;
  readonly onAdd: (dilemmaId: string) => void;
  readonly onClose: () => void;
}

/** A player adds a dilemma of the catalog that suits the room, searching it by text or tag. */
export function AddDilemmaSheet({ roomId, onAdd, onClose }: AddDilemmaSheetProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const search = useDilemmaSearch(roomId, { text });
  const found = search.status === 'failed' ? [] : search.dilemmas;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={`${sheet.sheet} ${sheet.tall}`} aria-describedby={undefined}>
          <div aria-hidden="true" className={sheet.handle} />
          <div className={sheet.top}>
            <Dialog.Title className={sheet.title}>{t('addDilemma.title')}</Dialog.Title>
            <Dialog.Close className={sheet.close} aria-label={t('addDilemma.close')}>
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <input
            type="search"
            className={sheet.search}
            aria-label={t('addDilemma.search')}
            placeholder={t('addDilemma.searchPlaceholder')}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className={sheet.content} aria-busy={search.status === 'searching'}>
            {search.status === 'found' && found.length === 0 && (
              <p className={sheet.hint}>{t('addDilemma.empty')}</p>
            )}
            {found.map((dilemma) => (
              <button
                key={dilemma.dilemmaId}
                type="button"
                className={sheet.dilemma}
                onClick={() => {
                  onAdd(dilemma.dilemmaId);
                  onClose();
                }}
              >
                <span className={sheet.dilemmaText}>
                  <span className={sheet.dilemmaTitle}>
                    <DilemmaText text={dilemma.text} personInTheGap={t('pickDilemmas.someone')} />
                  </span>
                  <span className={sheet.dilemmaMeta}>
                    {[
                      t(`categories.${dilemma.category}`, { defaultValue: dilemma.category }),
                      t('pickDilemmas.options', { count: dilemma.optionCount }),
                    ].join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
