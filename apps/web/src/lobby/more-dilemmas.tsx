import { useTranslation } from 'react-i18next';
import type { DilemmaSearch } from './use-dilemma-search.ts';
import sheet from './sheet.module.css';

/** Below the dilemmas found, the button that shows twenty more while there are, and why it could not. */
export function MoreDilemmas({ search }: { readonly search: DilemmaSearch }) {
  const { t } = useTranslation();
  if (search.status !== 'found' || !search.more) return null;
  return (
    <>
      {search.moreFailed && (
        <p role="alert" className={sheet.hint}>
          {t('pickDilemmas.moreFailed')}
        </p>
      )}
      <button
        type="button"
        className={sheet.secondary}
        disabled={search.loadingMore}
        onClick={search.more}
      >
        {t('pickDilemmas.more')}
      </button>
    </>
  );
}
