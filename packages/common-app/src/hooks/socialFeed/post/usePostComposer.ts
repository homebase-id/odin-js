import {
  AccessControlList,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
} from '@youfoundation/js-lib/core';
import {
  Tweet,
  Media,
  ChannelDefinition,
  BlogConfig,
  EmbeddedPost,
  ReactAccess,
  CollaborativeChannelDefinition,
} from '@youfoundation/js-lib/public';
import { getNewId, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useState } from 'react';
import { usePost } from './usePost';
import { useDotYouClient } from '../../auth/useDotYouClient';

export const usePostComposer = () => {
  const [postState, setPostState] = useState<'uploading' | 'encrypting' | 'error' | undefined>();
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const loggedInIdentity = useDotYouClient().getIdentity();
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { mutateAsync: savePostFile, error: savePostError } = usePost().save;

  const savePost = async (
    caption: string | undefined,
    mediaFiles: NewMediaFile[] | undefined,
    embeddedPost: EmbeddedPost | undefined,
    targetChannel: {
      channel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
      overrideAcl?: AccessControlList;
      odinId?: string;
    },
    reactAccess: ReactAccess | undefined
  ) => {
    if (!mediaFiles && !caption && !embeddedPost) return;

    const { channel, overrideAcl, odinId } = targetChannel;
    if (
      overrideAcl &&
      !stringGuidsEqual(channel.fileMetadata.appData.uniqueId, BlogConfig.PublicChannelId)
    ) {
      throw new Error('Custom ACLs are only allowed for public channels');
    }
    try {
      setPostState('uploading');

      // Upload post
      const postId = getNewId();
      const postFile: NewHomebaseFile<Tweet | Media> = {
        fileMetadata: {
          appData: {
            userDate: new Date().getTime(),
            content: {
              authorOdinId: loggedInIdentity || dotYouClient.getIdentity(),
              type: mediaFiles && mediaFiles.length > 1 ? 'Media' : 'Tweet',
              caption: caption?.trim() || '',
              id: postId,
              slug: postId,
              channelId: channel.fileMetadata.appData.uniqueId || BlogConfig.PublicChannelId,
              reactAccess: reactAccess,

              embeddedPost: embeddedPost,
            },
          },
        },
        serverMetadata: overrideAcl
          ? {
              accessControlList: overrideAcl,
            }
          : channel.serverMetadata ||
            ((channel.fileMetadata.appData.content as CollaborativeChannelDefinition).acl
              ? {
                  accessControlList: (
                    channel.fileMetadata.appData.content as CollaborativeChannelDefinition
                  ).acl,
                }
              : undefined) || {
              accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
            },
      };

      await savePostFile({
        postFile: postFile,
        odinId: odinId,
        channelId: channel.fileMetadata.appData.uniqueId as string,
        mediaFiles: mediaFiles,
        onUpdate: (progress) => setProcessingProgress(progress),
      });
    } catch (ex) {
      setPostState('error');
    }

    setPostState(undefined);
    setProcessingProgress(0);
  };

  return {
    savePost,
    postState,
    processingProgress,
    error: postState === 'error' ? savePostError : undefined,
  };
};
