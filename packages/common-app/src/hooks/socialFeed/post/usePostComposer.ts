import {
  ImageUploadResult,
  VideoUploadResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import {
  MediaFile,
  Tweet,
  Media,
  PostFile,
  ChannelDefinition,
  BlogConfig,
  PostContent,
} from '@youfoundation/js-lib/public';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { useState } from 'react';
import usePost, { AttachmentFile } from './usePost';
import { makeGrid, useDotYouClient } from '../../../..';

export type ReactAccess = SecurityGroupType.Owner | SecurityGroupType.Connected | undefined;

export const usePostComposer = () => {
  const [postState, setPostState] = useState<
    'processing' | 'uploading' | 'encrypting' | 'error' | undefined
  >();
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { mutateAsync: savePostFile, error: savePostError } = usePost().save;
  const { mutateAsync: saveFiles, error: saveFilesError } = usePost().saveFiles;

  const savePost = async (
    caption: string | undefined,
    files: AttachmentFile[] | undefined,
    embeddedPost: PostFile<PostContent> | undefined,
    channel: ChannelDefinition,
    reactAccess: ReactAccess
  ) => {
    if (!files && !caption && !embeddedPost) {
      console.log('fast fail');
      return;
    }

    const shouldSecureAttachments =
      channel.acl?.requiredSecurityGroup !== SecurityGroupType.Anonymous &&
      channel.acl?.requiredSecurityGroup !== SecurityGroupType.Authenticated;

    try {
      // Process files, if any
      let uploadResults: (ImageUploadResult | VideoUploadResult)[] | undefined = undefined;
      if (files?.length && channel?.acl) {
        setPostState('processing');
        if (shouldSecureAttachments) setPostState('encrypting');

        uploadResults = await saveFiles({
          acl: shouldSecureAttachments
            ? { requiredSecurityGroup: SecurityGroupType.Anonymous }
            : channel.acl,
          channelId: channel.channelId,
          files,
        });
      }

      const mediaFiles: MediaFile[] | undefined = uploadResults?.map((result) => {
        return { type: result.type, fileId: result.fileId };
      });

      setPostState('uploading');

      // Upload post
      const postId = getNewId();
      const postFile: PostFile<Tweet | Media> = {
        content: {
          authorOdinId: dotYouClient.getIdentity(),
          type: mediaFiles && mediaFiles.length > 1 ? 'Media' : 'Tweet',
          mediaFiles: mediaFiles && mediaFiles.length > 1 ? mediaFiles : undefined,
          caption: caption?.trim() || '',
          dateUnixTime: new Date().getTime(),
          id: postId,
          slug: postId,
          channelId: channel.channelId || BlogConfig.PublicChannel.channelId,
          primaryMediaFile: mediaFiles?.[0] ?? undefined,
          reactAccess: reactAccess,

          embeddedPost: embeddedPost?.content,
        },

        acl: channel.acl ? { ...channel.acl } : { requiredSecurityGroup: SecurityGroupType.Owner },
        previewThumbnail:
          uploadResults && uploadResults.length >= 4
            ? await makeGrid(
                uploadResults
                  .filter((result) => result?.type === 'image')
                  .map((result) => (result as ImageUploadResult).previewThumbnail)
              )
            : (
                uploadResults?.filter(
                  (result) => result?.type === 'image'
                )?.[0] as ImageUploadResult
              )?.previewThumbnail || undefined,
      };

      await savePostFile({ blogFile: postFile, channelId: channel.channelId });
    } catch (ex) {
      setPostState('error');
    }

    setPostState(undefined);
  };

  return {
    savePost,
    postState,
    error: postState === 'error' ? savePostError || saveFilesError : undefined,
  };
};
