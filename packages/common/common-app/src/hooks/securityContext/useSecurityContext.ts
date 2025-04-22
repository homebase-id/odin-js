import { useQuery } from '@tanstack/react-query';
import { ApiType, getSecurityContext, getSecurityContextOverPeer } from '@homebase-id/js-lib/core';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useSecurityContext = (odinId?: string, isEnabled?: boolean) => {
  const odinClient = useOdinClientContext();

  const fetch = async (odinId?: string) => {
    if (
      !odinId ||
      odinId === window.location.hostname ||
      (odinClient.getType() === ApiType.App && odinId === odinClient.getHostIdentity())
    )
      return await getSecurityContext(odinClient);
    else return await getSecurityContextOverPeer(odinClient, odinId);
  };

  return {
    fetch: useQuery({
      queryKey: ['security-context', odinId],
      queryFn: () => fetch(odinId),
      staleTime: 1000 * 60 * 60, // 1 hour
      enabled: isEnabled === undefined ? true : isEnabled,
    }),
  };
};
