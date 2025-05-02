import { useQuery } from '@tanstack/react-query';
import { useOdinClientContext } from '../../auth/useOdinClientContext';
import { getChannelsOverPeer } from '@homebase-id/js-lib/peer';
import { useAllContacts } from '../../connections/useAllContacts';
import {
  DrivePermissionType,
  HomebaseFile,
  getSecurityContextOverPeer,
} from '@homebase-id/js-lib/core';
import {
  RemoteCollaborativeChannelDefinition,
  getChannelDrive,
  getChannelLinkDefinitions,
} from '@homebase-id/js-lib/public';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const useCollaborativeChannels = (enableDiscovery?: boolean) => {
  const { data: alllContacts, isFetched: fetchedAllContacts } = useAllContacts(
    enableDiscovery || false
  );
  const odinClient = useOdinClientContext();

  const discoverByOdinId = async () => {
    const discoveredByOdinId = await Promise.all(
      (alllContacts || []).map(async (contact) => {
        const odinId = contact.fileMetadata.appData.content.odinId;
        if (!odinId) return undefined;

        const securityContext = await getSecurityContextOverPeer(odinClient, odinId);
        const allChannels = await getChannelsOverPeer(odinClient, odinId);

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
                      drivesEqual(grant.permissionedDrive.drive, targetDrive) &&
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
    const channelLinks = await getChannelLinkDefinitions(odinClient);

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
