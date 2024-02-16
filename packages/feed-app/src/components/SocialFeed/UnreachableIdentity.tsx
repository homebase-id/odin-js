import {
  ActionButton,
  ActionGroup,
  ActionLink,
  Times,
  UserX,
  t,
  useDotYouClient,
  useManageSocialFeed,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { PostContent } from '@youfoundation/js-lib/public';

interface UnreachableIdentityProps {
  className?: string;
  postFile: DriveSearchResult<PostContent>;
  odinId: string;
}

export const UnreachableIdentity = ({ className, postFile, odinId }: UnreachableIdentityProps) => {
  const identity = useDotYouClient().getIdentity();

  const {
    removeFromFeed: { mutateAsync: removeFromMyFeed },
  } = useManageSocialFeed({ odinId });

  return (
    <div
      className={`w-full break-words rounded-lg ${className ?? ''} relative flex h-full flex-col rounded-lg border-gray-200 border-opacity-60 px-3 py-3 dark:border-gray-800 sm:px-4 lg:border`}
    >
      <div className="flex flex-row justify-between">
        <div>
          {t('This content is no longer accessible')}.
          <span className="block text-sm text-slate-400">
            <a
              href={`https://${odinId}`}
              className="hover:underline"
              target="_blank"
              rel="nofollow noreferrer"
            >
              {odinId}
            </a>{' '}
            {t('cannot be reached at the moment.')}
          </span>
        </div>
        <ActionGroup
          className=""
          type="mute"
          size="none"
          options={[
            {
              icon: Times,
              label: `${t('Remove this post from my feed')}`,
              onClick: () => {
                removeFromMyFeed({ postFile });
              },
            },
            {
              icon: UserX,
              label: `${t('Unfollow')}`,
              href: `https://${identity}/owner/follow/following/${odinId}`,
            },
          ]}
        />
      </div>
    </div>
  );
};
