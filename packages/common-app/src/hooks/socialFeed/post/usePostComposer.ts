import { NewDriveSearchResult, SecurityGroupType } from '@youfoundation/js-lib/core';
import {
  Tweet,
  Media,
  ChannelDefinition,
  BlogConfig,
  EmbeddedPost,
  ReactAccess,
  NewMediaFile,
} from '@youfoundation/js-lib/public';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { useState } from 'react';
import { usePost } from './usePost';
import { useDotYouClient } from '../../../..';

export const usePostComposer = () => {
  const [postState, setPostState] = useState<'uploading' | 'encrypting' | 'error' | undefined>();
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { mutateAsync: savePostFile, error: savePostError } = usePost().save;

  const savePost = async (
    caption: string | undefined,
    mediaFiles: NewMediaFile[] | undefined,
    embeddedPost: EmbeddedPost | undefined,
    channel: ChannelDefinition,
    reactAccess: ReactAccess | undefined
  ) => {
    if (!mediaFiles && !caption && !embeddedPost) {
      console.log('fast fail');
      return;
    }

    try {
      setPostState('uploading');

      // Upload post
      const postId = getNewId();
      const postFile: NewDriveSearchResult<Tweet | Media> = {
        fileMetadata: {
          appData: {
            userDate: new Date().getTime(),
            content: {
              authorOdinId: dotYouClient.getIdentity(),
              type: mediaFiles && mediaFiles.length > 1 ? 'Media' : 'Tweet',
              caption: caption?.trim() || '',
              id: postId,
              slug: postId,
              channelId: channel.channelId || BlogConfig.PublicChannel.channelId,
              reactAccess: reactAccess,

              embeddedPost: embeddedPost,
            },
          },
        },
        serverMetadata: {
          accessControlList: channel.acl
            ? { ...channel.acl }
            : { requiredSecurityGroup: SecurityGroupType.Owner },
        },
      };

      await savePostFile({
        postFile: postFile,
        channelId: channel.channelId,
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
