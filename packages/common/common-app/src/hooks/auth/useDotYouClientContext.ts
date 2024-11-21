import { DotYouClient } from '@homebase-id/js-lib/core';
import { useContext, createContext } from 'react';

type DotYouClientContextValue = DotYouClient;
export const DotYouClientContext = createContext<DotYouClientContextValue | null>(null);

export const useDotYouClientContext = () => {
  const dotYouClient = useContext(DotYouClientContext);
  if (!dotYouClient) throw new Error('DotYouClientContext not found');

  return dotYouClient;
};
