import { ReactNode, useMemo } from 'react';

import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { createContext } from 'react';
import { useAuth } from '../../hooks/auth/useAuth';

export const DotYouClientContext = createContext<DotYouClient | null>(
  new DotYouClient({ api: ApiType.Guest })
);

export const DotYouClientProvider = ({ children }: { children: ReactNode }) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = useMemo(getDotYouClient, [getDotYouClient]);

  return (
    <DotYouClientContext.Provider value={dotYouClient}>{children}</DotYouClientContext.Provider>
  );
};
