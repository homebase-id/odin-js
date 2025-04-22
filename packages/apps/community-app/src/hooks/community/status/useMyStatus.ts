import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOdinClientContext } from '@homebase-id/common-app';
import { CommunityStatus, getStatus, setStatus } from '../../../providers/CommunityStatusProvider';
import { formatGuidId } from '@homebase-id/js-lib/helpers';

export const useMyStatus = (props: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  odinId?: string;
}) => {
  const { community, odinId } = props || {};
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const fetchMyStatus = async (community: HomebaseFile<CommunityDefinition>) => {
    return await getStatus(
      odinClient,
      community,
      odinId || odinClient.getLoggedInIdentity() || ''
    );
  };

  const setMyStatus = async ({
    community,
    status,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    status: CommunityStatus;
  }) => {
    return setStatus(odinClient, community, status);
  };

  return {
    get: useQuery({
      queryKey: [
        'community-status',
        formatGuidId(community?.fileMetadata.appData.uniqueId),
        odinId || 'you',
      ],
      enabled: !!community,
      queryFn: () => fetchMyStatus(community as HomebaseFile<CommunityDefinition>),
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),
    set: useMutation({
      mutationFn: setMyStatus,
      onMutate: ({ status }) => {
        setStatusCache(queryClient, community as HomebaseFile<CommunityDefinition>, status);
      },
    }),
  };
};

const setStatusCache = (
  queryClient: QueryClient,
  community: HomebaseFile<CommunityDefinition>,
  status: CommunityStatus
) => {
  queryClient.setQueryData(
    ['community-status', formatGuidId(community.fileMetadata.appData.uniqueId), 'you'],
    status
  );
};
