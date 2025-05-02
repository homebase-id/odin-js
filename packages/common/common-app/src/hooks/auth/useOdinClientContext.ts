import { OdinClient } from '@homebase-id/js-lib/core';
import { useContext, createContext } from 'react';

type OdinClientContextValue = OdinClient;
export const OdinClientContext = createContext<OdinClientContextValue | null>(null);

export const useOdinClientContext = () => {
  const odinClient = useContext(OdinClientContext);
  if (!odinClient) throw new Error('OdinClientContext not found');

  return odinClient;
};
