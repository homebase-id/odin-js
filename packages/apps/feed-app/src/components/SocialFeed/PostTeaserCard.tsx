import {PostContent} from '@homebase-id/js-lib/public';
import {FC} from 'react';
import {
  AuthorImage,
  AuthorName,
  FakeAnchor,
  PostInteracts,
  PostMeta,
  useChannel,
  ErrorBoundary,
  PostBody,
  useCheckIdentity,
  LoadingBlock,
  t,
  ToGroupBlock,
  useDotYouClientContext,
  PostSource,
} from '@homebase-id/common-app';
import {useNavigate} from 'react-router-dom';
import {DoubleClickHeartForMedia} from '@homebase-id/common-app';
import {HomebaseFile, NewHomebaseFile} from '@homebase-id/js-lib/core';
import {UnreachableIdentity} from './UnreachableIdentity';
import {useHighlightFeedItem} from '../../hooks/useHighlightFeedItem';

interface PostTeaserCardProps {
  className?: string;
  postFile: HomebaseFile<PostContent>;
  showSummary?: boolean;
}

const PostTeaserCard: FC<PostTeaserCardProps> = ({className, postFile, showSummary}) => {
  const dotYouClient = useDotYouClientContext();
  const post = postFile.fileMetadata.appData.content;
  const identity = dotYouClient.getHostIdentity();

  let odinId = postFile.fileMetadata.senderOdinId
  let channelId = post.channelId;

  if (postFile.fileMetadata.dataSource?.payloadsAreRemote === true) {
    odinId = postFile.fileMetadata.dataSource.identity;
    channelId = postFile.fileMetadata.dataSource.driveId;
  }

  const isExternal = odinId && odinId !== identity;
  const navigate = useNavigate();

  const highlight = useHighlightFeedItem(postFile);
  const {data: identityAccessible} = useCheckIdentity(isExternal ? odinId : undefined);

  const {data: channel} = useChannel({
    odinId: isExternal ? odinId : undefined,
    channelKey: channelId,
  }).fetch;

  const postPath = `preview/${isExternal ? odinId : identity}/${
    channel?.fileMetadata.appData.uniqueId
  }/${post.id}`;
  const clickable = post.type === 'Article'; // Post is only clickable if it's an article; While media posts are clickable only on the media itself

  const authorOdinId = postFile.fileMetadata.originalAuthor || odinId;

  if (identityAccessible === false && isExternal)
    return <UnreachableIdentity postFile={postFile} className={className} odinId={odinId}/>;

  return (
    <div
      className={`w-full break-words rounded-lg ${highlight ? 'bg-indigo-100 dark:bg-indigo-900' : ''} ${className ?? ''}`}
      data-odin-id={odinId}
    >
      <ErrorBoundary>
        <FakeAnchor
          href={clickable ? postPath : undefined}
          target="__blank"
          rel="nofollow noreferrer"
          preventScrollReset={true}
          className={`relative flex h-full flex-col rounded-lg border-gray-200 border-opacity-60 transition-colors ${
            clickable ? 'hover:shadow-md hover:dark:shadow-slate-600' : ''
          } dark:border-gray-800 lg:border`}
        >
          <PostSource postFile={postFile} className="rounded-t-lg"/>
          <div className="flex flex-row gap-4 px-3 py-3 sm:px-4">
            <div className="flex-shrink-0 py-1">
              <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-[4rem] md:w-[4rem]">
                <AuthorImage
                  odinId={authorOdinId}
                  className="h-10 w-10 overflow-hidden rounded-full sm:h-12 sm:w-12 md:h-[4rem] md:w-[4rem]"
                  size="custom"
                />
              </div>
            </div>
            <div className="flex w-20 flex-grow flex-col">
              <div
                className="mb-1 flex flex-col text-foreground text-opacity-60 md:flex-row md:flex-wrap md:items-center">
                <h2>
                  <AuthorName odinId={authorOdinId}/>
                  <ToGroupBlock
                    channel={channel || undefined}
                    odinId={odinId}
                    authorOdinId={authorOdinId}
                    className="ml-1"
                  />
                </h2>
                <span className="hidden px-2 leading-4 md:block">·</span>

                <PostMeta
                  postFile={postFile}
                  channel={channel || undefined}
                  odinId={odinId}
                  authorOdinId={authorOdinId}
                />
              </div>

              <PostBody
                post={post}
                odinId={odinId}
                fileId={postFile.fileId}
                globalTransitId={postFile.fileMetadata.globalTransitId}
                lastModified={postFile.fileMetadata.updated}
                payloads={postFile.fileMetadata.payloads}
              />
            </div>
          </div>
          <DoubleClickHeartForMedia
            odinId={odinId}
            postFile={postFile}
            // Clicks don't propogate to the parent container because of the Double Tap listener
            onClick={(e, index) => {
              if (post.type !== 'Article')
                navigate(`${postPath}/${index}`, {state: {referrer: window.location.pathname}});
              else navigate(postPath, {state: {referrer: window.location.pathname}});
            }}
            className="mb-4"
          />
          <MediaStillUploading postFile={postFile}/>
          <PostInteracts
            odinId={odinId || window.location.hostname}
            postFile={postFile}
            className="px-4"
            showSummary={showSummary}
            isAuthenticated={true}
            isOwner={true}
          />
        </FakeAnchor>
      </ErrorBoundary>
    </div>
  );
};

const MediaStillUploading = ({postFile}: { postFile: NewHomebaseFile<PostContent> }) => {
  if (postFile.fileId) return null;
  if (!postFile.fileMetadata.appData.content.primaryMediaFile?.fileId) return null;

  return (
    <>
      <div className={`relative`}>
        <LoadingBlock className="aspect-square h-full w-full"/>
        <div className="absolute inset-0 flex animate-pulse items-center justify-center">
          <p>{t('Your media is being processed')}</p>
        </div>
      </div>
    </>
  );
};

export const NewPostTeaserCard: FC<PostTeaserCardProps> = (props) => {
  return (
    <PostTeaserCard
      {...props}
      className={`${props.className} pointer-events-none bg-slate-100 dark:bg-slate-600`}
    />
  );
};

export default PostTeaserCard;
