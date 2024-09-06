import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChannelDefinition,
  GetTargetDriveFromChannelId,
  removeChannelDefinition,
  saveChannelDefinition,
} from '@homebase-id/js-lib/public';

import { ChannelDefinitionVm, parseChannelTemplate } from './useChannels';
import { FEED_APP_ID, t, useDotYouClient, useStaticFiles } from '../../../..';
import { stringGuidsEqual, stringifyToQueryParams, toGuidId } from '@homebase-id/js-lib/helpers';
import {
  ApiType,
  DotYouClient,
  DrivePermissionType,
  HomebaseFile,
  NewHomebaseFile,
  TargetDrive,
} from '@homebase-id/js-lib/core';
const FEED_ROOT_PATH = '/apps/feed';

const getExtendAuthorizationUrl = (
  identity: string,
  name: string,
  description: string,
  targetDrive: TargetDrive,
  returnUrl: string,
  allowAnonymousReads?: boolean,
  allowSubscriptions?: boolean
) => {
  const drives = [
    {
      a: targetDrive.alias,
      t: targetDrive.type,
      p:
        DrivePermissionType.Read +
        DrivePermissionType.Write +
        DrivePermissionType.React +
        DrivePermissionType.Comment, // Permission
      n: name,
      d: description,
      r: allowAnonymousReads,
      s: allowSubscriptions,
    },
  ];

  const params = {
    appId: FEED_APP_ID,
    d: JSON.stringify(drives),
  };

  const host = new DotYouClient({ identity: identity || undefined, api: ApiType.App }).getRoot();
  return `${host}/owner/appupdate?${stringifyToQueryParams(params)}&return=${encodeURIComponent(
    returnUrl
  )}`;
};

export const useManageChannel = () => {
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publish;

  const saveData = async (
    channelDef: NewHomebaseFile<ChannelDefinition> | HomebaseFile<ChannelDefinition>
  ) => {
    if (!channelDef.fileId) {
      if (!channelDef.fileMetadata.appData.uniqueId)
        channelDef.fileMetadata.appData.uniqueId = toGuidId(
          channelDef.fileMetadata.appData.content.name
        );
    }

    const onMissingDrive = () => {
      if (!channelDef.fileMetadata.appData.uniqueId)
        throw new Error('Channel unique id is not set');

      const host = dotYouClient.getIdentity();
      const returnUrl = `${FEED_ROOT_PATH}/channels?new=${JSON.stringify(channelDef)}`;

      const targetDrive = GetTargetDriveFromChannelId(channelDef.fileMetadata.appData.uniqueId);

      window.location.href = getExtendAuthorizationUrl(
        host,
        channelDef.fileMetadata.appData.content.name,
        t('Drive for "{0}" channel posts', channelDef.fileMetadata.appData.content.name),
        targetDrive,
        returnUrl,
        true,
        true
      );
    };

    return await saveChannelDefinition(dotYouClient, { ...channelDef }, onMissingDrive);
  };

  const removeChannel = async (channelDef: HomebaseFile<ChannelDefinition>) => {
    await removeChannelDefinition(dotYouClient, channelDef.fileMetadata.appData.uniqueId as string);
  };

  return {
    save: useMutation({
      mutationFn: saveData,
      onMutate: async (toSaveChannel) => {
        await queryClient.cancelQueries({ queryKey: ['channels'] });

        const toSaveChannelAsVm = {
          ...toSaveChannel,
          fileMetadata: {
            ...toSaveChannel.fileMetadata,
            appData: {
              ...toSaveChannel.fileMetadata.appData,
              content: {
                ...toSaveChannel.fileMetadata.appData.content,
                template: parseChannelTemplate(
                  toSaveChannel?.fileMetadata.appData.content?.templateId
                ),
              },
            },
          },
        } as HomebaseFile<ChannelDefinitionVm>;

        // Update channels
        const previousChannels: HomebaseFile<ChannelDefinitionVm>[] | undefined =
          queryClient.getQueryData(['channels']);
        const updatedChannels = previousChannels?.map((chnl) =>
          stringGuidsEqual(
            chnl.fileMetadata.appData.uniqueId,
            toSaveChannelAsVm.fileMetadata.appData.uniqueId
          )
            ? toSaveChannelAsVm
            : chnl
        );
        queryClient.setQueryData(['channels'], updatedChannels);

        // Update channel
        queryClient.setQueryData(
          ['channel', toSaveChannelAsVm.fileMetadata.appData.content.slug],
          toSaveChannelAsVm
        );
        queryClient.setQueryData(
          ['channel', toSaveChannelAsVm.fileMetadata.appData.uniqueId],
          toSaveChannelAsVm
        );

        return { toSaveChannelAsVm, previousChannels };
      },
      onError: (err, toRemoveAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['channels'], context?.previousChannels);
      },
      onSettled: (_data, _error, variables) => {
        // Boom baby!
        if (
          variables.fileMetadata.appData.uniqueId &&
          variables.fileMetadata.appData.uniqueId !== ''
        ) {
          queryClient.invalidateQueries({
            queryKey: ['channel', variables.fileMetadata.appData.uniqueId],
          });
          queryClient.invalidateQueries({
            queryKey: ['channel', variables.fileMetadata.appData.content.slug],
          });
        }

        queryClient.invalidateQueries({ queryKey: ['channel'] });
        queryClient.invalidateQueries({ queryKey: ['channels'] });

        // We don't invalidate channels by default, as fetching the channels is a combination of static and dynamic data
        // queryClient.invalidateQueries(['channels']);

        publishStaticFiles('channel');
      },
    }),
    remove: useMutation({
      mutationFn: removeChannel,
      onMutate: async (toRemoveChannel) => {
        await queryClient.cancelQueries({ queryKey: ['channels'] });

        const previousChannels: HomebaseFile<ChannelDefinitionVm>[] | undefined =
          queryClient.getQueryData(['channels']);
        const newChannels = previousChannels?.filter(
          (channel) =>
            !stringGuidsEqual(
              channel.fileMetadata.appData.uniqueId,
              toRemoveChannel.fileMetadata.appData.uniqueId
            )
        );

        queryClient.setQueryData(['channels'], newChannels);

        return { previousChannels, toRemoveChannel };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['channels'], context?.previousChannels);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['channels'] });
        publishStaticFiles('channel');
      },
    }),
  };
};
