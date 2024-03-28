import { ActionLink, Feed, t, useIdentityIFollow } from '@youfoundation/common-app';

const FollowHomebase = ({ className }: { className?: string }) => {
  const { data: followingData, isFetched } = useIdentityIFollow({
    odinId: 'id.homebase.id',
  }).fetch;

  const alreadyFollowingThis = !!followingData;
  if (!isFetched || alreadyFollowingThis) return null;

  return (
    <div className={`block overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground">{t('Stay up to date on Homebase')}</h2>
        <div className="flex flex-row">
          <ActionLink
            className={`mr-auto w-auto `}
            href={`/owner/follow/following/id.homebase.id`}
            icon={Feed}
            type={'primary'}
          >
            <span className="flex flex-col leading-tight">{t('Follow Homebase')}</span>
          </ActionLink>
        </div>
      </div>
    </div>
  );
};

export default FollowHomebase;
