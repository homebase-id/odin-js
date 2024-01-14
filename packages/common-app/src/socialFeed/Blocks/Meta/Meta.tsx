import { Suspense } from 'react';
import { ChannelDefinition, EmbeddedPost, PostContent } from '@youfoundation/js-lib/public';
import {
  AclSummary,
  ActionGroupOptionProps,
  Block,
  Flag,
  Lock,
  Times,
  useIsConnected,
  useManageSocialFeed,
} from '@youfoundation/common-app';

import {
  ChannelDefinitionVm,
  HOME_ROOT_PATH,
  t,
  useDotYouClient,
  ActionGroup,
  UserX,
} from '@youfoundation/common-app';
import { OwnerActions } from './OwnerActions';
import { DriveSearchResult, NewDriveSearchResult } from '@youfoundation/js-lib/core';
import { aclEqual } from '@youfoundation/js-lib/helpers';

interface PostMetaWithPostFileProps {
  odinId?: string;
  postFile: DriveSearchResult<PostContent>;
  embeddedPost?: undefined;
  channel?:
    | DriveSearchResult<ChannelDefinitionVm | ChannelDefinition>
    | NewDriveSearchResult<ChannelDefinitionVm | ChannelDefinition>;
  className?: string;
  size?: 'text-xs' | 'text-sm';
  excludeContextMenu?: boolean;
}

interface PostMetaWithEmbeddedPostContentProps {
  odinId?: string;
  postFile?: DriveSearchResult<PostContent>;
  embeddedPost: EmbeddedPost;
  channel?:
    | DriveSearchResult<ChannelDefinitionVm | ChannelDefinition>
    | NewDriveSearchResult<ChannelDefinitionVm | ChannelDefinition>;
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
  const date = new Date(postFile?.fileMetadata.appData.userDate || embeddedPost?.userDate || now);
  const yearsAgo = Math.abs(new Date(now.getTime() - date.getTime()).getUTCFullYear() - 1970);
  const format: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: yearsAgo !== 0 ? 'numeric' : undefined,
    hour: 'numeric',
    minute: 'numeric',
  };
  const identity = getIdentity();
  const isAuthor = odinId === identity;

  const isConnected = useIsConnected(odinId).data;
  const channelLink = channel
    ? `${odinId ? `https://${odinId}` : ''}${HOME_ROOT_PATH}posts/${
        channel.fileMetadata.appData.content.slug
      }${isConnected && identity ? '?youauth-logon=' + identity : ''}`
    : undefined;

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
          href={channelLink}
          onClick={(e) => e.stopPropagation()}
        >
          {postFile?.fileMetadata.isEncrypted ? <Lock className="h-3 w-3" /> : null}
          {isAuthor &&
          channel?.serverMetadata &&
          postFile?.serverMetadata &&
          !aclEqual(
            channel.serverMetadata.accessControlList,
            postFile.serverMetadata.accessControlList
          ) ? (
            <AclSummary acl={postFile.serverMetadata.accessControlList} />
          ) : (
            <>
              {channel?.fileMetadata.appData.content.name
                ? `${channel?.fileMetadata.appData.content.name}`
                : ''}
            </>
          )}
        </a>
      ) : null}

      {excludeContextMenu || !postFile ? null : (!odinId && isOwner) || isAuthor ? (
        <Suspense>
          <OwnerActions postFile={postFile} />
        </Suspense>
      ) : odinId ? (
        <ExternalActions odinId={odinId} postFile={postFile} />
      ) : null}
    </div>
  );
};

const ExternalActions = ({
  odinId,
  postFile,
}: {
  odinId: string;
  postFile: DriveSearchResult<PostContent>;
}) => {
  const identity = useDotYouClient().getIdentity();
  const {
    removeFromFeed: { mutateAsync: removeFromMyFeed },
    getReportContentUrl,
  } = useManageSocialFeed({ odinId });

  const options: ActionGroupOptionProps[] = [
    {
      icon: UserX,
      label: `${t('Follow settings')}`,
      href: `https://${identity}/owner/follow/following/${odinId}`,
    },
    {
      icon: Times,
      label: `${t('Remove this post from my feed')}`,
      onClick: () => {
        removeFromMyFeed({ postFile });
      },
    },
    {
      icon: Flag,
      label: `${t('Report')}`,
      onClick: async () => {
        const reportUrl = await getReportContentUrl();
        window.open(reportUrl, '_blank');
      },
    },
    {
      icon: Block,
      label: `${t('Block this user')}`,
      href: `https://${identity}/owner/connections/${odinId}/block`,
    },
  ];

  return (
    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
      <ActionGroup className="" type="mute" size="none" options={options} />
    </div>
  );
};
