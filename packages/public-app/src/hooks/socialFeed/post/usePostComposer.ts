import {
  ImageUploadResult,
  VideoUploadResult,
  SecurityGroupType,
  MediaFile,
  getNewId,
  Tweet,
  Media,
  PostFile,
  ChannelDefinition,
  BlogConfig,
} from '@youfoundation/js-lib';
import { useState } from 'react';
import { makeGrid } from '../../../helpers/imageMerger';
import usePost, { AttachmentFile, FileLike } from './usePost';

export type ReactAccess = SecurityGroupType.Owner | SecurityGroupType.Connected | undefined;

const usePostComposer = () => {
  const [postState, setPostState] = useState<
    'processing' | 'uploading' | 'encrypting' | 'error' | undefined
  >();
  const { mutateAsync: savePostFile, error: savePostError } = usePost().save;
  const { mutateAsync: saveFiles, error: saveFilesError } = usePost().saveFiles;

  const savePost = async (
    caption: string | undefined,
    channel: ChannelDefinition,
    files: AttachmentFile[] | undefined,
    reactAccess: ReactAccess
  ) => {
    if (!files && !caption) {
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

      // Upload posts
      const postId = getNewId();
      const postFile: PostFile<Tweet | Media> = {
        content: {
          type: mediaFiles && mediaFiles.length > 1 ? 'Media' : 'Tweet',
          mediaFiles: mediaFiles && mediaFiles.length > 1 ? mediaFiles : undefined,
          caption: caption?.trim() || '',
          dateUnixTime: new Date().getTime(),
          id: postId,
          slug: postId,
          channelId: channel.channelId || BlogConfig.PublicChannel.channelId,
          primaryMediaFile: mediaFiles?.[0] ?? undefined,
          reactAccess: reactAccess,
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

export default usePostComposer;
