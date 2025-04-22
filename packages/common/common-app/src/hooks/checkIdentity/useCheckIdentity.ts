import { useQuery } from '@tanstack/react-query';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { getDomainFromUrl } from '@homebase-id/js-lib/helpers';

export const useCheckIdentity = (odinId?: string) => {
  const doCheckIdentity = async (odinId?: string) => {
    if (!odinId) return false;
    const strippedIdentity = getDomainFromUrl(odinId)?.toLowerCase();

    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;
    const isValid = domainRegex.test(strippedIdentity || '');
    if (!isValid || !strippedIdentity) return false;

    const odinClient = new OdinClient({ api: ApiType.Guest, hostIdentity: strippedIdentity });
    return await fetch(`${odinClient.getEndpoint()}/auth/ident`)
      .then((response) => {
        if (response.status !== 200) return;
        return response.json();
      })
      .then((validation) => validation?.odinId.toLowerCase() === strippedIdentity)
      .catch(() => false);
  };

  return useQuery({
    queryKey: ['check-identity', odinId],
    queryFn: () => doCheckIdentity(odinId),
    staleTime: 1000 * 60 * 60,
  });
};
