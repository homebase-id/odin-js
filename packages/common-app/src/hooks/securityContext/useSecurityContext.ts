import { useQuery } from '@tanstack/react-query';
import {
  ApiType,
  getSecurityContext,
  getSecurityContextOverPeer,
} from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../auth/useDotYouClient';

export const useSecurityContext = (odinId?: string, isEnabled?: boolean) => {
  const { getApiType, getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();

  const fetch = async (odinId?: string) => {
    if (
      !odinId ||
      odinId === window.location.hostname ||
      (getApiType() === ApiType.App && odinId === dotYouClient.getIdentity())
    )
      return await getSecurityContext(dotYouClient);
    else return await getSecurityContextOverPeer(dotYouClient, odinId);
  };

  return {
    fetch: useQuery({
      queryKey: ['security-context', odinId],
      queryFn: () => fetch(odinId),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: isEnabled === undefined ? true : isEnabled,
    }),
  };
};
