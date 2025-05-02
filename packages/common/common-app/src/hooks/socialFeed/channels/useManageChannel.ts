import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChannelDefinition,
  GetTargetDriveFromChannelId,
  removeChannelDefinition,
  saveChannelDefinition,
} from '@homebase-id/js-lib/public';

import {
  ChannelDefinitionVm,
  invalidateChannels,
  parseChannelTemplate,
  updateCacheChannels,
} from './useChannels';
import {
  FEED_APP_ID,
  FEED_ROOT_PATH,
  invalidateChannel,
  t,
  updateCacheChannel,
  useOdinClientContext,
  useStaticFiles,
} from '../../../..';
import { stringGuidsEqual, stringifyToQueryParams, toGuidId } from '@homebase-id/js-lib/helpers';
import {
  ApiType,
  OdinClient,
  DrivePermissionType,
  HomebaseFile,
  NewHomebaseFile,
  TargetDrive,
} from '@homebase-id/js-lib/core';

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

  const host = new OdinClient({
    hostIdentity: identity,
    api: ApiType.App,
  }).getRoot();
  return `${host}/owner/appupdate?${stringifyToQueryParams(params)}&return=${encodeURIComponent(
    returnUrl
  )}`;
};

export const useManageChannel = () => {
  const odinClient = useOdinClientContext();
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

      const host = odinClient.getHostIdentity();
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

    return await saveChannelDefinition(odinClient, { ...channelDef }, onMissingDrive);
  };

  const removeChannel = async (channelDef: HomebaseFile<ChannelDefinition>) => {
    await removeChannelDefinition(odinClient, channelDef.fileMetadata.appData.uniqueId as string);
  };

  return {
    save: useMutation({
      mutationFn: saveData,
      onMutate: async (toSaveChannel) => {
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
        const previousChannels = updateCacheChannels(queryClient, (data) => [
          toSaveChannelAsVm,
          ...data.filter(
            (chnl) =>
              chnl.fileMetadata.appData.uniqueId !== chnl.fileMetadata.appData.uniqueId &&
              chnl.fileId !== toSaveChannelAsVm.fileId
          ),
        ]);

        // Update channel
        updateCacheChannel(
          queryClient,
          odinClient.getHostIdentity(),
          toSaveChannelAsVm.fileMetadata.appData.content.slug,
          () => toSaveChannelAsVm
        );
        updateCacheChannel(
          queryClient,
          odinClient.getHostIdentity(),
          toSaveChannelAsVm.fileMetadata.appData.uniqueId as string,
          () => toSaveChannelAsVm
        );

        return { toSaveChannelAsVm, previousChannels };
      },
      onError: (err, toRemoveAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        updateCacheChannels(queryClient, () => context?.previousChannels);
      },
      onSettled: (_data, _error, variables) => {
        if (
          variables.fileMetadata.appData.uniqueId &&
          variables.fileMetadata.appData.uniqueId !== ''
        ) {
          invalidateChannel(
            queryClient,
            odinClient.getHostIdentity(),
            variables.fileMetadata.appData.uniqueId
          );
          invalidateChannel(
            queryClient,
            odinClient.getHostIdentity(),
            variables.fileMetadata.appData.content.slug
          );
        }

        invalidateChannels(queryClient);
        publishStaticFiles('channel');
      },
    }),
    remove: useMutation({
      mutationFn: removeChannel,
      onMutate: async (toRemoveChannel) => {
        const previousChannels = updateCacheChannels(queryClient, (data) =>
          data.filter(
            (chnl) =>
              !stringGuidsEqual(
                chnl.fileMetadata.appData.uniqueId,
                toRemoveChannel.fileMetadata.appData.uniqueId
              )
          )
        );

        return { previousChannels, toRemoveChannel };
      },
      onError: (err, newData, context) => {
        console.error(err);

        updateCacheChannels(queryClient, () => context?.previousChannels);
      },
      onSettled: () => {
        invalidateChannels(queryClient);
        publishStaticFiles('channel');
      },
    }),
  };
};
