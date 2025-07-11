import { EmbeddedPost } from '@homebase-id/js-lib/public';
import { useEffect, useState } from 'react';
import { t } from '../../../helpers';
import { AuthorImage } from '../Author/AuthorImage';
import { AuthorName } from '../Author/AuthorName';
import { PostMeta } from '../Meta/Meta';
import { useChannel } from '../../../hooks';
import { FakeAnchor } from '../../../ui';
import { SecurityGroupType } from '@homebase-id/js-lib/core';
import { PostBody } from './Body';
import { PostMedia } from '../Media/Media';
import { FEED_ROOT_PATH } from '../../../constants';

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

  const { data: channel, status: channelStatus } = useChannel({
    odinId: content.authorOdinId,
    channelKey: content.channelId,
  }).fetch;

  // Hide media if we can't get channel info, when there's no channel we can't get the media either
  useEffect(() => {
    if (channelStatus !== 'pending' && !channel) setShouldHideMedia(true);
  }, [channel, channelStatus]);

  // When on the feed use the preview link
  const postPath =
    window.location.pathname === FEED_ROOT_PATH
      ? `preview/${content.authorOdinId}/${channel?.fileMetadata.appData.uniqueId}/${content.id}`
      : content.permalink;

  const isChannelPublic =
    channel?.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Authenticated ||
    channel?.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Anonymous;
  
  content.dataSource

  return (
    <div className={`overflow-hidden rounded-lg border dark:border-slate-700 ${className ?? ''}`}>
      <FakeAnchor href={postPath} onClick={(e) => e.stopPropagation()}>
        <div className="p-1">
          <div className="flex flex-row">
            <div className="flex w-20 flex-grow flex-col px-2 py-2">
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
                fileId={content.fileId}
                globalTransitId={content.globalTransitId}
                lastModified={content.lastModified}
                payloads={content.payloads}
              />

              {shouldHideMedia && content.primaryMediaFile ? (
                <p className="mt-2 text-slate-400 hover:underline">{t('See media')}</p>
              ) : null}
            </div>
          </div>
        </div>

        {!shouldHideMedia ? (
          <PostMedia
            postInfo={{
              fileId: content.primaryMediaFile?.fileId || content.fileId,
              dataSource: content.dataSource,
              globalTransitId: content.globalTransitId,
              lastModified: content.lastModified,
              content,
              payloads: content.payloads,
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
