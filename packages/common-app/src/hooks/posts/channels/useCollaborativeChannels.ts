import { useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '../../auth/useDotYouClient';
import { getChannelsOverPeer } from '@youfoundation/js-lib/peer';
import { useAllContacts } from '../../connections/useAllContacts';
import {
  DrivePermissionType,
  HomebaseFile,
  getSecurityContextOverPeer,
} from '@youfoundation/js-lib/core';
import {
  RemoteCollaborativeChannelDefinition,
  getChannelDrive,
  getChannelLinkDefinitions,
} from '@youfoundation/js-lib/public';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const useCollaborativeChannels = (enableDiscovery?: boolean) => {
  const { data: alllContacts, isFetched: fetchedAllContacts } = useAllContacts(
    enableDiscovery || false
  );
  const dotYouClient = useDotYouClient().getDotYouClient();

  const discoverCollaborativeChannels = async () => {
    const collaborativeChannelsByOdinId = await Promise.all(
      (alllContacts || []).map(async (contact) => {
        const odinId = contact.fileMetadata.appData.content.odinId;
        if (!odinId) return undefined;

        const securityContext = await getSecurityContextOverPeer(dotYouClient, odinId);
        const allChannels = await getChannelsOverPeer(dotYouClient, odinId);

        return {
          odinId,
          channels: allChannels
            .filter((channel) => channel.fileMetadata.appData.content.isCollaborative)
            .filter((channel) => {
              if (!channel.fileMetadata.appData.uniqueId) return false;
              const targetDrive = getChannelDrive(channel.fileMetadata.appData.uniqueId);

              const hasWriteAccess = securityContext.permissionContext.permissionGroups.some(
                (group) =>
                  group.driveGrants.some(
                    (grant) =>
                      stringGuidsEqual(grant.permissionedDrive.drive.alias, targetDrive.alias) &&
                      grant.permissionedDrive.permission.includes(DrivePermissionType.Write)
                  )
              );

              return hasWriteAccess;
            })
            .map((chnl) => {
              return {
                ...chnl,
                fileMetadata: {
                  ...chnl.fileMetadata,
                  appData: {
                    ...chnl.fileMetadata.appData,
                    content: {
                      ...chnl.fileMetadata.appData.content,
                      odinId: odinId,
                    },
                  },
                },
              };
            }),
        };
      })
    );

    return collaborativeChannelsByOdinId.filter(
      (collaborativeChannels) => collaborativeChannels && collaborativeChannels.channels.length > 0
    ) as {
      odinId: string;
      channels: HomebaseFile<RemoteCollaborativeChannelDefinition>[];
    }[];
  };

  const fetchCollaborativeChannels = async () => {
    return await getChannelLinkDefinitions(dotYouClient);
  };

  return {
    discover: useQuery({
      queryKey: ['collaborative-channels-discovery'],
      queryFn: () => discoverCollaborativeChannels(),
      enabled: enableDiscovery && fetchedAllContacts,
      staleTime: Infinity,
    }),
    fetch: useQuery({
      queryKey: ['collaborative-channels'],
      queryFn: () => fetchCollaborativeChannels(),
    }),
  };
};
