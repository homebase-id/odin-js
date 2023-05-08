import { LoadingParagraph } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import useFollowerInfinite from '../../../../hooks/follow/useFollowers';
import ConnectionTeaser from '../../../../templates/Home/Common/Connections/ConnectionTeaser';

const FollowersView = ({ className }: { className?: string }) => {
  const {
    data: followers,
    isFetched: followersFetched,
    isLoading: isFollowersLoading,
  } = useFollowerInfinite({
    pageSize: 5,
  });

  const followersList = followers?.pages
    .flatMap((page) => page?.results)
    .filter(Boolean) as string[];

  if (followersFetched && !followersList?.length) {
    return null;
  }

  return (
    <div className={`block overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <div className="flex flex-row flex-wrap items-center">
        <h2 className="text-foreground">{t('People that follow me')}</h2>
      </div>
      {isFollowersLoading ? (
        <>
          <LoadingParagraph className="my-1 h-12 w-full" />
          <LoadingParagraph className="my-1 h-12 w-full" />
          <LoadingParagraph className="my-1 h-12 w-full" />
        </>
      ) : null}
      {followersFetched && followersList
        ? followersList.map((odinId, index) => {
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

export default FollowersView;
