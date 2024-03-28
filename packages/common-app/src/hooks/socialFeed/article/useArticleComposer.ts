import { slugify, getNewId, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { Article, ChannelDefinition, BlogConfig } from '@youfoundation/js-lib/public';
import { useState, useEffect } from 'react';
import { HOME_ROOT_PATH, getReadingTime, useBlog, useDotYouClient } from '../../../..';
import { usePost } from '../post/usePost';
import {
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
  MediaFile,
} from '@youfoundation/js-lib/core';

export const EMPTY_POST: Article = {
  id: '',
  authorOdinId: '',
  channelId: BlogConfig.PublicChannelId,
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

  const [postFile, setPostFile] = useState<NewHomebaseFile<Article> | HomebaseFile<Article>>({
    ...serverData?.activeBlog,
    fileMetadata: {
      ...serverData?.activeBlog.fileMetadata,
      appData: {
        fileType: BlogConfig.DraftPostFileType,
        userDate: serverData?.activeBlog.fileMetadata.appData.userDate || new Date().getTime(),
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

  const [files, setFiles] = useState<(NewMediaFile | MediaFile)[]>(
    serverData?.activeBlog.fileMetadata.payloads || []
  );

  const [channel, setChannel] = useState<NewHomebaseFile<ChannelDefinition>>(
    serverData?.activeChannel &&
      stringGuidsEqual(
        postFile.fileMetadata.appData.content.channelId,
        serverData.activeChannel.fileMetadata.appData.uniqueId
      )
      ? serverData.activeChannel
      : BlogConfig.PublicChannelNewDsr
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

    setChannel(
      serverData?.activeChannel ? serverData.activeChannel : BlogConfig.PublicChannelNewDsr
    );

    setFiles([...(serverData?.activeBlog.fileMetadata.payloads || [])]);
  }, [serverData]);

  const isPublished = postFile.fileMetadata.appData.fileType !== BlogConfig.DraftPostFileType;

  const isValidPost = (postFile: HomebaseFile<Article> | NewHomebaseFile<Article>) => {
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
    dirtyPostFile: HomebaseFile<Article> | NewHomebaseFile<Article> = postFile,
    action: 'save' | 'publish' | 'draft' = 'save',
    explicitTargetChannel?: NewHomebaseFile<ChannelDefinition>,
    redirectOnPublish?: boolean
  ) => {
    // Check if fully empty and if so don't save
    if (isValidPost(dirtyPostFile)) return;

    const isPublish = action === 'publish';
    const isUnpublish = action === 'draft';

    const targetChannel = explicitTargetChannel || channel;

    // Build postFile
    const toPostFile: NewHomebaseFile<Article> = {
      ...dirtyPostFile,
      fileMetadata: {
        ...dirtyPostFile.fileMetadata,

        appData: {
          fileType: !isPublish || isUnpublish ? BlogConfig.DraftPostFileType : undefined,
          userDate: dirtyPostFile.fileMetadata.appData.userDate || new Date().getTime(),
          content: {
            ...dirtyPostFile.fileMetadata.appData.content,
            id: dirtyPostFile.fileMetadata.appData.content.id ?? getNewId(), // Generate new id if there is none
            slug: slugify(dirtyPostFile.fileMetadata.appData.content.caption), // Reset slug to match caption each time
            channelId: targetChannel.fileMetadata.appData.uniqueId as string, // Always update channel to the one in state, shouldn't have changed
            readingTimeStats: getReadingTime(dirtyPostFile.fileMetadata.appData.content.body),
          },
        },
      },

      serverMetadata: targetChannel.serverMetadata || {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      },
    };

    // Save and process result
    const uploadResult = await savePost({
      postFile: toPostFile,
      channelId: targetChannel.fileMetadata.appData.uniqueId as string,
      mediaFiles: files,
    });

    if (uploadResult)
      setPostFile((oldPostFile) => {
        return {
          ...oldPostFile,
          fileId: uploadResult.file.fileId,
          fileMetadata: {
            ...oldPostFile.fileMetadata,
            appData: {
              ...oldPostFile.fileMetadata.appData,
              content: {
                // These got updated during saving
                ...toPostFile.fileMetadata.appData.content,
              },
            },
            versionTag: uploadResult.newVersionTag,
          },
        };
      });

    // TODO: Move to component as it has page context?
    if (isPublish && redirectOnPublish) {
      window.location.href = `${HOME_ROOT_PATH}posts/${targetChannel.fileMetadata.appData.content.slug}/${toPostFile.fileMetadata.appData.content.slug}`;
    } else {
      // Update url to support proper back browsing; And not losing the context when a refresh is needed
      window.history.replaceState(
        null,
        toPostFile.fileMetadata.appData.content.caption,
        `/apps/feed/edit/${targetChannel.fileMetadata.appData.content.slug}/${toPostFile.fileMetadata.appData.content.id}`
      );
    }
  };

  const doRemovePost = async () => {
    if (!postFile.fileId) return;

    await removePost({
      postFile: postFile as HomebaseFile<Article>,
      channelId: postFile.fileMetadata.appData.content.channelId,
    });
  };

  const movePost = async (newChannelDefinition: NewHomebaseFile<ChannelDefinition>) => {
    setChannel(newChannelDefinition);

    // Clear fileId and contentId (as they can clash with what exists, or cause a fail to overwrite during upload)
    const dataToMove: NewHomebaseFile<Article> = {
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
    files,

    // Data updates
    setPostFile,
    setChannel,
    setFiles,

    // Status
    saveStatus: savePostStatus,
    removeStatus: removePostStatus,

    // Errors
    error: savePostError || removePostError,
  };
};
