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

    const cachedChannels = queryClient.getQueryData<ChannelDefinitionVm[]>(['channels']);
    if (cachedChannels) {
      const foundChannel = cachedChannels.find(
        (chnl) => stringGuidsEqual(chnl.channelId, channelId) || chnl.slug === channelSlug
      );
      if (foundChannel) return foundChannel;
    }

    const channel = (await fetchCachedPublicChannels(dotYouClient))?.find(
      (chnl) => stringGuidsEqual(chnl.channelId, channelId) || chnl.slug === channelSlug
    );
    if (channel) return channel;

    const directFetchOfChannel =
      (channelSlug ? await getChannelDefinitionBySlug(dotYouClient, channelSlug) : undefined) ||
      (channelId ? await getChannelDefinition(dotYouClient, channelId) : undefined);

    if (directFetchOfChannel) {
      return {
        ...directFetchOfChannel,
        template: parseChannelTemplate(directFetchOfChannel?.templateId),
      } as ChannelDefinitionVm;
    }
    return null;
  };

  const saveData = async (channelDef: ChannelDefinition) => {
    await saveChannelDefinition(dotYouClient, { ...channelDef });
  };

  const removeChannel = async (channelDef: ChannelDefinition) => {
    await removeChannelDefinition(dotYouClient, channelDef.channelId);
  };

  return {
    fetch: useQuery(
      ['channel', channelSlug || channelId],
      () => fetchChannelData({ channelSlug, channelId }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        enabled: !!channelId || !!channelSlug,
      }
    ),
    save: useMutation(saveData, {
      onMutate: async (toSaveChannel) => {
        await queryClient.cancelQueries(['channels']);

        const toSaveChannelAsVm = {
          ...toSaveChannel,
          template: parseChannelTemplate(toSaveChannel?.templateId),
        } as ChannelDefinitionVm;

        // Update channels
        const previousChannels: ChannelDefinitionVm[] | undefined = queryClient.getQueryData([
          'channels',
        ]);
        const updatedChannels = previousChannels?.map((chnl) =>
          stringGuidsEqual(chnl.channelId, toSaveChannelAsVm.channelId) ? toSaveChannelAsVm : chnl
        );
        queryClient.setQueryData(['channels'], updatedChannels);

        // Update channel
        queryClient.setQueryData(['channel', toSaveChannelAsVm.slug], toSaveChannelAsVm);
        queryClient.setQueryData(['channel', toSaveChannelAsVm.channelId], toSaveChannelAsVm);

        return { toSaveChannelAsVm, previousChannels };
      },
      onError: (err, toRemoveAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['channels'], context?.previousChannels);
      },
      onSettled: (_data, _error, variables) => {
        // Boom baby!
        if (variables.channelId && variables.channelId !== '') {
          queryClient.invalidateQueries(['channel', variables.channelId]);
          queryClient.invalidateQueries(['channel', variables.slug]);
        } else {
          queryClient.invalidateQueries(['channel']);
          queryClient.invalidateQueries(['channels']);
        }
        // We don't invalidate channels by default, as fetching the channels is a combination of static and dynamic data
        // queryClient.invalidateQueries(['channels']);

        publishStaticFiles();
      },
    }),
    remove: useMutation(removeChannel, {
      onMutate: async (toRemoveChannel) => {
        await queryClient.cancelQueries(['channels']);

        const previousChannels: ChannelDefinitionVm[] | undefined = queryClient.getQueryData([
          'channels',
        ]);
        const newChannels = previousChannels?.filter(
          (channel) => channel.channelId !== toRemoveChannel.channelId
        );

        queryClient.setQueryData(['channels'], newChannels);

        return { previousChannels, toRemoveChannel };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['channels'], context?.previousChannels);
      },
      onSettled: () => {
        queryClient.invalidateQueries(['channels']);
      },
    }),
  };
};
