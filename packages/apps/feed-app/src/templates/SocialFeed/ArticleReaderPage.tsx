import { useLayoutEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArticleReader,
  FEED_ROOT_PATH,
  LoadingBlock,
  NotFound,
  t,
  useChannel,
  useDotYouClientContext,
  usePost,
} from '@homebase-id/common-app';

/** An article on a page of its own: loaded as the preview loads a post, without the feed under it. */
const ArticleReaderPage = () => {
  const { identityKey, channelKey, postKey } = useParams();
  const dotYouClient = useDotYouClientContext();
  const isOwner = dotYouClient.isOwner();

  const isLocal = identityKey === dotYouClient.getHostIdentity();

  const { data: channel } = useChannel({
    odinId: !isLocal ? identityKey : undefined,
    channelKey: channelKey,
  }).fetch;

  const { data: post, isFetched: fetchedPost } = usePost({
    odinId: !isLocal ? identityKey : undefined,
    channelKey: channelKey,
    postKey: postKey,
  });

  const location = useLocation();

  const navigate = useNavigate();
  // Back to the entry the reader was opened from, where the feed restores its place; the feed
  // when the reader was the first page (a shared link)
  const doClose = () => (location.key !== 'default' ? navigate(-1) : navigate(FEED_ROOT_PATH));

  // The feed was scrolled; the article starts at its top, unless the link names a place in it,
  // which the reader scrolls to once that is on the page
  useLayoutEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [identityKey, channelKey, postKey]);

  if (fetchedPost && !post) return <NotFound />;

  const content = post?.fileMetadata.appData.content;
  // Only an article has a reader; anything else opens as before
  if (content && content.type !== 'Article')
    return (
      <Navigate
        to={`${FEED_ROOT_PATH}/preview/${identityKey}/${channelKey}/${postKey}`}
        replace={true}
        state={location.state}
      />
    );

  return (
    <>
      <Helmet>
        <title>{`${content?.caption || t('Article')} | Homebase`}</title>
      </Helmet>
      {post ? (
        <ArticleReader
          odinId={identityKey}
          channel={channel || undefined}
          postFile={post}
          isOwner={isOwner}
          isAuthenticated={true}
          onBack={doClose}
        />
      ) : (
        <div className="mx-auto w-full max-w-[var(--article-w)] px-5 pt-[5.5rem]">
          <LoadingBlock className="mb-3 h-10 w-full" />
          <LoadingBlock className="mb-10 h-10 w-3/5" />
          <LoadingBlock className="mb-2 h-4 w-full" />
          <LoadingBlock className="mb-2 h-4 w-full" />
          <LoadingBlock className="h-4 w-4/5" />
        </div>
      )}
    </>
  );
};

export default ArticleReaderPage;
