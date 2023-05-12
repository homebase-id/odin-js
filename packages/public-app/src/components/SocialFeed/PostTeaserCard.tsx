import { PostContent, Article, PostFile, getChannelDrive } from '@youfoundation/js-lib';
import { FC, useState } from 'react';
import { useChannel } from '@youfoundation/common-app';
import useSocialChannel from '../../hooks/socialFeed/useSocialChannel';
import PostMeta from '../Post/Common/Blocks/Meta/Meta';
import FakeAnchor from '../ui/Buttons/FakeAnchor';
import AuthorImage from '../Post/Common/Blocks/Author/Image';
import AuthorName from '../Post/Common/Blocks/Author/Name';
import { ellipsisAtMaxChar } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';

import RichTextRenderer from '../RichTextRenderer/RichTextRenderer';
import { PostMedia } from '../Post/Common/Blocks/Media/Media';
import { PostInteracts } from '../Post/Common/Blocks/Interacts/Interacts';

interface PostTeaserCardProps {
  className?: string;
  postFile: PostFile<PostContent>;
  odinId?: string;
  showSummary?: boolean;
}

const PostTeaserCard: FC<PostTeaserCardProps> = ({ className, odinId, postFile, showSummary }) => {
  const { content: post } = postFile;
  const isExternal = !odinId || odinId !== window.location.hostname;
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: externalChannel } = useSocialChannel({
    odinId: isExternal ? odinId : undefined,
    channelId: post.channelId,
  }).fetch;
  const { data: internalChannel } = useChannel({ channelId: post.channelId }).fetch;

  const channel = externalChannel || internalChannel;

  const postPath = `/home/feed/preview/${odinId}/${channel?.channelId}/${post.id}`;
  const clickable = post.type === 'Article';

  return (
    <div className={`w-full rounded-lg ${className ?? ''}`}>
      <FakeAnchor
        href={clickable ? postPath : undefined}
        target="__blank"
        rel="nofollow noreferrer"
        preventScrollReset={true}
        className={`relative flex h-full flex-col rounded-lg border-gray-200 border-opacity-60 transition-colors ${
          clickable ? 'hover:shadow-md hover:dark:shadow-slate-600' : ''
        } dark:border-gray-800 lg:border`}
      >
        <div className="flex flex-row">
          <div className="flex-shrink-0 py-4 pl-4">
            <AuthorImage
              odinId={odinId}
              className="h-[3rem] w-[3rem] rounded-full sm:h-[5rem] sm:w-[5rem]"
            />
          </div>
          <div className="flex flex-grow flex-col px-4 py-3">
            <div className="mb-1 flex flex-col text-foreground text-opacity-60 md:flex-row md:flex-wrap md:items-center">
              <h2>
                <AuthorName odinId={odinId} />
              </h2>
              <span className="hidden px-2 leading-4 md:block">·</span>
              {channel && post ? (
                <PostMeta postFile={postFile} channel={channel} odinId={odinId} />
              ) : null}
            </div>

            {/* Type specific content */}
            {post.type === 'Article' ? (
              <>
                <h1 className={`text-foreground text-opacity-80 ${isExpanded ? 'text-2xl' : ''}`}>
                  {post.caption}
                </h1>
                <div className="leading-relaxed text-foreground text-opacity-70">
                  {isExpanded ? (
                    <div className="rich-text-content mb-5 leading-relaxed">
                      <RichTextRenderer
                        body={(post as Article)?.body}
                        imageDrive={getChannelDrive(post.channelId)}
                        odinId={odinId}
                      />
                    </div>
                  ) : (
                    ellipsisAtMaxChar((post as Article).abstract, 140)
                  )}

                  <>
                    {' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                      }}
                      className="text-button hover:underline"
                    >
                      {isExpanded ? t('Less') : <>{t('More')}...</>}
                    </button>
                  </>
                </div>
              </>
            ) : (
              <h1 className="text-foreground text-opacity-70">
                {isExpanded || post.caption.length <= 140 ? (
                  post.captionAsRichText ? (
                    <RichTextRenderer
                      body={post.captionAsRichText}
                      odinId={odinId}
                      options={{ linksAlwaysBlank: true }}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">{post.caption}</span>
                  )
                ) : (
                  <>
                    {ellipsisAtMaxChar(post.caption, 140)}{' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                      }}
                      className="text-button hover:underline"
                    >
                      {t('More')}...
                    </button>
                  </>
                )}
              </h1>
            )}
          </div>
        </div>
        <PostMedia odinId={odinId} postFile={postFile} postPath={postPath} showFallback={false} />
        <PostInteracts
          authorOdinId={odinId || window.location.hostname}
          postFile={postFile}
          className="px-4"
          showSummary={showSummary}
        />
      </FakeAnchor>
    </div>
  );
};

export default PostTeaserCard;
