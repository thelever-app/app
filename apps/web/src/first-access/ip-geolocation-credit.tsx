import { useTranslation } from 'react-i18next';

/** The page of DB-IP, whose countries tell the region of each device. */
export const DBIP_URL = 'https://db-ip.com';

/**
 * The link back to DB-IP that the licence of DB-IP Lite asks for on every screen that uses its
 * countries: the age, which the region decides, and the stop of a blocked country.
 */
export function IpGeolocationCredit({ className }: { readonly className: string | undefined }) {
  const { t } = useTranslation();
  const name = t('credits.country.link');
  return (
    <a
      className={className}
      href={DBIP_URL}
      target="_blank"
      rel="noopener"
      aria-label={t('appSettings.outside', { name })}
    >
      {/* The attribution DB-IP gives, in English in every language of the app. */}
      <span lang="en">{name}</span>
    </a>
  );
}
