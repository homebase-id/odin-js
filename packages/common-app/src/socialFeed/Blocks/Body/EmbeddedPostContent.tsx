import { EmbeddedPost } from '@youfoundation/js-lib/public';
import { useEffect, useState } from 'react';
import { t } from '../../../helpers';
import { AuthorImage } from '../Author/Image';
import { AuthorName } from '../Author/Name';
import { PostMeta } from '../Meta/Meta';
import { useSocialChannel, useChannel } from '../../../hooks';
import { FakeAnchor } from '../../../ui';
import { SecurityGroupType } from '@youfoundation/js-lib/core';
import { PostBody } from './Body';
import { PostMedia } from '../Media/Media';

export const EmbeddedPostContent = ({
  content,
  className,
  hideMedia,
}: {
  content: EmbeddedPost;
  className?: string;
  hideMedia?: boolean;
}) => {
  const [shouldHideMedia, setShouldHideMedia] = useState(hideMedia);
  const isExternal = !content.authorOdinId || content.authorOdinId !== window.location.hostname;

  const { data: externalChannel, status: externalChannelStatus } = useSocialChannel({
    odinId: isExternal ? content.authorOdinId : undefined,
    channelId: content.channelId,
  }).fetch;
  const { data: internalChannel, status: internalChannelStatus } = useChannel({
    channelId: content.channelId,
  }).fetch;

  const channel = externalChannel || internalChannel;

  // Hide media if we can't get channel info, when there's no channel we can't get the media either
  useEffect(() => {
    if (externalChannelStatus !== 'pending' && internalChannelStatus !== 'pending' && !channel)
      setShouldHideMedia(true);
  }, [externalChannel, internalChannel, externalChannelStatus, internalChannelStatus]);

  // When on the feed use the preview link
  const postPath =
    window.location.pathname === '/owner/feed'
      ? `preview/${content.authorOdinId}/${channel?.channelId}/${content.id}`
      : content.permalink;

  const isChannelPublic =
    channel?.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated ||
    channel?.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous;

  return (
    <div className={`overflow-hidden rounded-lg border dark:border-slate-700 ${className ?? ''}`}>
      <FakeAnchor href={postPath} onClick={(e) => e.stopPropagation()}>
        <div className="p-1">
          <div className="flex flex-row">
            <div className="flex flex-grow flex-col px-2 py-2">
              <div className="text-foreground mb-1 flex flex-row gap-2 text-opacity-60">
                <div className="flex-shrink-0">
                  <AuthorImage odinId={content.authorOdinId} className="h-7 w-7 rounded-full" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center lg:flex-col lg:items-start xl:flex-row xl:items-center">
                  <h2>
                    <AuthorName odinId={content.authorOdinId} />
                  </h2>
                  <span className="hidden px-2 leading-4 md:block lg:hidden xl:block">·</span>
                  <PostMeta
                    embeddedPost={content}
                    odinId={content.authorOdinId}
                    excludeContextMenu={true}
                    channel={channel || undefined}
                  />
                </div>
              </div>

              <PostBody
                post={{ ...content, embeddedPost: undefined }}
                odinId={content.authorOdinId}
              />

              {shouldHideMedia && content.primaryMediaFile ? (
                <p className="mt-2 text-slate-400 hover:underline">{t('See media')}</p>
              ) : null}
            </div>
          </div>
        </div>

        {!shouldHideMedia && content.primaryMediaFile?.fileId ? (
          <PostMedia
            postFile={{
              fileId: content.primaryMediaFile.fileId,
              content,
              previewThumbnail: content.previewThumbnail,
              isEncrypted: isChannelPublic,
            }}
            odinId={content.authorOdinId}
          />
        ) : null}
      </FakeAnchor>
    </div>
  );
};
