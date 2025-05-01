import { slugify, getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  Article,
  ChannelDefinition,
  BlogConfig,
  CollaborativeChannelDefinition,
  RemoteCollaborativeChannelDefinition,
} from '@homebase-id/js-lib/public';
import { useState, useEffect } from 'react';
import { useManagePost } from '../post/useManagePost';
import {
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
  MediaFile,
  UploadResult,
} from '@homebase-id/js-lib/core';
import { usePost } from '../post/usePost';
import { getReadingTime } from '../../../helpers/richTextHelper';
import { useChannel } from '../channels/useChannel';
import { FEED_ROOT_PATH, HOME_ROOT_PATH } from '../../../constants';

export const EMPTY_POST: Article = {
  id: '',
  channelId: BlogConfig.PublicChannelId,
  slug: '',
  type: 'Article',
  caption: 'Untitled',
  body: '',
  abstract: '',
};

export const useArticleComposer = ({
  odinKey,
  channelKey,
  postKey,
  caption,
}: {
  odinKey?: string;
  channelKey?: string;
  postKey?: string;
  caption?: string;
}) => {
  const { data: serverChannel, isPending: isLoadingServerChannel } = useChannel({
    odinId: odinKey,
    channelKey,
  }).fetch;
  const { data: serverPost, isPending: isLoadingServerPost } = usePost({
    odinId: odinKey,
    channelKey,
    postKey,
  });

  const {
    save: { mutateAsync: savePost, error: savePostError, status: savePostStatus },
    remove: { mutateAsync: removePost, error: removePostError, status: removePostStatus },
  } = useManagePost();

  const [postFile, setPostFile] = useState<NewHomebaseFile<Article> | HomebaseFile<Article>>({
    ...serverPost,
    fileMetadata: {
      ...serverPost?.fileMetadata,
      appData: {
        fileType: BlogConfig.DraftPostFileType,
        userDate: serverPost?.fileMetadata.appData.userDate || new Date().getTime(),
        content: {
          ...EMPTY_POST,
          caption: caption ?? EMPTY_POST.caption,
          id: getNewId(),
          ...serverPost?.fileMetadata.appData.content,
          type: 'Article',
        },
      },
    },
    serverMetadata: {
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
      ...serverPost?.serverMetadata,
    },
  });

  const [files, setFiles] = useState<(NewMediaFile | MediaFile)[]>(
    serverPost?.fileMetadata.payloads || []
  );

  const [channel, setChannel] = useState<NewHomebaseFile<ChannelDefinition>>(
    serverChannel &&
      stringGuidsEqual(
        postFile.fileMetadata.appData.content.channelId,
        serverChannel.fileMetadata.appData.uniqueId
      )
      ? serverChannel
      : BlogConfig.PublicChannelNewDsr
  );
  const [odinId, setOdinId] = useState<string | undefined>(odinKey);

  // Update state when server data is fetched
  useEffect(() => {
    if (serverPost && (!postFile.fileId || savePostStatus === 'success')) {
      setPostFile({
        ...serverPost,
        fileMetadata: {
          ...serverPost.fileMetadata,
          appData: {
            ...serverPost.fileMetadata.appData,
            content: {
              ...EMPTY_POST,
              ...serverPost?.fileMetadata.appData.content,
              type: 'Article',
            },
          },
        },
      });
    }

    setChannel(serverChannel ? serverChannel : BlogConfig.PublicChannelNewDsr);

    setFiles([...(serverPost?.fileMetadata.payloads || [])]);
  }, [serverPost]);

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

      serverMetadata: (targetChannel.serverMetadata ||
        (targetChannel.fileMetadata.appData.content.isCollaborative
          ? {
              accessControlList: (targetChannel as HomebaseFile<CollaborativeChannelDefinition>)
                .fileMetadata.appData.content.acl,
            }
          : undefined)) ?? {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      },
    };

    // Save and process result
    const uploadResult = await savePost({
      postFile: toPostFile,
      odinId: odinId,
      channelId:
        (targetChannel.fileMetadata.appData.content.isCollaborative
          ? ((targetChannel as HomebaseFile<RemoteCollaborativeChannelDefinition>).fileMetadata
              .appData.content.uniqueId as string)
          : undefined) || (targetChannel.fileMetadata.appData.uniqueId as string),
      mediaFiles: files,
    });

    if (!uploadResult) throw new Error('Failed to save post');

    if ((uploadResult as UploadResult).file && (uploadResult as UploadResult).newVersionTag) {
      console.info("file uploaded pre-update metadata:", postFile.fileMetadata);
      console.info("file uploaded pre-update new versiontag:", (uploadResult as UploadResult).newVersionTag);
      
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
          // We force set the keyHeader as it's returned from the upload, and needed for fast saves afterwards
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sharedSecretEncryptedKeyHeader: (uploadResult as UploadResult).keyHeader as any,
        };
      });

      console.info("file uploaded post-update metadata:", postFile.fileMetadata);

    } else if (!postFile.fileId) {
      // We didn't get any direct info from the upload; So we need to fully load the edit page again so it can get fetched;
      window.location.href = `${FEED_ROOT_PATH}/edit/${odinId ? `${odinId}/` : ''}${targetChannel.fileMetadata.appData.content.slug}/${toPostFile.fileMetadata.appData.content.id}`;
    }

    if (isPublish && redirectOnPublish) {
      if (odinId && odinId !== window.location.host) {
        window.location.href = `https://${odinId}/posts/${targetChannel.fileMetadata.appData.content.slug}/${toPostFile.fileMetadata.appData.content.id}`;
      } else {
        window.location.href = `${HOME_ROOT_PATH}posts/${targetChannel.fileMetadata.appData.content.slug}/${toPostFile.fileMetadata.appData.content.slug}`;
      }
    } else {
      // Update url to support proper back browsing; And not losing the context when a refresh is needed
      window.history.replaceState(
        null,
        toPostFile.fileMetadata.appData.content.caption,
        `${FEED_ROOT_PATH}/edit/${odinId ? `${odinId}/` : ''}${targetChannel.fileMetadata.appData.content.slug}/${toPostFile.fileMetadata.appData.content.id}`
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
    setOdinId,
    setFiles,

    // Status
    saveStatus: savePostStatus,
    removeStatus: removePostStatus,

    // Errors
    error: savePostError || removePostError,

    isLoadingServerData:
      (isLoadingServerPost || isLoadingServerChannel) && !!postKey && !!channelKey,
  };
};
