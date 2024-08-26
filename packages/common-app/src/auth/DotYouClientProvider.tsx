import { ReactNode, useMemo } from 'react';

import { DotYouClientContext, useDotYouClient } from '@homebase-id/common-app';

export const DotYouClientProvider = ({ children }: { children: ReactNode }) => {
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = useMemo(getDotYouClient, [getDotYouClient]);

  return (
    <DotYouClientContext.Provider value={dotYouClient}>{children}</DotYouClientContext.Provider>
  );
};
