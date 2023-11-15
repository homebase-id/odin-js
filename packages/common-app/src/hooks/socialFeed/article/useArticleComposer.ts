import { slugify, getNewId } from '@youfoundation/js-lib/helpers';
import { Article, ChannelDefinition, BlogConfig, NewMediaFile } from '@youfoundation/js-lib/public';
import { useState, useEffect } from 'react';
import { HOME_ROOT_PATH, getReadingTime, useBlog, useDotYouClient } from '../../../..';
import { usePost } from '../post/usePost';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';

export const EMPTY_POST: Article = {
  id: '',
  authorOdinId: '',
  channelId: BlogConfig.PublicChannel.channelId,
  slug: '',
  type: 'Article',
  caption: '',
  body: '',
  abstract: '',
};

export const useArticleComposer = ({
  channelKey,
  postKey,
  caption,
}: {
  channelKey?: string;
  postKey?: string;
  caption?: string;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { data: serverData } = useBlog({
    channelSlug: channelKey,
    channelId: channelKey,
    blogSlug: postKey,
  });

  const {
    save: { mutateAsync: savePost, error: savePostError, status: savePostStatus },
    remove: {
      mutateAsync: removePost,
      error: removePostError,
      status: removePostStatus,
      reset: resetRemovePostStatus,
    },
  } = usePost();

  const [postFile, setPostFile] = useState<
    NewDriveSearchResult<Article> | DriveSearchResult<Article>
  >({
    ...serverData?.activeBlog,
    fileMetadata: {
      ...serverData?.activeBlog.fileMetadata,
      appData: {
        fileType: BlogConfig.DraftPostFileType,
        userDate: new Date().getTime(),
        content: {
          ...EMPTY_POST,
          caption: caption ?? EMPTY_POST.caption,
          authorOdinId: dotYouClient.getIdentity(),
          id: getNewId(),
          ...serverData?.activeBlog?.fileMetadata.appData.content,
          type: 'Article',
        },
      },
    },
    serverMetadata: {
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
      ...serverData?.activeBlog.serverMetadata,
    },
  });

  const [primaryMediaFile, setPrimaryMediaFile] = useState<NewMediaFile | undefined | null>(null);

  const [channel, setChannel] = useState<ChannelDefinition>(
    serverData?.activeChannel &&
      postFile.fileMetadata.appData.content.channelId === serverData.activeChannel.channelId
      ? serverData.activeChannel
      : BlogConfig.PublicChannel
  );

  // Update state when server data changes
  useEffect(() => {
    if (serverData && serverData.activeBlog && (!postFile.fileId || savePostStatus === 'success')) {
      setPostFile({
        ...serverData.activeBlog,
        fileMetadata: {
          ...serverData.activeBlog.fileMetadata,
          appData: {
            ...serverData.activeBlog.fileMetadata.appData,
            content: {
              ...EMPTY_POST,
              ...serverData.activeBlog?.fileMetadata.appData.content,
              type: 'Article',
            },
          },
        },
      });
    }
  }, [serverData]);

  const isPublished = postFile.fileMetadata.appData.fileType !== BlogConfig.DraftPostFileType;

  const isValidPost = (postFile: DriveSearchResult<Article> | NewDriveSearchResult<Article>) => {
    const postContent = postFile.fileMetadata.appData.content;
    return (
      !postContent.caption?.length &&
      postContent.caption.length <= 1 &&
      !postContent.abstract?.length &&
      postContent.abstract.length <= 1 &&
      !postContent.body?.length &&
      postContent.body.length === 0 &&
      !postContent.primaryMediaFile
    );
  };

  const doSave = async (
    dirtyPostFile: DriveSearchResult<Article> | NewDriveSearchResult<Article> = postFile,
    action: 'save' | 'publish' | 'draft' = 'save',
    explicitTargetChannel?: ChannelDefinition
  ) => {
    // Check if fully empty and if so don't save
    if (isValidPost(dirtyPostFile)) return;

    const isPublish = action === 'publish';
    const isUnpublish = action === 'draft';

    const targetChannel = explicitTargetChannel || channel;

    // Build postFile
    const toPostFile: NewDriveSearchResult<Article> = {
      ...dirtyPostFile,
      fileMetadata: {
        ...dirtyPostFile.fileMetadata,

        appData: {
          fileType: !isPublish || isUnpublish ? BlogConfig.DraftPostFileType : undefined,
          userDate: new Date().getTime(),
          content: {
            ...dirtyPostFile.fileMetadata.appData.content,
            id: dirtyPostFile.fileMetadata.appData.content.id ?? getNewId(), // Generate new id if there is none
            slug: slugify(dirtyPostFile.fileMetadata.appData.content.caption), // Reset slug to match caption each time
            channelId: targetChannel.channelId, // Always update channel to the one in state, shouldn't have changed
            readingTimeStats: getReadingTime(dirtyPostFile.fileMetadata.appData.content.body),
          },
        },
      },

      serverMetadata: {
        accessControlList: targetChannel.acl || { requiredSecurityGroup: SecurityGroupType.Owner },
      },
      // TODO: ACL is not changed, as it impacts the encrytped state...
      // targetChannel.acl && (isPublish || isPublished) && !isUnpublish
      // { ...targetChannel.acl }
      // : { requiredSecurityGroup: SecurityGroupType.Owner },
    };

    // Save and process result
    const uploadResult = await savePost({
      postFile: toPostFile,
      channelId: targetChannel.channelId,
      mediaFiles:
        primaryMediaFile !== null
          ? primaryMediaFile === undefined
            ? []
            : [primaryMediaFile]
          : undefined,
    });

    if (uploadResult)
      setPostFile((oldPostFile) => {
        return {
          ...oldPostFile,
          fileId: uploadResult.file.fileId,
          fileMetadata: {
            ...oldPostFile.fileMetadata,
            versionTag: uploadResult.newVersionTag,
          },
        };
      });

    // TODO: Move to component as it has page context?
    if (isPublish) {
      window.location.href = `${HOME_ROOT_PATH}posts/${targetChannel.slug}/${toPostFile.fileMetadata.appData.content.slug}`;
    } else {
      // Update url to support proper back browsing; And not losing the context when a refresh is needed
      window.history.replaceState(
        null,
        toPostFile.fileMetadata.appData.content.caption,
        `/owner/feed/edit/${targetChannel.slug}/${toPostFile.fileMetadata.appData.content.id}`
      );
    }
  };

  const doRemovePost = async () => {
    if (!postFile.fileId) return;

    await removePost({
      fileId: postFile.fileId,
      channelId: postFile.fileMetadata.appData.content.channelId,
      slug: postFile.fileMetadata.appData.content.slug,
    });
  };

  const movePost = async (newChannelDefinition: ChannelDefinition) => {
    setChannel(newChannelDefinition);

    // Clear fileId and contentId (as they can clash with what exists, or cause a fail to overwrite during upload)
    const dataToMove: NewDriveSearchResult<Article> = {
      ...postFile,
    };
    dataToMove.fileId = undefined;
    dataToMove.fileMetadata.appData.content.id = getNewId();

    // Files needs to get removed and saved again
    await doRemovePost();
    resetRemovePostStatus();

    setPostFile(dataToMove);
    doSave(dataToMove, 'save', newChannelDefinition);
  };

  return {
    // Actions
    doSave,
    doRemovePost,
    movePost,

    // Data
    channel,
    postFile,
    isValidPost,
    isPublished,
    primaryMediaFile,

    // Data updates
    setPostFile,
    setChannel,
    setPrimaryMediaFile,

    // Status
    saveStatus: savePostStatus,
    removeStatus: removePostStatus,

    // Errors
    error: savePostError || removePostError,
  };
};
