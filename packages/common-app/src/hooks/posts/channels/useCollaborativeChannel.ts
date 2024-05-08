import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import { HomebaseFile, NewHomebaseFile } from '@youfoundation/js-lib/core';
import {
  RemoteCollaborativeChannelDefinition,
  removeChannelLink,
  saveChannelLink,
} from '@youfoundation/js-lib/public';

export const useCollaborativeChannel = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const saveCollaborativeChannel = async (
    chnlLink: NewHomebaseFile<RemoteCollaborativeChannelDefinition>
  ) => {
    return await saveChannelLink(dotYouClient, chnlLink);
  };

  const removeCollaborativeChannel = async (
    chnlLink: HomebaseFile<RemoteCollaborativeChannelDefinition>
  ) => {
    return await removeChannelLink(dotYouClient, chnlLink);
  };

  return {
    save: useMutation({
      mutationFn: saveCollaborativeChannel,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['collaborative-channel'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeCollaborativeChannel,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['collaborative-channel'] });
      },
    }),
  };
};
