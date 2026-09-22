import { useChannels, useDotYouClientContext, HOME_ROOT_PATH } from '@homebase-id/common-app';
import { Article, BlogConfig, getChannelDrive, PostContent } from '@homebase-id/js-lib/public';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import type { CardImage, CardPost } from '../useCardData';

type Post = HomebaseFile<PostContent>;

export const POSTS_HREF = `${HOME_ROOT_PATH}posts/${BlogConfig.PublicChannelSlug}`;

export const usePostHref = () => {
  const client = useDotYouClientContext();
  const { data: channels } = useChannels({
    isAuthenticated: client.isAuthenticated(),
    isOwner: client.isOwner(),
  });
  return (post: Post) => {
    const content = post.fileMetadata.appData.content;
    const channel = channels?.find((c) =>
      stringGuidsEqual(c.fileMetadata.appData.uniqueId, content.channelId)
    );
    const slug = channel?.fileMetadata.appData.content.slug ?? BlogConfig.PublicChannelSlug;
    return `${HOME_ROOT_PATH}posts/${slug}/${content.slug ?? content.id}`;
  };
};

export const postImage = (post: Post): CardImage | undefined => {
  const content = post.fileMetadata.appData.content;
  const primaryMediaFile = content.primaryMediaFile;
  // Media posts carry a mime type ("image/jpeg"); an article's hero is saved as plain "image"
  if (!primaryMediaFile || !/^(image|video)(\/|$)/.test(primaryMediaFile.type)) return undefined;
  return {
    fileId: primaryMediaFile.fileId ?? post.fileId,
    fileKey: primaryMediaFile.fileKey,
    lastModified: post.fileMetadata.updated,
    previewThumbnail: post.fileMetadata.appData.previewThumbnail,
    targetDrive: getChannelDrive(content.channelId),
    probablyEncrypted: post.fileMetadata.isEncrypted,
  };
};

export const postDate = (post: CardPost) => new Date(post.date);

export const cardPost = (post: Post, href: string): CardPost => {
  const content = post.fileMetadata.appData.content;
  // Only articles carry a summary and a reading time
  const article = content.type === 'Article' ? (content as Article) : undefined;
  return {
    id: post.fileId,
    href,
    date: post.fileMetadata.appData.userDate ?? post.fileMetadata.created,
    title: content.caption,
    excerpt: article?.abstract,
    minutes: article?.readingTimeStats?.minutes,
    image: postImage(post),
  };
};
