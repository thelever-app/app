import { createContext, useContext, type ReactNode } from 'react';

const DonationUrlContext = createContext<string | undefined>(undefined);

/** Gives every screen below the donation page of TheLever, from the config of the environment. */
export function DonationUrlProvider({
  donationUrl,
  children,
}: {
  readonly donationUrl: string;
  readonly children: ReactNode;
}) {
  return <DonationUrlContext value={donationUrl}>{children}</DonationUrlContext>;
}

/** The donation page of TheLever; only below DonationUrlProvider. */
export function useDonationUrl(): string {
  const donationUrl = useContext(DonationUrlContext);
  if (!donationUrl) throw new Error('The donation page needs a DonationUrlProvider above it');
  return donationUrl;
}
