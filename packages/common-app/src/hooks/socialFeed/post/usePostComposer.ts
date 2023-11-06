import {
  ImageUploadResult,
  VideoUploadResult,
  SecurityGroupType,
  EmbeddedThumb,
  DEFAULT_PAYLOAD_KEY,
} from '@youfoundation/js-lib/core';
import {
  MediaFile,
  Tweet,
  Media,
  PostFile,
  ChannelDefinition,
  BlogConfig,
  EmbeddedPost,
  ReactAccess,
  NewMediaFile,
} from '@youfoundation/js-lib/public';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { useState } from 'react';
import { usePost } from './usePost';
import { makeGrid, useDotYouClient } from '../../../..';

export const usePostComposer = () => {
  const [postState, setPostState] = useState<
    'processing' | 'uploading' | 'encrypting' | 'error' | undefined
  >();
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

    const shouldSecureAttachments = !(
      channel.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
      channel.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
    );

    try {
      // // Process files, if any
      // let uploadResults: VideoUploadResult[] | undefined = undefined;
      // if (mediaFiles?.length && channel?.acl) {
      //   setPostState('processing');

      //   uploadResults = await saveVideoFiles({
      //     acl: shouldSecureAttachments
      //       ? { requiredSecurityGroup: SecurityGroupType.Anonymous }
      //       : channel.acl,
      //     channelId: channel.channelId,
      //     files: mediaFiles.filter((file) => file.file.type.startsWith('video/')),
      //     onUpdate: (progress) => setProcessingProgress(progress),
      //   });

      //   setPostState('encrypting');
      // }

      // const videoFiles: MediaFile[] | undefined = uploadResults?.map((result) => {
      //   return { type: result.type, fileId: result.fileId, fileKey: DEFAULT_PAYLOAD_KEY };
      // });

      // const imageFiles = mediaFiles?.filter((file) => file.file.type.startsWith('image/'));

      setPostState('uploading');

      // Upload post
      const postId = getNewId();
      const postFile: PostFile<Tweet | Media> = {
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

        acl: channel.acl ? { ...channel.acl } : { requiredSecurityGroup: SecurityGroupType.Owner },
      };

      await savePostFile({
        postFile: postFile,
        channelId: channel.channelId,
        mediaFiles: mediaFiles,
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
