import {
    useQueryClient,
    useQuery,
    useMutation,
    QueryClient,
    UndefinedInitialDataOptions,
} from '@tanstack/react-query';
import {useDotYouClientContext} from '@homebase-id/common-app';
import {
    DeletedHomebaseFile,
    DotYouClient,
    HomebaseFile,
    NewHomebaseFile,
    SecurityGroupType
} from '@homebase-id/js-lib/core';
import {
    CommunityDrafts,
    Draft,
    getCommunityDrafts,
    uploadCommunityDrafts,
} from '../../providers/CommunityDraftsProvider';
import {formatGuidId} from '@homebase-id/js-lib/helpers';
import {invalidateCommunities} from './useCommunities';

export const useCommunityDrafts = (props?: {
    odinId: string | undefined;
    communityId: string | undefined;
}) => {
    const {communityId, odinId} = props || {};
    const dotYouClient = useDotYouClientContext();
    const queryClient = useQueryClient();

    const saveDrafts = async ({drafts,}: { drafts: HomebaseFile<CommunityDrafts> | NewHomebaseFile<CommunityDrafts>; }) => {
        drafts.fileMetadata.appData.content.communityId = formatGuidId(drafts.fileMetadata.appData.content.communityId);
        drafts.fileMetadata.appData.uniqueId = formatGuidId(drafts.fileMetadata.appData.uniqueId);

        if (!communityId) {
            throw new Error("CommunityId is missing");
        }

        let maxRetries = 5;
        const onVersionConflict = async () => {
            if (maxRetries <= 0) return;
            maxRetries--;

            const serverVersion = await getCommunityDrafts(
                dotYouClient,
                drafts.fileMetadata.appData.content.communityId
            );
            if (!serverVersion) {
                return;
            }

            const newlyMerged = mergeDrafts(drafts, serverVersion);
            insertNewCommunityDrafts(queryClient, newlyMerged, communityId);

            console.log(`Uploading version via version conflict - retry #${maxRetries}`, serverVersion, newlyMerged);

            return await uploadCommunityDrafts(dotYouClient, communityId, newlyMerged, onVersionConflict);
        };

        const draftsCopy = {...drafts};
        draftsCopy.fileMetadata.appData.content.drafts = cleanupDrafts(
            draftsCopy.fileMetadata.appData.content.drafts || {}
        );

        console.info("communityId version tag going up", draftsCopy.fileMetadata.versionTag);

        const r = await uploadCommunityDrafts(dotYouClient, communityId, draftsCopy, onVersionConflict);

        console.info("version tag returned", r?.newVersionTag);

        return r;
    };

    return {
        single: useQuery(
            getCommunityDraftsQueryOptions(dotYouClient, queryClient, odinId, communityId)
        ),
        update: useMutation({
            mutationFn: saveDrafts,
            onMutate: async (variables) => {
                console.log("mutate called - drafts are: ", variables.drafts);
                queryClient.setQueryData<HomebaseFile<CommunityDrafts>>(
                    [
                        'community-drafts',
                        formatGuidId(variables.drafts.fileMetadata.appData.content.communityId),
                    ],
                    variables.drafts as HomebaseFile<CommunityDrafts>
                );
            },
            onSuccess: async (data, variables) => {
                if (!data) return;

                // Fetch the latest drafts from the server to ensure cache reflects server state
                const serverDrafts = await getCommunityDrafts(
                    dotYouClient,
                    variables.drafts.fileMetadata.appData.content.communityId
                );

                const communityIdForCache = formatGuidId(
                    variables.drafts.fileMetadata.appData.content.communityId
                );
                
                if (serverDrafts) {
                    // Update cache with server drafts
                    queryClient.setQueryData<HomebaseFile<CommunityDrafts>>(
                        ['community-drafts', communityIdForCache],
                        serverDrafts
                    );
                } else {
                    // If no drafts exist on the server, clear the drafts in the cache
                    const baseDrafts: HomebaseFile<CommunityDrafts> = {
                        ...variables.drafts,
                        fileId: variables.drafts.fileId || '', // Provide default if undefined
                        fileMetadata: {
                            ...variables.drafts.fileMetadata,
                            appData: {
                                ...variables.drafts.fileMetadata.appData,
                                content: {
                                    ...variables.drafts.fileMetadata.appData.content,
                                    drafts: {}, // Clear drafts
                                },
                            },
                            versionTag: data.newVersionTag || variables.drafts.fileMetadata.versionTag || '',
                        },
                        serverMetadata: variables.drafts.serverMetadata || {
                            accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
                        },
                    } as HomebaseFile<CommunityDrafts>;

                    queryClient.setQueryData<HomebaseFile<CommunityDrafts>>(
                        ['community-drafts', communityIdForCache],
                        baseDrafts
                    );
                }

                if (!variables.drafts.fileId) {
                    console.log("no drafts.fileId found; must be a new drafts file");
                    invalidateCommunities(queryClient);
                }
            },
            onError: (error) => {
                console.error('Error saving community drafts', error);
                invalidateCommunityDrafts(queryClient, communityId);
            },
        }),
    };
};
const getDrafts = async (
    dotYouClient: DotYouClient,
    queryClient: QueryClient,
    odinId: string,
    communityId: string
) => {
    const serverFile = await getCommunityDrafts(dotYouClient, communityId);
    if (!serverFile) {
        console.info(`no community drafts found`);
        const newDrafts: NewHomebaseFile<CommunityDrafts> = {
            fileMetadata: {
                appData: {
                    uniqueId: communityId,
                    content: {
                        odinId,
                        communityId,
                        drafts: {},
                    },
                },
            },
            serverMetadata: {
                accessControlList: {requiredSecurityGroup: SecurityGroupType.Owner},
            },
        };
        setTimeout(() => {
            invalidateCommunities(queryClient);
        }, 1000);

        return newDrafts;
    }

    return serverFile;
};

export const getCommunityDraftsQueryOptions: (
    dotYouClient: DotYouClient,
    queryClient: QueryClient,
    odinId: string | undefined,
    communityId: string | undefined
) => UndefinedInitialDataOptions<
    HomebaseFile<CommunityDrafts> | NewHomebaseFile<CommunityDrafts> | null
> = (dotYouClient, queryClient, odinId, communityId) => ({
    queryKey: ['community-drafts', formatGuidId(communityId)],
    queryFn: () =>
        getDrafts(dotYouClient, queryClient, odinId as string, formatGuidId(communityId) as string),
    enabled: !!odinId && !!communityId,
    staleTime: 1000 * 60 * 5, // 5 minutes
});

const cleanupDrafts = (drafts: Record<string, Draft | undefined>) => {
    const newDrafts = {...drafts};

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

const mergeDrafts = (
    local: HomebaseFile<CommunityDrafts> | NewHomebaseFile<CommunityDrafts>,
    server: HomebaseFile<CommunityDrafts>,
    viaNew?: boolean
): HomebaseFile<CommunityDrafts> => {
    const localContent = local.fileMetadata.appData.content;
    const serverContent = server.fileMetadata.appData.content;

    if (viaNew) {
        console.info("[1] Starting mergeDrafts", local, server);
    }

    return {
        ...server,
        fileMetadata: {
            ...server.fileMetadata,
            appData: {
                ...server.fileMetadata.appData,
                content: {
                    ...server.fileMetadata.appData.content,
                    drafts: (() => {
                        const mergedKeys = [
                            ...new Set([
                                ...Object.keys(localContent.drafts || {}),
                                ...Object.keys(serverContent.drafts || {}),
                            ]),
                        ];

                        return mergedKeys.reduce(
                            (acc, key) => {
                                const localDraft = localContent.drafts?.[key];
                                const serverDraft = serverContent.drafts?.[key];

                                const hasServerDraft = serverDraft !== undefined && serverDraft !== null;
                                const hasLocalDraft = localDraft !== undefined && localDraft !== null;

                                const bothHaveDrafts =
                                    hasLocalDraft &&
                                    hasServerDraft &&
                                    localDraft.updatedAt !== undefined &&
                                    serverDraft.updatedAt !== undefined;

                                const localIsNewer = bothHaveDrafts
                                    ? localDraft.updatedAt > serverDraft.updatedAt
                                    : false;

                                if (viaNew) {
                                    console.info('[1] local updated at:', localDraft?.updatedAt ?? "nada");
                                    console.info('[1] hasServerDraft:', hasServerDraft);
                                    console.info('[1] hasLocalDraft:', hasLocalDraft);
                                    console.info('[1] localIsNewer:', localIsNewer);
                                }

                                let draftSource: 'local' | 'server' | 'none';
                                let newestDraft;

                                if (!hasServerDraft && hasLocalDraft) {
                                    newestDraft = localDraft;
                                    draftSource = 'local';
                                } else if (localIsNewer) {
                                    newestDraft = localDraft
                                    draftSource = 'local';
                                } else if (hasServerDraft) {
                                    newestDraft = serverDraft;
                                    draftSource = 'server';
                                } else {
                                    newestDraft = undefined;
                                    draftSource = 'none';
                                }

                                if (viaNew) {
                                    console.info('[1] newestDraft:', newestDraft);
                                    console.info('[1] draftSource:', draftSource);
                                }

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

export const invalidateCommunityDrafts = (queryClient: QueryClient, communityId?: string) => {
    queryClient.invalidateQueries({
        queryKey: ['community-drafts', communityId],
        exact: !!communityId,
    });
};

export const insertNewCommunityDrafts = (
    queryClient: QueryClient,
    newDrafts: HomebaseFile<CommunityDrafts> | DeletedHomebaseFile<unknown>,
    communityId?: string
) => {
    const useThisCommunityId = communityId ?? (newDrafts.fileState !== 'deleted'
        ? formatGuidId(newDrafts.fileMetadata.appData.content.communityId)
        : newDrafts.fileMetadata.appData.uniqueId);

    if (!useThisCommunityId) {
        console.warn("insertNewCommunityDrafts -> No communityId provided or found in drafts metadata", newDrafts.fileMetadata);
        return;
    }

    const queryKey = ['community-drafts', useThisCommunityId];

    if (newDrafts.fileState === 'deleted') {
        // For deleted drafts, clear the cache
        queryClient.setQueryData(queryKey, null);
        invalidateCommunityDrafts(queryClient, useThisCommunityId);
    } else {
        const existingDrafts = queryClient.getQueryData<HomebaseFile<CommunityDrafts>>(queryKey);

        if (!existingDrafts) {
            queryClient.setQueryData(queryKey, newDrafts);
            return;
        }

        const mergedMeta = mergeDrafts(existingDrafts, newDrafts, true);
        queryClient.setQueryData(queryKey, mergedMeta);
    }
};
