import { useQuery } from '@tanstack/react-query';
import {
  ApiType,
  getSecurityContext,
  getSecurityContextOverTransit,
} from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../../..';

export const useSecurityContext = (odinId?: string, isEnabled?: boolean) => {
  const { getApiType } = useDotYouClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async (odinId?: string) => {
    if (
      !odinId ||
      odinId === window.location.hostname ||
      (getApiType() === ApiType.App && odinId === dotYouClient.getIdentity())
    )
      return await getSecurityContext(dotYouClient);
    else return await getSecurityContextOverTransit(dotYouClient, odinId);
  };

  return {
    fetch: useQuery(['security-context', odinId], () => fetch(odinId), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: isEnabled === undefined ? true : isEnabled,
    }),
  };
};
