import { useQueryClient, useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import {
  CommunityMetadata,
  getCommunityMetadata,
  uploadCommunityMetadata,
} from '../../providers/CommunityMetadataProvider';
import { formatGuidId } from '@homebase-id/js-lib/helpers';

export const useCommunityMetadata = (props?: {
  odinId: string | undefined;
  communityId: string | undefined;
}) => {
  const { communityId, odinId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getMetadata = async (odinId: string, communityId: string) => {
    const serverFile = await getCommunityMetadata(dotYouClient, communityId);
    if (!serverFile) {
      const newMetadata: NewHomebaseFile<CommunityMetadata> = {
        fileMetadata: {
          appData: {
            uniqueId: communityId,
            content: {
              odinId,
              communityId,
              pinnedChannels: [],
              savedMessages: [],
              lastReadTime: 0,
              channelLastReadTime: {},
            },
          },
        },
        serverMetadata: {
          accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
        },
      };
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['communities'] });
      }, 1000);

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
      const serverVersion = await getCommunityMetadata(
        dotYouClient,
        metadata.fileMetadata.appData.content.communityId
      );
      if (!serverVersion) return;

      return await uploadCommunityMetadata(
        dotYouClient,
        {
          ...metadata,
          fileMetadata: {
            ...metadata.fileMetadata,
            versionTag: serverVersion.fileMetadata.versionTag,
          },
        },
        () => {
          return;
        }
      );
    });
  };

  return {
    single: useQuery({
      queryKey: ['community-metadata', communityId],
      queryFn: () => getMetadata(odinId as string, communityId as string),
      enabled: !!odinId && !!communityId,
      staleTime: 1000 * 60 * 60 * 24, // 1 day, updates from other clients will come in via websocket
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
      onSuccess: (data, variables) => {
        if (!variables.metadata.fileId || !data) return;
        const updatedMeta = {
          ...variables.metadata,
          fileMetadata: {
            ...variables.metadata.fileMetadata,
            versionTag: data.newVersionTag,
          },
        } as HomebaseFile<CommunityMetadata>;

        queryClient.setQueryData<HomebaseFile<CommunityMetadata>>(
          ['community-metadata', updatedMeta.fileMetadata.appData.content.communityId],
          updatedMeta
        );
      },
      onError: (error) => {
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
    ['community-metadata', formatGuidId(newMetadata.fileMetadata.appData.content.communityId)],
    newMetadata
  );
};
