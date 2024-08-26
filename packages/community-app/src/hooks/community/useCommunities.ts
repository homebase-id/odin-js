import { HomebaseFile } from '@youfoundation/js-lib/core';
import { CommunityDefinition, getCommunities } from '../../providers/CommunityDefinitionProvider';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { useQuery } from '@tanstack/react-query';

export const useCommunities = () => {
  const dotYouClient = useDotYouClientContext();

  const fetchConversations = async (): Promise<HomebaseFile<CommunityDefinition>[] | null> =>
    await getCommunities(dotYouClient);

  return {
    all: useQuery({
      queryKey: ['communities'],
      queryFn: () => fetchConversations(),
      staleTime: 1000 * 60 * 5, // 5min before new conversations from another device are fetched on this one
    }),
  };
};
