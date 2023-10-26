import { Suspense } from 'react';
import {
  ChannelDefinition,
  EmbeddedPost,
  PostContent,
  PostFile,
} from '@youfoundation/js-lib/public';
import { ActionGroupOptionProps, Lock } from '@youfoundation/common-app';

import {
  ChannelDefinitionVm,
  HOME_ROOT_PATH,
  t,
  useDotYouClient,
  ActionGroup,
  UserX,
} from '@youfoundation/common-app';
import { OwnerActions } from './OwnerActions';

interface PostMetaWithPostFileProps {
  odinId?: string;
  postFile: PostFile<PostContent>;
  embeddedPost?: undefined;
  channel?: ChannelDefinitionVm | ChannelDefinition;
  className?: string;
  size?: 'text-xs' | 'text-sm';
  excludeContextMenu?: boolean;
}

interface PostMetaWithEmbeddedPostContentProps {
  odinId?: string;
  postFile?: PostFile<PostContent>;
  embeddedPost: EmbeddedPost;
  channel?: ChannelDefinitionVm | ChannelDefinition;
  className?: string;
  size?: 'text-xs' | 'text-sm';
  excludeContextMenu?: boolean;
}

export const PostMeta = ({
  odinId,
  postFile,
  embeddedPost,
  channel,
  className,
  size = 'text-xs',
  excludeContextMenu,
}: PostMetaWithPostFileProps | PostMetaWithEmbeddedPostContentProps) => {
  const { isOwner, getIdentity } = useDotYouClient();
  const now = new Date();
  const date = new Date(postFile?.userDate || embeddedPost?.userDate || now);
  const yearsAgo = Math.abs(new Date(now.getTime() - date.getTime()).getUTCFullYear() - 1970);
  const format: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: yearsAgo !== 0 ? 'numeric' : undefined,
    hour: 'numeric',
    minute: 'numeric',
  };
  const isAuthor = odinId === getIdentity();

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

      {excludeContextMenu || !postFile ? null : (!odinId && isOwner) || isAuthor ? (
        <Suspense>
          <OwnerActions postFile={postFile} />
        </Suspense>
      ) : odinId ? (
        <ExternalActions odinId={odinId} />
      ) : null}
    </div>
  );
};

const ExternalActions = ({ odinId }: { odinId: string }) => {
  const identity = useDotYouClient().getIdentity();

  const options: ActionGroupOptionProps[] = [
    {
      icon: UserX,
      label: `${t('Edit what I follow from')} "${odinId}"`,
      href: `https://${identity}/owner/follow/following/${odinId}`,
    },
  ];

  return (
    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
      <ActionGroup className="" type="mute" size="none" options={options} />
    </div>
  );
};
