import { createContext, useContext } from 'react';

export const ZiplineSSRContext = createContext<unknown>(null);

export function useSsrData<T>(): T | null {
  const ctx = useContext(ZiplineSSRContext);

  return ctx as T | null;
}

export default function ZiplineSSRProvider({
  children,
  ssrData,
}: {
  children: React.ReactNode;
  ssrData: unknown;
}) {
  return <ZiplineSSRContext.Provider value={ssrData}>{children}</ZiplineSSRContext.Provider>;
}
