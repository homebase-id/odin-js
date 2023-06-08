import { ConnectionTeaser, LoadingBlock, useFollowingInfinite } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';

const FollowingView = ({ className }: { className?: string }) => {
  const {
    data: following,
    isFetched: followingFetched,
    isLoading: isFollowingLoading,
  } = useFollowingInfinite({
    pageSize: 5,
  }).fetch;

  const followingList = following?.pages
    .flatMap((page) => page?.results)
    .filter(Boolean) as string[];

  if (followingFetched && !followingList?.length) {
    return null;
  }

  return (
    <div className={`block overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <div className="flex flex-row flex-wrap items-center">
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
            return (
              <ConnectionTeaser
                key={index}
                odinId={odinId}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                size="sm"
                isBorderLess={true}
              />
            );
          })
        : null}
    </div>
  );
};

export default FollowingView;
