import { useQueryClient, useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import {
  CommunityMetadata,
  getCommunityMetadata,
  uploadCommunityMetadata,
} from '../../providers/CommunityMetadataProvider';

export const usecommunityMetadata = (props?: { communityId?: string | undefined }) => {
  const { communityId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getMetadata = async (communityId: string) => {
    const serverFile = await getCommunityMetadata(dotYouClient, communityId);
    if (!serverFile) {
      const newMetadata: NewHomebaseFile<CommunityMetadata> = {
        fileMetadata: {
          appData: {
            tags: [communityId],
            content: {
              communityId,
              pinnedChannels: [],
              lastReadTime: 0,
              channelLastReadTime: {},
            },
          },
        },
        serverMetadata: {
          accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
        },
      };

      return newMetadata;
    }
    return serverFile;
  };

  const saveMetadata = async ({
    metadata,
  }: {
    metadata: HomebaseFile<CommunityMetadata> | NewHomebaseFile<CommunityMetadata>;
  }) => {
    return await uploadCommunityMetadata(dotYouClient, metadata, async () => {
      if (!metadata.fileMetadata.appData.tags?.[0]) return;
      const serverVersion = await getCommunityMetadata(
        dotYouClient,
        metadata.fileMetadata.appData.content.communityId
      );
      if (!serverVersion) return;

      return await uploadCommunityMetadata(dotYouClient, {
        ...metadata,
        fileMetadata: {
          ...metadata.fileMetadata,
          versionTag: serverVersion.fileMetadata.versionTag,
        },
      });
    });
  };

  return {
    single: useQuery({
      queryKey: ['community-metadata', communityId],
      queryFn: () => getMetadata(communityId as string),
      enabled: !!communityId,
      staleTime: 1000 * 60 * 60 * 24, // 24h, updates will come in via websocket
    }),
    update: useMutation({
      mutationFn: saveMetadata,
      onMutate: async (variables) => {
        if (!variables.metadata.fileId) {
          // Ignore optimistic updates for new community metadata
          return;
        }

        queryClient.setQueryData<HomebaseFile<CommunityMetadata>>(
          ['community-metadata', variables.metadata.fileMetadata.appData.content.communityId],
          variables.metadata as HomebaseFile<CommunityMetadata>
        );
      },
      onError: (error, variables, context) => {
        console.error('Error saving community metadata', error);
      },
    }),
  };
};

export const insertNewcommunityMetadata = (
  queryClient: QueryClient,
  newMetadata: HomebaseFile<CommunityMetadata>
) => {
  queryClient.setQueryData(
    ['community-metadata', newMetadata.fileMetadata.appData.content.communityId],
    newMetadata
  );
};
