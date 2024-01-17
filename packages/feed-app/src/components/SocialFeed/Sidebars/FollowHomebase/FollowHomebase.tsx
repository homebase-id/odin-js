import { ActionLink, Check, Feed, t, useIdentityIFollow } from '@youfoundation/common-app';

const FollowHomebase = ({ className }: { className?: string }) => {
  const { data: followingData, isFetched } = useIdentityIFollow({
    odinId: 'id.homebase.id',
  }).fetch;

  if (!isFetched) return null;

  const alreadyFollowingThis = !!followingData;

  return (
    <div className={`block overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground">{t('Stay up to date on Homebase')}</h2>
        <div className="flex flex-row">
          <ActionLink
            className={`mr-auto w-auto `}
            href={`/owner/follow/following/id.homebase.id`}
            icon={alreadyFollowingThis ? Check : Feed}
            type={alreadyFollowingThis ? 'secondary' : 'primary'}
          >
            <span className="flex flex-col leading-tight">
              {alreadyFollowingThis ? t('Following') : t('Follow Homebase')}
            </span>
          </ActionLink>
        </div>
      </div>
    </div>
  );
};

export default FollowHomebase;
