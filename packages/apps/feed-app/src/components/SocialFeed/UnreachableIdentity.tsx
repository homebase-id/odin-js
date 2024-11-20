import { ActionGroup, t, useDotYouClient, useManageSocialFeed } from '@homebase-id/common-app';
import { Times, UserX } from '@homebase-id/common-app/icons';
import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import { PostContent } from '@homebase-id/js-lib/public';

interface UnreachableIdentityProps {
  className?: string;
  postFile: HomebaseFile<PostContent>;
  odinId: string;
}

export const UnreachableIdentity = ({ className, postFile, odinId }: UnreachableIdentityProps) => {
  const host = useDotYouClient().getDotYouClient().getRoot;

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
              href={new DotYouClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot()}
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
              href: `${host}/owner/follow/following/${odinId}`,
            },
          ]}
        />
      </div>
    </div>
  );
};
