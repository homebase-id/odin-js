import { Suspense, lazy } from 'react';
import { ChannelDefinition, PostContent, PostFile } from '@youfoundation/js-lib/public';
import { Lock } from '@youfoundation/common-app';

import {
  ChannelDefinitionVm,
  HOME_ROOT_PATH,
  t,
  useChannel,
  useDotYouClient,
  ActionGroup,
  Times,
  UserX,
} from '@youfoundation/common-app';
const OwnerActions = lazy(() => import('./OwnerActions'));

interface PostMetaWithPostFileProps {
  odinId?: string;
  postFile: PostFile<PostContent>;
  postContent?: PostContent;
  channel?: ChannelDefinitionVm | ChannelDefinition;
  className?: string;
  size?: 'text-xs' | 'text-sm';
  excludeContextMenu?: boolean;
}

interface PostMetaWithPostContentProps {
  odinId?: string;
  postFile?: PostFile<PostContent>;
  postContent: PostContent;
  channel?: ChannelDefinitionVm | ChannelDefinition;
  className?: string;
  size?: 'text-xs' | 'text-sm';
  excludeContextMenu?: boolean;
}

export const PostMeta = ({
  odinId,
  postFile,
  postContent,
  channel,
  className,
  size = 'text-xs',
  excludeContextMenu,
}: PostMetaWithPostFileProps | PostMetaWithPostContentProps) => {
  const { isOwner } = useDotYouClient();
  const now = new Date();
  const date = new Date(postFile?.content.dateUnixTime || postContent?.dateUnixTime || now);
  const yearsAgo = Math.abs(new Date(now.getTime() - date.getTime()).getUTCFullYear() - 1970);
  const format: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: yearsAgo !== 0 ? 'numeric' : undefined,
    hour: 'numeric',
    minute: 'numeric',
  };

  return (
    <div
      className={`flex flex-grow flex-row flex-wrap items-center ${size} font-medium ${
        className ?? ''
      }`}
    >
      <span>{date.toLocaleDateString(undefined, format)}</span>
      {channel ? (
        <a
          className="text-primary ml-1 flex flex-row items-center gap-1 border-l pl-1 hover:underline dark:border-slate-500"
          href={`${odinId ? `https://${odinId}` : ''}${HOME_ROOT_PATH}posts/${channel.slug}`}
          onClick={(e) => e.stopPropagation()}
        >
          {postFile?.payloadIsEncrypted ? <Lock className="h-3 w-3" /> : null}
          {channel?.name ? `${channel?.name}` : ''}
        </a>
      ) : null}

      {/* There is only a odinId when on the feed and displaying external data */}
      {excludeContextMenu || !postFile ? null : isOwner &&
        (!odinId || odinId === window.location.hostname) ? (
        <Suspense>
          <OwnerActions postFile={postFile} />
        </Suspense>
      ) : odinId ? (
        <ExternalActions postFile={postFile} odinId={odinId} />
      ) : null}
    </div>
  );
};

const ExternalActions = ({
  odinId,
  postFile,
}: {
  odinId: string;
  postFile: PostFile<PostContent>;
}) => {
  const { data: channel } = useChannel({ channelId: postFile.content.channelId }).fetch;

  return (
    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
      <ActionGroup
        className=""
        type="mute"
        size="none"
        options={[
          {
            icon: Times,
            label: `${t('Unfollow')} "${channel?.name}"`,
            onClick: (e) => {
              e.stopPropagation();
              // TODO
            },
            confirmOptions: {
              title: `${t('Unfollow')} "${channel?.name}"`,
              body: `${t('Are you sure you want to unfollow')} "${channel?.name}" ${t(
                'from'
              )} "${odinId}"`,
              buttonText: t('Unfollow'),
            },
          },
          {
            icon: UserX,
            label: `${t('Unfollow')} "${odinId}"`,
            onClick: (e) => {
              e.stopPropagation();
              // TODO
            },
            confirmOptions: {
              title: `${t('Unfollow')} "${odinId}"`,
              body: `${t('Are you sure you want to unfollow')} "${odinId}"`,
              buttonText: t('Unfollow'),
            },
          },
        ]}
      />
    </div>
  );
};
