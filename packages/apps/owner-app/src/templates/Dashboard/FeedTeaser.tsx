import { t, FakeAnchor, useSocialFeed, LoadingBlock } from '@homebase-id/common-app';
import { PostTeaser } from '../../components/SocialFeed/PostTeaser';

const POSTS_TO_SHOW = 2;
export const FeedTeaser = ({ className }: { className?: string }) => {
  const { data: posts, isFetched } = useSocialFeed({ pageSize: POSTS_TO_SHOW }).fetchAll;
  const latestPosts = posts?.pages?.[0]?.results;

  const hasPosts = latestPosts && latestPosts?.length;

  return (
    <div className={className}>
      <div className="mb-4 flex flex-row items-center justify-between">
        <p className="text-2xl">{t('What has everyone been up to?')}</p>
      </div>
      <FakeAnchor className="w-full" href={hasPosts ? `/apps/feed` : `/owner/connections`}>
        <div className="pointer-events-none flex w-full flex-col gap-4">
          {hasPosts ? (
            latestPosts.slice(0, POSTS_TO_SHOW).map((post, index) => (
              <div
                className={`w-full rounded-md bg-background ${index !== 0 ? 'hidden lg:block' : ''}`}
                key={post.fileId}
              >
                <PostTeaser postFile={post} />
              </div>
            ))
          ) : isFetched ? (
            <p className="rounded-md bg-background px-4 py-4 text-slate-400">
              {t('Fill up your feed, by following people, or connecting with other identities')}
            </p>
          ) : (
            <>
              <LoadingBlock className="h-44 w-full bg-background" />
              <LoadingBlock className="h-44 w-full bg-background" />
            </>
          )}
        </div>
      </FakeAnchor>
    </div>
  );
};
