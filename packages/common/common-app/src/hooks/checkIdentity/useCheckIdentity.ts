import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import { getDomainFromUrl } from '@homebase-id/js-lib/helpers';

/** Whether `identity` (lowercase, with no scheme) is the identity its host says it is. */
export const pingIdentity = async (identity: string): Promise<boolean> => {
  const dotYouClient = new DotYouClient({ api: ApiType.Guest, hostIdentity: identity });
  return await fetch(`${dotYouClient.getEndpointV2()}/auth/ident`)
    .then((response) => {
      if (response.status !== 200) return;
      return response.json();
    })
    .then((validation) => validation?.odinId?.toLowerCase() === identity)
    .catch(() => false);
};

export const useCheckIdentity = (odinId?: string) => {
  const doCheckIdentity = async (odinId?: string) => {
    if (!odinId) return false;
    const strippedIdentity = getDomainFromUrl(odinId)?.toLowerCase();

    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;
    const isValid = domainRegex.test(strippedIdentity || '');
    if (!isValid || !strippedIdentity) return false;

    return await pingIdentity(strippedIdentity);
  };

  return useQuery({
    queryKey: ['check-identity', odinId],
    queryFn: () => doCheckIdentity(odinId),
    staleTime: 1000 * 60 * 60,
  });
};
