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

  const discoverByOdinId = async () => {
    const discoveredByOdinId = await Promise.all(
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
                fileId: '',
                fileMetadata: {
                  ...chnl.fileMetadata,
                  appData: {
                    ...chnl.fileMetadata.appData,
                    content: {
                      ...chnl.fileMetadata.appData.content,
                      uniqueId: chnl.fileMetadata.appData.uniqueId,
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
      (collaborativeChannels) => collaborativeChannels && collaborativeChannels.channels.length > 0
    ) as {
      odinId: string;
      channels: HomebaseFile<RemoteCollaborativeChannelDefinition>[];
    }[];
  };

  const getLinksByOdinId = async () => {
    const channelLinks = await getChannelLinkDefinitions(dotYouClient);

    return (
      channelLinks?.reduce(
        (acc, curr) => {
          const odinId = curr.fileMetadata.appData.content.odinId;
          if (!odinId) return acc;

          const existing = acc.find((a) => a.odinId === odinId);
          if (!existing) {
            return [...acc, { odinId, channels: [curr] }];
          }

          return acc.map((a) =>
            a.odinId === odinId ? { ...a, channels: [...a.channels, curr] } : a
          );
        },
        [] as {
          odinId: string;
          channels: HomebaseFile<RemoteCollaborativeChannelDefinition>[];
        }[]
      ) || []
    );
  };

  const fetchCollaborativeChannels = async () => {
    const discoveredByOdinId = enableDiscovery ? await discoverByOdinId() : [];
    const linksByOdinId = await getLinksByOdinId();

    const mergedLinks = [...linksByOdinId, ...discoveredByOdinId].reduce(
      (acc, curr) => {
        if (!curr) return acc;

        if (acc.find((a) => a.odinId === curr.odinId)) {
          return acc.map((a) =>
            a.odinId === curr.odinId ? { ...a, channels: a.channels.concat(curr.channels) } : a
          );
        }

        return [...acc, curr];
      },
      [] as {
        odinId: string;
        channels: HomebaseFile<RemoteCollaborativeChannelDefinition>[];
      }[]
    );

    return mergedLinks.map((link) => ({
      ...link,
      channels: link.channels.reduce((acc, curr) => {
        const existing = acc.find((a) =>
          stringGuidsEqual(
            a.fileMetadata.appData.content.uniqueId || a.fileMetadata.appData.uniqueId,
            curr.fileMetadata.appData.content.uniqueId || curr.fileMetadata.appData.uniqueId
          )
        );
        if (existing) {
          return acc;
        } else {
          return [...acc, curr];
        }
      }, [] as HomebaseFile<RemoteCollaborativeChannelDefinition>[]),
    }));
  };

  return {
    fetch: useQuery({
      queryKey: ['collaborative-channels'],
      queryFn: () => fetchCollaborativeChannels(),
      enabled: !enableDiscovery || (enableDiscovery && fetchedAllContacts),
      staleTime: Infinity,
    }),
  };
};
