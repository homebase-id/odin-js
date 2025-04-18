import { IdentityTeaser, LoadingBlock, useFollowingInfinite } from '@homebase-id/common-app';
import { t } from '@homebase-id/common-app';

const FollowingView = ({ className }: { className?: string }) => {
  const {
    data: following,
    isFetched: followingFetched,
    isLoading: isFollowingLoading,
  } = useFollowingInfinite().fetch;

  const followingList = (
    following?.pages.flatMap((page) => page?.results).filter(Boolean) as string[]
  )?.slice(0, 5);

  if (followingFetched && !followingList?.length) {
    return null;
  }

  return (
    <div className={`block overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <div className="flex flex-col">
        <h2 className="text-foreground">{t('Who I follow')}</h2>
      </div>
      {isFollowingLoading ? (
        <>
          <LoadingBlock className="my-1 h-12 w-full" />
          <LoadingBlock className="my-1 h-12 w-full" />
          <LoadingBlock className="my-1 h-12 w-full" />
        </>
      ) : null}
      {followingFetched && followingList
        ? followingList.map((odinId, index) => {
            return <IdentityTeaser key={index} odinId={odinId} size="sm" isBorderLess={true} />;
          })
        : null}
    </div>
  );
};

export default FollowingView;
