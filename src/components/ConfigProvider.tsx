import { SafeConfig } from '@/lib/config/safe';
import { createContext, useContext } from 'react';

const ConfigContext = createContext<SafeConfig | null>(null);

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within a ConfigProvider');

  return ctx;
}

export default function ConfigProvider({
  config,
  children,
}: {
  config: SafeConfig;
  children: React.ReactNode;
}) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}
