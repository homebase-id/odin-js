import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChannelDefinition,
  GetTargetDriveFromChannelId,
  getChannelDefinition,
  getChannelDefinitionBySlug,
  removeChannelDefinition,
  saveChannelDefinition,
} from '@youfoundation/js-lib/public';

import { ChannelDefinitionVm, parseChannelTemplate } from './useChannels';
import { FEED_APP_ID, t, useDotYouClient, useStaticFiles } from '../../../..';
import { stringGuidsEqual, stringifyToQueryParams, toGuidId } from '@youfoundation/js-lib/helpers';
import {
  DrivePermissionType,
  HomebaseFile,
  NewHomebaseFile,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { fetchCachedPublicChannels } from '../post/cachedDataHelpers';
const FEED_ROOT_PATH = '/apps/feed';

type useChannelsProps = {
  channelSlug?: string;
  channelId?: string;
};

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

  return `https://${identity}/owner/appupdate?${stringifyToQueryParams(
    params
  )}&return=${encodeURIComponent(returnUrl)}`;
};

export const useChannel = ({ channelSlug, channelId }: useChannelsProps) => {
  const { getDotYouClient, isOwner } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publish;

  const fetchChannelData = async ({ channelSlug, channelId }: useChannelsProps) => {
    if (!channelSlug && !channelId) return null;

    const cachedChannels = queryClient.getQueryData<HomebaseFile<ChannelDefinitionVm>[]>([
      'channels',
    ]);
    if (cachedChannels) {
      const foundChannel = cachedChannels.find(
        (chnl) =>
          stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, channelId) ||
          chnl.fileMetadata.appData.content.slug === channelSlug
      );
      if (foundChannel) return foundChannel;
    }

    const channel = (await fetchCachedPublicChannels(dotYouClient))?.find(
      (chnl) =>
        stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, channelId) ||
        chnl.fileMetadata.appData.content.slug === channelSlug
    );
    if (channel && !isOwner) return channel;

    const directFetchOfChannel =
      (channelSlug ? await getChannelDefinitionBySlug(dotYouClient, channelSlug) : undefined) ||
      (channelId ? await getChannelDefinition(dotYouClient, channelId) : undefined);

    if (directFetchOfChannel) {
      return {
        ...directFetchOfChannel,
        fileMetadata: {
          ...directFetchOfChannel.fileMetadata,
          appData: {
            ...directFetchOfChannel.fileMetadata.appData,
            content: {
              ...directFetchOfChannel.fileMetadata.appData.content,
              template: parseChannelTemplate(
                directFetchOfChannel?.fileMetadata.appData.content?.templateId
              ),
            },
          },
        },
      } as HomebaseFile<ChannelDefinitionVm>;
    }
    return null;
  };

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

      const identity = dotYouClient.getIdentity();
      const returnUrl = `${FEED_ROOT_PATH}/channels?new=${JSON.stringify(channelDef)}`;

      const targetDrive = GetTargetDriveFromChannelId(channelDef.fileMetadata.appData.uniqueId);

      window.location.href = getExtendAuthorizationUrl(
        identity,
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
    fetch: useQuery({
      queryKey: ['channel', channelSlug || channelId],
      queryFn: () => fetchChannelData({ channelSlug, channelId }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!channelId || !!channelSlug,
    }),
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