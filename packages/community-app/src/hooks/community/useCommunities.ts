import {
  DrivePermissionType,
  getSecurityContextOverPeer,
  HomebaseFile,
} from '@homebase-id/js-lib/core';
import {
  CommunityDefinition,
  getCommunities,
  getCommunitiesOverPeer,
  getCommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../providers/CommunityDefinitionProvider';
import { useAllContacts, useDotYouClientContext } from '@homebase-id/common-app';
import { useQuery } from '@tanstack/react-query';
import { drivesEqual } from '@homebase-id/js-lib/helpers';
import { getCommunitiesMetadata } from '../../providers/CommunityMetadataProvider';

export const useCommunities = (enableDiscovery?: boolean) => {
  const { data: alllContacts, isFetched: fetchedAllContacts } = useAllContacts(
    enableDiscovery || false
  );
  const dotYouClient = useDotYouClientContext();

  const fetchCommunities = async (): Promise<HomebaseFile<CommunityDefinition>[] | null> => {
    const localCommunities = await getCommunities(dotYouClient);
    const localMetdatas = await getCommunitiesMetadata(dotYouClient);
    const remoteCommunitesForMetadata = (
      await Promise.all(
        localMetdatas.map(async (metadata) => {
          if (
            !metadata?.fileMetadata.appData.content.odinId ||
            !metadata?.fileMetadata.appData.uniqueId
          )
            return null;
          return await getCommunityDefinition(
            dotYouClient,
            metadata?.fileMetadata.appData.content.odinId,
            metadata?.fileMetadata.appData.uniqueId
          );
        })
      )
    ).filter((community) => community !== null) as HomebaseFile<CommunityDefinition>[];

    const discoveredByOdinId = enableDiscovery ? await discoverByOdinId() : [];

    console.log({
      localCommunities,
      remoteCommunitesForMetadata,
      discoveredByOdinId,
    });

    return [
      ...localCommunities,
      ...remoteCommunitesForMetadata,
      ...discoveredByOdinId.map((discovered) => discovered.communities).flat(),
    ];
  };

  const discoverByOdinId = async () => {
    const discoveredByOdinId = await Promise.all(
      (alllContacts || []).map(async (contact) => {
        const odinId = contact.fileMetadata.appData.content.odinId;
        if (!odinId) return undefined;

        const securityContext = await getSecurityContextOverPeer(dotYouClient, odinId);
        const allCommunities = await getCommunitiesOverPeer(dotYouClient, odinId);

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
                fileId: '',
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
      queryFn: () => fetchCommunities(),
      staleTime: 1000 * 60 * 60, // 1h before new communities are fetched on this one
      enabled: !enableDiscovery || (enableDiscovery && fetchedAllContacts),
    }),
  };
};
