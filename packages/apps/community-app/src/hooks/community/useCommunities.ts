import {
  DrivePermissionType,
  getSecurityContextOverPeer,
  HomebaseFile,
  NewHomebaseFile,
} from '@homebase-id/js-lib/core';
import {
  CommunityDefinition,
  getCommunities,
  getCommunitiesOverPeer,
  getCommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../providers/CommunityDefinitionProvider';
import { useAllContacts, useOdinClientContext } from '@homebase-id/common-app';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { getCommunitiesMetadata } from '../../providers/CommunityMetadataProvider';

export const useCommunities = (enableDiscovery?: boolean) => {
  const { data: alllContacts, isFetched: fetchedAllContacts } = useAllContacts(
    enableDiscovery || false
  );
  const odinClient = useOdinClientContext();

  const fetchCommunities = async (): Promise<HomebaseFile<CommunityDefinition>[] | null> => {
    const localCommunities = await getCommunities(odinClient);
    const localMetdatas = await getCommunitiesMetadata(odinClient);
    const remoteCommunitesForMetadata = (
      await Promise.all(
        localMetdatas.map(async (metadata) => {
          if (
            !metadata?.fileMetadata.appData.content.odinId ||
            !metadata?.fileMetadata.appData.uniqueId
          )
            return null;
          return await getCommunityDefinition(
            odinClient,
            metadata?.fileMetadata.appData.content.odinId,
            metadata?.fileMetadata.appData.uniqueId
          );
        })
      )
    ).filter((community) => community !== null) as HomebaseFile<CommunityDefinition>[];

    const discoveredByOdinId = enableDiscovery ? await discoverByOdinId() : [];

    return [
      ...localCommunities,
      ...remoteCommunitesForMetadata,
      ...discoveredByOdinId.map((discovered) => discovered.communities).flat(),
    ].reduce((acc, community) => {
      const existingCommunity = acc.find((existing) =>
        stringGuidsEqual(
          existing.fileMetadata.appData.uniqueId,
          community.fileMetadata.appData.uniqueId
        )
      );
      if (existingCommunity || !community?.fileMetadata?.appData?.uniqueId) {
        return acc;
      }
      return acc.concat(community);
    }, [] as HomebaseFile<CommunityDefinition>[]);
  };

  const discoverByOdinId = async () => {
    const discoveredByOdinId = await Promise.all(
      (alllContacts || []).map(async (contact) => {
        const odinId = contact.fileMetadata.appData.content.odinId;
        if (!odinId) return undefined;

        const securityContext = await getSecurityContextOverPeer(odinClient, odinId);
        const allCommunities = await getCommunitiesOverPeer(odinClient, odinId);

        return {
          odinId,
          communities: allCommunities
            .filter((channel) => {
              if (!channel.fileMetadata.appData.uniqueId) return false;
              const targetDrive = getTargetDriveFromCommunityId(
                channel.fileMetadata.appData.uniqueId
              );

              const hasWriteAccess = securityContext.permissionContext.permissionGroups.some(
                (group) =>
                  group.driveGrants.some(
                    (grant) =>
                      drivesEqual(grant.permissionedDrive.drive, targetDrive) &&
                      grant.permissionedDrive.permission.includes(DrivePermissionType.Write)
                  )
              );

              return hasWriteAccess;
            })
            .map((community) => {
              return {
                ...community,
                fileMetadata: {
                  ...community.fileMetadata,
                  appData: {
                    ...community.fileMetadata.appData,
                    content: {
                      ...community.fileMetadata.appData.content,
                      uniqueId: community.fileMetadata.appData.uniqueId,
                      odinId: odinId,
                    },
                  },
                },
              };
            }),
        };
      })
    );

    return discoveredByOdinId.filter(
      (communities) => communities && communities.communities.length > 0
    ) as {
      odinId: string;
      communities: HomebaseFile<CommunityDefinition>[];
    }[];
  };

  return {
    all: useQuery({
      queryKey: ['communities'],
      queryFn: fetchCommunities,
      staleTime: Infinity,
      enabled: !enableDiscovery || (enableDiscovery && fetchedAllContacts),
    }),
  };
};

export const invalidateCommunities = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['communities'] });
};

export const updateCacheCommunities = (
  queryClient: QueryClient,
  transformFn: (
    data: HomebaseFile<CommunityDefinition>[]
  ) => (HomebaseFile<CommunityDefinition> | NewHomebaseFile<CommunityDefinition>)[] | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<CommunityDefinition>[]>([
    'communities',
  ]);
  if (!currentData) return;

  const newData = transformFn(currentData);
  if (!newData) return;

  queryClient.setQueryData(['communities'], newData);
  return currentData;
};
