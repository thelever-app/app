import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { useDilemmaSearch } from './use-dilemma-search.ts';
import sheet from './sheet.module.css';

interface AddDilemmaSheetProps {
  readonly roomId: string;
  readonly onAdd: (dilemmaId: string) => void;
  readonly onClose: () => void;
}

/** A player adds one dilemma of the catalog that suits the room, searching it by tag. */
export function AddDilemmaSheet({ roomId, onAdd, onClose }: AddDilemmaSheetProps) {
  const { t } = useTranslation();
  const [tags, setTags] = useState('');
  const search = useDilemmaSearch(roomId, { tags });

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={sheet.sheet} aria-describedby={undefined}>
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
            placeholder={t('addDilemma.search')}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <div className={sheet.content}>
            {search.status === 'found' && search.dilemmas.length === 0 && (
              <p className={sheet.hint}>{t('addDilemma.empty')}</p>
            )}
            {search.status === 'found' &&
              search.dilemmas.map((dilemma) => (
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
                    <span className={sheet.dilemmaTitle}>{dilemma.text}</span>
                    <span className={sheet.dilemmaMeta}>
                      {[
                        t(`categories.${dilemma.category}`, { defaultValue: dilemma.category }),
                        ...dilemma.tags.map((tag) => `#${tag}`),
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
