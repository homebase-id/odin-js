import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChannelDefinition,
  getChannelDefinition,
  getChannelDefinitionBySlug,
  removeChannelDefinition,
  saveChannelDefinition,
} from '@youfoundation/js-lib/public';

import { useStaticFiles } from '@youfoundation/common-app';
import { ChannelDefinitionVm, parseChannelTemplate } from './useChannels';
import { useDotYouClient } from '../../../..';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { fetchCachedPublicChannels } from '../cachedDataHelpers';
import { DriveSearchResult, NewDriveSearchResult } from '@youfoundation/js-lib/core';

type useChannelsProps = {
  channelSlug?: string;
  channelId?: string;
};

export const useChannel = ({ channelSlug, channelId }: useChannelsProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publish;

  const fetchChannelData = async ({ channelSlug, channelId }: useChannelsProps) => {
    if (!channelSlug && !channelId) return null;

    const cachedChannels = queryClient.getQueryData<DriveSearchResult<ChannelDefinitionVm>[]>([
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
    if (channel) return channel;

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
      } as DriveSearchResult<ChannelDefinitionVm>;
    }
    return null;
  };

  const saveData = async (
    channelDef: NewDriveSearchResult<ChannelDefinition> | DriveSearchResult<ChannelDefinition>
  ) => {
    await saveChannelDefinition(dotYouClient, { ...channelDef });
  };

  const removeChannel = async (channelDef: DriveSearchResult<ChannelDefinition>) => {
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
        } as DriveSearchResult<ChannelDefinitionVm>;

        // Update channels
        const previousChannels: DriveSearchResult<ChannelDefinitionVm>[] | undefined =
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

        publishStaticFiles();
      },
    }),
    remove: useMutation({
      mutationFn: removeChannel,
      onMutate: async (toRemoveChannel) => {
        await queryClient.cancelQueries({ queryKey: ['channels'] });

        const previousChannels: DriveSearchResult<ChannelDefinitionVm>[] | undefined =
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
      },
    }),
  };
};
