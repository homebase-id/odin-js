import { useQueryClient, useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import {
  CommunityMetadata,
  getCommunityMetadata,
  uploadCommunityMetadata,
} from '../../providers/CommunityMetadataProvider';
import { formatGuidId } from '@homebase-id/js-lib/helpers';
import { invalidateCommunities } from './useCommunities';

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
        invalidateCommunities(queryClient);
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
    metadata.fileMetadata.appData.content.communityId = formatGuidId(
      metadata.fileMetadata.appData.content.communityId
    );
    metadata.fileMetadata.appData.uniqueId = formatGuidId(metadata.fileMetadata.appData.uniqueId);

    return await uploadCommunityMetadata(dotYouClient, metadata, async () => {
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
      queryFn: () => getMetadata(odinId as string, formatGuidId(communityId) as string),
      enabled: !!odinId && !!communityId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),
    update: useMutation({
      mutationFn: saveMetadata,
      onMutate: async (variables) => {
        queryClient.setQueryData<HomebaseFile<CommunityMetadata>>(
          ['community-metadata', variables.metadata.fileMetadata.appData.content.communityId],
          variables.metadata as HomebaseFile<CommunityMetadata>
        );
      },
      onSuccess: (data, variables) => {
        if (!data) return;

        const updatedMeta = {
          ...variables.metadata,
          fileId: data?.file.fileId,

          fileMetadata: {
            ...variables.metadata.fileMetadata,
            versionTag: data.newVersionTag,
            globalTransitId: data.globalTransitIdFileIdentifier.globalTransitId,
          },
        } as HomebaseFile<CommunityMetadata>;

        queryClient.setQueryData<HomebaseFile<CommunityMetadata>>(
          ['community-metadata', updatedMeta.fileMetadata.appData.content.communityId],
          updatedMeta
        );

        if (!variables.metadata.fileId) {
          // It's a new metadata file, so we need to invalidate the communities query
          invalidateCommunities(queryClient);
        }
      },
      onError: (error) => {
        console.error('Error saving community metadata', error);
        invalidateCommunityMetadata(queryClient, communityId);
      },
    }),
  };
};

export const invalidateCommunityMetadata = (queryClient: QueryClient, communityId?: string) => {
  queryClient.invalidateQueries({
    queryKey: ['community-metadata', communityId],
    exact: !!communityId,
  });
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
