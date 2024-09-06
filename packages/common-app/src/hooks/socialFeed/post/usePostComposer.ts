import {
  AccessControlList,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
} from '@homebase-id/js-lib/core';
import {
  Tweet,
  Media,
  ChannelDefinition,
  BlogConfig,
  EmbeddedPost,
  ReactAccess,
  CollaborativeChannelDefinition,
  RemoteCollaborativeChannelDefinition,
} from '@homebase-id/js-lib/public';
import { getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useState } from 'react';
import { useManagePost } from './useManagePost';
import { useDotYouClient } from '../../auth/useDotYouClient';
import { LinkPreview } from '@homebase-id/js-lib/media';

export const usePostComposer = () => {
  const [postState, setPostState] = useState<'uploading' | 'encrypting' | 'error' | undefined>();
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const loggedInIdentity = useDotYouClient().getIdentity();
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { mutateAsync: savePostFile, error: savePostError } = useManagePost().save;

  const savePost = async (
    caption: string | undefined,
    mediaFiles: NewMediaFile[] | undefined,
    linkPreviews: LinkPreview[] | undefined,
    embeddedPost: EmbeddedPost | undefined,
    targetChannel: {
      channel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
      acl?: AccessControlList;
      odinId?: string;
    },
    reactAccess: ReactAccess | undefined
  ) => {
    if (!mediaFiles && !caption && !embeddedPost) return;

    const { channel, acl, odinId } = targetChannel;
    const channelId =
      (channel.fileMetadata.appData.content as RemoteCollaborativeChannelDefinition).uniqueId ||
      channel.fileMetadata.appData.uniqueId ||
      BlogConfig.PublicChannelId;
    if (acl && !stringGuidsEqual(channelId, BlogConfig.PublicChannelId)) {
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
              channelId: channelId,
              reactAccess: reactAccess,

              embeddedPost: embeddedPost,
            },
          },
        },
        serverMetadata: acl
          ? {
              accessControlList: acl,
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
        channelId: channelId,
        mediaFiles: mediaFiles,
        linkPreviews: linkPreviews,
        onUpdate: (progress) => setProcessingProgress(progress),
      });
    } catch (ex) {
      console.error('Error saving post', ex);
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
