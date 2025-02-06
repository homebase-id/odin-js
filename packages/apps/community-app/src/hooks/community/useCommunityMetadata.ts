import {
  useQueryClient,
  useQuery,
  useMutation,
  QueryClient,
  UndefinedInitialDataOptions,
} from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  DeletedHomebaseFile,
  DotYouClient,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import {
  CommunityMetadata,
  Draft,
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

  const saveMetadata = async ({
    metadata,
  }: {
    metadata: HomebaseFile<CommunityMetadata> | NewHomebaseFile<CommunityMetadata>;
  }) => {
    metadata.fileMetadata.appData.content.communityId = formatGuidId(
      metadata.fileMetadata.appData.content.communityId
    );
    metadata.fileMetadata.appData.uniqueId = formatGuidId(metadata.fileMetadata.appData.uniqueId);

    let maxRetries = 5;
    const onVersionConflict = async () => {
      if (maxRetries <= 0) return;
      maxRetries--;

      const serverVersion = await getCommunityMetadata(
        dotYouClient,
        metadata.fileMetadata.appData.content.communityId
      );
      if (!serverVersion) {
        return;
      }

      const newlyMerged = mergeMetadata(metadata, serverVersion);
      insertNewcommunityMetadata(queryClient, newlyMerged);

      return await uploadCommunityMetadata(dotYouClient, newlyMerged, onVersionConflict);
    };

    // We cleanup the drafts only for the inital save; When we retry we want to keep the drafts to avoid bad merging
    const metadataCopy = { ...metadata };
    metadataCopy.fileMetadata.appData.content.drafts = cleanupDrafts(
      metadataCopy.fileMetadata.appData.content.drafts || {}
    );
    return await uploadCommunityMetadata(dotYouClient, metadataCopy, onVersionConflict);
  };

  return {
    single: useQuery(
      getCommunityMetadataQueryOptions(dotYouClient, queryClient, odinId, communityId)
    ),
    update: useMutation({
      mutationFn: saveMetadata,

      onMutate: async (variables) => {
        queryClient.setQueryData<HomebaseFile<CommunityMetadata>>(
          [
            'community-metadata',
            formatGuidId(variables.metadata.fileMetadata.appData.content.communityId),
          ],
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

const getMetadata = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  odinId: string,
  communityId: string
) => {
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
            threadsLastReadTime: 0,
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

export const getCommunityMetadataQueryOptions: (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  odinId: string | undefined,
  communityId: string | undefined
) => UndefinedInitialDataOptions<
  HomebaseFile<CommunityMetadata> | NewHomebaseFile<CommunityMetadata> | null
> = (dotYouClient, queryClient, odinId, communityId) => ({
  queryKey: ['community-metadata', formatGuidId(communityId)],
  queryFn: () =>
    getMetadata(dotYouClient, queryClient, odinId as string, formatGuidId(communityId) as string),
  enabled: !!odinId && !!communityId,
  staleTime: 1000 * 60 * 5, // 5 minutes
});

const cleanupDrafts = (drafts: Record<string, Draft | undefined>) => {
  const newDrafts = { ...drafts };

  const oneDayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
  // Cleanup empty drafts
  Object.keys(newDrafts).forEach((key) => {
    // We assume that we don't have to store emtpy drafts
    if (newDrafts[key]?.message === undefined) {
      delete newDrafts[key];
    }

    // We assume that if a draft has cleared the message that other devices have synced it within a week and we can delete it
    if (newDrafts[key]?.message?.length === 0) {
      if (newDrafts[key]?.updatedAt < oneDayAgo) {
        delete newDrafts[key];
      }
    }
  });

  return newDrafts;
};

const mergeMetadata = (
  local: HomebaseFile<CommunityMetadata> | NewHomebaseFile<CommunityMetadata>,
  server: HomebaseFile<CommunityMetadata>
): HomebaseFile<CommunityMetadata> => {
  const localContent = local.fileMetadata.appData.content;
  const serverContent = server.fileMetadata.appData.content;

  return {
    ...server,
    fileMetadata: {
      ...server.fileMetadata,
      appData: {
        ...server.fileMetadata.appData,
        content: {
          ...local.fileMetadata.appData.content,
          lastReadTime: Math.max(localContent.lastReadTime, serverContent.lastReadTime),
          channelLastReadTime: (() => {
            const mergedKeys = [
              ...Object.keys(localContent.channelLastReadTime),
              ...Object.keys(serverContent.channelLastReadTime),
            ];
            return mergedKeys.reduce(
              (acc, key) => {
                acc[key] = Math.max(
                  localContent.channelLastReadTime[key] || 0,
                  serverContent.channelLastReadTime[key] || 0
                );
                return acc;
              },
              {} as { [key: string]: number }
            );
          })(),
          drafts: (() => {
            const mergedKeys = [
              ...Object.keys(localContent.drafts || {}),
              ...Object.keys(serverContent.drafts || {}),
            ];

            return mergedKeys.reduce(
              (acc, key) => {
                const localDraft = localContent.drafts?.[key];
                const serverDraft = serverContent.drafts?.[key];

                const newestDraft =
                  !serverDraft ||
                  (localDraft?.updatedAt && localDraft?.updatedAt > serverDraft?.updatedAt)
                    ? localDraft
                    : serverDraft;

                acc[key] = newestDraft;
                return acc;
              },
              {} as Record<string, Draft | undefined>
            );
          })(),
        },
      },
      versionTag: server.fileMetadata.versionTag,
    },
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
  newMetadata: HomebaseFile<CommunityMetadata> | DeletedHomebaseFile<unknown>
) => {
  if (newMetadata.fileState === 'deleted') {
    if (newMetadata.fileMetadata.appData.uniqueId)
      invalidateCommunityMetadata(queryClient, newMetadata.fileMetadata.appData.uniqueId);
  } else {
    queryClient.setQueryData(
      ['community-metadata', formatGuidId(newMetadata.fileMetadata.appData.content.communityId)],
      newMetadata
    );
  }
};

export const useCommunityMetadataSavedOnly = (props?: {
  odinId: string | undefined;
  communityId: string | undefined;
}) => {
  const { communityId, odinId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['community-metadata-saved', odinId, formatGuidId(communityId)],
    enabled: !!odinId && !!communityId,
    queryFn: async () => {
      const communityMetadata = await queryClient.fetchQuery(
        getCommunityMetadataQueryOptions(dotYouClient, queryClient, odinId, communityId)
      );
      return communityMetadata?.fileMetadata.appData.content.savedMessages || [];
    },
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });
};
