import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import { useContext, createContext } from 'react';

export const DotYouClientContext = createContext<DotYouClient | null>(
  new DotYouClient({ api: ApiType.Guest })
);

export const useDotYouClientContext = () => {
  const dotYouClient = useContext(DotYouClientContext);
  if (!dotYouClient) throw new Error('DotYouClientContext not found');

  return dotYouClient;
};
