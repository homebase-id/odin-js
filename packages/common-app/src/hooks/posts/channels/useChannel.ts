import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChannelDefinition,
  CollaborativeChannelDefinition,
  GetTargetDriveFromChannelId,
  getChannelDefinition,
  getChannelDefinitionBySlug,
  removeChannelDefinition,
  saveChannelDefinition,
} from '@youfoundation/js-lib/public';

import { FEED_APP_ID, t, useStaticFiles } from '@youfoundation/common-app';
import { ChannelDefinitionVm, parseChannelTemplate } from './useChannels';
import { useDotYouClient } from '../../../..';
import { stringGuidsEqual, stringifyToQueryParams, toGuidId } from '@youfoundation/js-lib/helpers';
import { fetchCachedPublicChannels } from '../cachedDataHelpers';
import {
  DrivePermissionType,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { ROOT_PATH } from '@youfoundation/feed-app/src/app/App';
import { ALL_CONNECTIONS_CIRCLE_ID } from '@youfoundation/js-lib/network';

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

const getExtendCirclePermissionUrl = (
  identity: string,
  name: string,
  description: string,
  targetDrive: TargetDrive,
  circleIds: string[],
  returnUrl: string
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
    },
  ];

  const params = {
    appId: FEED_APP_ID,
    cd: JSON.stringify(drives),
    c: circleIds.join(','),
  };

  return `https://${identity}/owner/apprequest?${stringifyToQueryParams(
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
      const returnUrl = `${ROOT_PATH}/channels?new=${JSON.stringify(channelDef)}`;

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

  const makeChannelCollaborative = async (channelDef: HomebaseFile<ChannelDefinition>) => {
    if (!channelDef.fileMetadata.appData.uniqueId) throw new Error('Channel unique id is not set');
    if (!channelDef.serverMetadata) throw new Error('Channel is not access as the owner');

    const collaborativeCircleIds =
      channelDef.serverMetadata?.accessControlList.requiredSecurityGroup ===
        SecurityGroupType.Connected && channelDef.serverMetadata?.accessControlList.circleIdList
        ? channelDef.serverMetadata?.accessControlList.circleIdList
        : [ALL_CONNECTIONS_CIRCLE_ID];

    if (!collaborativeCircleIds.length) throw new Error('No circles found for channel');

    const identity = dotYouClient.getIdentity();
    const returnUrl = `${ROOT_PATH}/channels`;

    const targetDrive = GetTargetDriveFromChannelId(channelDef.fileMetadata.appData.uniqueId);

    const collaborativeChannelDef = { ...channelDef };
    collaborativeChannelDef.fileMetadata.appData.content.isCollaborative = true;
    (collaborativeChannelDef.fileMetadata.appData.content as CollaborativeChannelDefinition).acl =
      channelDef.serverMetadata.accessControlList;
    await saveChannelDefinition(dotYouClient, collaborativeChannelDef);

    window.location.href = getExtendCirclePermissionUrl(
      identity,
      channelDef.fileMetadata.appData.content.name,
      t('Drive for "{0}" channel posts', channelDef.fileMetadata.appData.content.name),
      targetDrive,
      collaborativeCircleIds,
      returnUrl
    );
  };

  const makeChannelPrivate = async (channelDef: HomebaseFile<ChannelDefinition>) => {
    if (!channelDef.fileMetadata.appData.uniqueId) throw new Error('Channel unique id is not set');

    const collaborativeChannelDef = { ...channelDef };
    collaborativeChannelDef.fileMetadata.appData.content.isCollaborative = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (collaborativeChannelDef.fileMetadata.appData.content as any).acl;
    return await saveChannelDefinition(dotYouClient, collaborativeChannelDef);
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
    convertToCollaborativeChannel: useMutation({
      mutationFn: makeChannelCollaborative,
    }),
    convertToPrivateChannel: useMutation({
      mutationFn: makeChannelPrivate,
    }),
  };
};
