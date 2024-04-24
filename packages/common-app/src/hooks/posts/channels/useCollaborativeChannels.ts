import { useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '../../auth/useDotYouClient';
import { getChannelsOverPeer } from '@youfoundation/js-lib/peer';
import { useAllContacts } from '../../connections/useAllContacts';
import {
  DrivePermissionType,
  HomebaseFile,
  getSecurityContextOverPeer,
} from '@youfoundation/js-lib/core';
import { getChannelDrive } from '@youfoundation/js-lib/public';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { ChannelDefinitionVm, parseChannelTemplate } from './useChannels';

export const useCollaborativeChannels = (enabled?: boolean) => {
  const { data: alllContacts, isFetched: fetchedAllContacts } = useAllContacts(enabled || false);
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchCollaborativeChannels = async () => {
    const collaborativeChannelsByOdinId = await Promise.all(
      (alllContacts || []).map(async (contact) => {
        const odinId = contact.fileMetadata.appData.content.odinId;
        if (!odinId) return { odinId, channels: [] };

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
            .map(
              (channel) =>
                ({
                  ...channel,
                  fileMetadata: {
                    ...channel.fileMetadata,
                    appData: {
                      ...channel.fileMetadata.appData,
                      content: {
                        ...channel.fileMetadata.appData.content,
                        template: parseChannelTemplate(
                          channel?.fileMetadata?.appData?.content?.templateId
                        ),
                      },
                    },
                  },
                }) as HomebaseFile<ChannelDefinitionVm>
            ),
        };
      })
    );

    return collaborativeChannelsByOdinId.filter(
      (collaborativeChannels) => collaborativeChannels.channels.length > 0
    );
  };

  return {
    fetch: useQuery({
      queryKey: ['collaborative-channels'],
      queryFn: () => fetchCollaborativeChannels(),
      enabled: enabled && fetchedAllContacts,
      staleTime: Infinity,
    }),
  };
};
