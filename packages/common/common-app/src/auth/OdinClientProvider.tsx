import { ReactNode, useMemo } from 'react';

import { OdinClientContext, useOdinClient } from '@homebase-id/common-app';

export const OdinClientProvider = ({ children }: { children: ReactNode }) => {
  const { getOdinClient } = useOdinClient();
  const odinClient = useMemo(getOdinClient, [getOdinClient]);

  return <OdinClientContext.Provider value={odinClient}>{children}</OdinClientContext.Provider>;
};
