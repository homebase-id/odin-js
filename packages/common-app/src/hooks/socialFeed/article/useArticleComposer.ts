import { slugify, getNewId, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { Article, ChannelDefinition, BlogConfig } from '@youfoundation/js-lib/public';
import { useState, useEffect } from 'react';
import { HOME_ROOT_PATH, getReadingTime, useBlog, useDotYouClient } from '../../../..';
import { useManagePost } from '../post/useManagePost';
import {
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
  MediaFile,
  UploadResult,
} from '@youfoundation/js-lib/core';

export const EMPTY_POST: Article = {
  id: '',
  authorOdinId: '',
  channelId: BlogConfig.PublicChannelId,
  slug: '',
  type: 'Article',
  caption: 'Untitled',
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
  const { data: serverData, isPending: isLoadingServerData } = useBlog({
    channelSlug: channelKey,
    channelId: channelKey,
    blogSlug: postKey,
  });

  const {
    save: { mutateAsync: savePost, error: savePostError, status: savePostStatus },
    remove: { mutateAsync: removePost, error: removePostError, status: removePostStatus },
  } = useManagePost();

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
  const [groupOdinId, setGroupOdinId] = useState<string | undefined>(undefined);

  // Update state when server data is fetched
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

  const isInvalidPost = (postFile: HomebaseFile<Article> | NewHomebaseFile<Article>) => {
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
    const isPublish = action === 'publish';
    const isUnpublish = action === 'draft';

    // Check if fully empty and if so don't save
    if (isPublish && isInvalidPost(dirtyPostFile)) return;

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
      odinId: groupOdinId,
      channelId: targetChannel.fileMetadata.appData.uniqueId as string,
      mediaFiles: files,
    });

    if (
      uploadResult &&
      (uploadResult as UploadResult).file &&
      (uploadResult as UploadResult).newVersionTag
    )
      setPostFile((oldPostFile) => {
        return {
          ...oldPostFile,
          fileId: (uploadResult as UploadResult).file.fileId,
          fileMetadata: {
            ...oldPostFile.fileMetadata,
            appData: {
              ...oldPostFile.fileMetadata.appData,
              fileType: toPostFile.fileMetadata.appData.fileType,
              content: {
                // These got updated during saving
                ...toPostFile.fileMetadata.appData.content,
              },
            },
            versionTag: (uploadResult as UploadResult).newVersionTag,
          },
          // We force set the keyHeader as it's returned from the server, and needed for fast saves afterwards
          sharedSecretEncryptedKeyHeader: (uploadResult as UploadResult).keyHeader as any,
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

  return {
    // Actions
    doSave,
    doRemovePost,

    // Data
    channel,
    postFile,
    isInvalidPost,
    isPublished,
    files,

    // Data updates
    setPostFile,
    setChannel,
    setGroupOdinId,
    setFiles,

    // Status
    saveStatus: savePostStatus,
    removeStatus: removePostStatus,

    // Errors
    error: savePostError || removePostError,

    isLoadingServerData: isLoadingServerData && !!postKey && !!channelKey,
  };
};
