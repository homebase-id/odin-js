import { SecurityGroupType } from '@youfoundation/js-lib/core';
import { slugify, getNewId } from '@youfoundation/js-lib/helpers';
import { PostFile, Article, ChannelDefinition, BlogConfig } from '@youfoundation/js-lib/public';
import { useState, useEffect } from 'react';
import { HOME_ROOT_PATH, getReadingTime, useBlog, useDotYouClient } from '../../../..';
import { usePost } from '../post/usePost';

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

  const [postFile, setPostFile] = useState<PostFile<Article>>({
    userDate: new Date().getTime(),
    ...serverData?.activeBlog,
    content: {
      ...EMPTY_POST,
      caption: caption ?? EMPTY_POST.caption,
      authorOdinId: dotYouClient.getIdentity(),
      id: getNewId(),
      ...serverData?.activeBlog?.content,
      type: 'Article',
    },
  });

  const [channel, setChannel] = useState<ChannelDefinition>(
    serverData?.activeChannel && postFile.content.channelId === serverData.activeChannel.channelId
      ? serverData.activeChannel
      : BlogConfig.PublicChannel
  );

  // Update state when server data changes
  useEffect(() => {
    if (serverData && serverData.activeBlog && (!postFile.fileId || savePostStatus === 'success')) {
      setPostFile({
        ...serverData.activeBlog,
        content: {
          ...EMPTY_POST,
          ...serverData.activeBlog?.content,
          type: 'Article',
        },
      });
    }
  }, [serverData]);

  const isPublished =
    serverData?.activeBlog?.acl &&
    serverData?.activeBlog?.acl?.requiredSecurityGroup !== SecurityGroupType.Owner;

  const isValidPost = (postFile: PostFile<Article>) => {
    return (
      !postFile.content.caption?.length &&
      postFile.content.caption.length <= 1 &&
      !postFile.content.abstract?.length &&
      postFile.content.abstract.length <= 1 &&
      !postFile.content.body?.length &&
      postFile.content.body.length === 0 &&
      !postFile.content.primaryMediaFile
    );
  };

  const doSave = async (
    dirtyPostFile: PostFile<Article> = postFile,
    action: 'save' | 'publish' | 'draft' = 'save',
    explicitTargetChannel?: ChannelDefinition
  ) => {
    // Check if fully empty and if so don't save
    if (isValidPost(dirtyPostFile)) return;

    const isPublish = action === 'publish';
    const isUnpublish = action === 'draft';

    const targetChannel = explicitTargetChannel || channel;

    // Build postFile
    const toPostFile: PostFile<Article> = {
      ...dirtyPostFile,
      versionTag: undefined, // VersionTag is set undefined so we always reset it to the latest
      userDate: new Date().getTime(), // Set current date as userDate of the post
      content: {
        ...dirtyPostFile.content,
        id: dirtyPostFile.content.id ?? getNewId(), // Generate new id if there is none
        slug: slugify(dirtyPostFile.content.caption), // Reset slug to match caption each time
        channelId: targetChannel.channelId, // Always update channel to the one in state, shouldn't have changed
        readingTimeStats: getReadingTime(dirtyPostFile.content.body),
      },
      isDraft: !isPublish || isUnpublish,
      acl:
        targetChannel.acl && (isPublish || isPublished) && !isUnpublish
          ? { ...targetChannel.acl }
          : { requiredSecurityGroup: SecurityGroupType.Owner },
    };

    // Save and process result
    const uploadResult = await savePost({
      blogFile: toPostFile,
      channelId: targetChannel.channelId,
    });

    // TODO: Move to component as it has page context?
    if (isPublish) {
      window.location.href = `${HOME_ROOT_PATH}posts/${targetChannel.slug}/${toPostFile.content.slug}`;
    } else {
      // Update url to support proper back browsing; And not losing the context when a refresh is needed
      window.history.replaceState(
        null,
        toPostFile.content.caption,
        `/owner/feed/edit/${targetChannel.slug}/${toPostFile.content.id}`
      );
    }

    if (uploadResult && !dirtyPostFile.fileId) {
      setPostFile((oldPostFile) => {
        return { ...oldPostFile, fileId: uploadResult.file.fileId };
      });
    }
  };

  const doRemovePost = async () => {
    if (!postFile.fileId) return;

    await removePost({
      fileId: postFile.fileId,
      channelId: postFile.content.channelId,
      slug: postFile.content.slug,
    });
  };

  const movePost = async (newChannelDefinition: ChannelDefinition) => {
    setChannel(newChannelDefinition);

    // Clear fileId and contentId (as they can clash with what exists, or cause a fail to overwrite during upload)
    const dataToMove = {
      ...postFile,
      fileId: undefined,
      content: { ...postFile.content, id: getNewId() },
    };

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

    // Data updates
    setPostFile,
    setChannel,

    // Status
    saveStatus: savePostStatus,
    removeStatus: removePostStatus,

    // Errors
    error: savePostError || removePostError,
  };
};
