import { createContext, useContext, type ReactNode } from 'react';

const UnderEighteenContext = createContext<boolean>(true);

/** Gives every screen past the first access whether the person declared they are under 18. */
export function UnderEighteenProvider({
  underEighteen,
  children,
}: {
  readonly underEighteen: boolean;
  readonly children: ReactNode;
}) {
  return <UnderEighteenContext value={underEighteen}>{children}</UnderEighteenContext>;
}

/**
 * Whether the person declared they are under 18; below no provider, as if they were, which is
 * what protects them. The room server decides it again on its own.
 */
export function useUnderEighteen(): boolean {
  return useContext(UnderEighteenContext);
}
