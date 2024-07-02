import { Suspense } from 'react';
import { ChannelDefinition, EmbeddedPost, PostContent } from '@youfoundation/js-lib/public';
import { OwnerActions } from './OwnerActions';
import { HomebaseFile, NewHomebaseFile } from '@youfoundation/js-lib/core';
import { aclEqual } from '@youfoundation/js-lib/helpers';
import { AclSummary } from '../../../acl';
import { HOME_ROOT_PATH } from '../../../core';
import { t } from '../../../helpers';
import {
  ActionGroupOptionProps,
  UserX,
  Times,
  Lock,
  Flag,
  Block,
  ActionGroup,
  Link,
  Persons,
  Trash,
  ErrorNotification,
} from '../../../ui';
import { ChannelDefinitionVm, useManagePost, useManageSocialFeed } from '../../../hooks/socialFeed';
import { useDotYouClient } from '../../../hooks/auth/useDotYouClient';
import { useIsConnected } from '../../../hooks/connections/useIsConnected';

interface PostMetaWithPostFileProps {
  odinId?: string;
  authorOdinId?: string;
  postFile: HomebaseFile<PostContent>;
  embeddedPost?: undefined;
  channel?:
    | HomebaseFile<ChannelDefinitionVm | ChannelDefinition>
    | NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition>;
  className?: string;
  size?: 'text-xs' | 'text-sm';
  excludeContextMenu?: boolean;
}

interface PostMetaWithEmbeddedPostContentProps {
  odinId?: string;
  authorOdinId?: string;
  postFile?: HomebaseFile<PostContent>;
  embeddedPost: EmbeddedPost;
  channel?:
    | HomebaseFile<ChannelDefinitionVm | ChannelDefinition>
    | NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition>;
  className?: string;
  size?: 'text-xs' | 'text-sm';
  excludeContextMenu?: boolean;
}

export const PostMeta = ({
  odinId,
  authorOdinId,
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
  const groupPost = authorOdinId !== (odinId || identity) && (odinId || identity) && authorOdinId;
  const isAuthor = authorOdinId === identity;

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
          {(isAuthor || (!odinId && isOwner)) &&
          channel?.serverMetadata &&
          postFile?.serverMetadata &&
          !aclEqual(
            channel.serverMetadata.accessControlList,
            postFile.serverMetadata.accessControlList
          ) ? (
            <AclSummary acl={postFile.serverMetadata.accessControlList} />
          ) : (
            <>{channel?.fileMetadata.appData.content.name || ''}</>
          )}
        </a>
      ) : null}

      {excludeContextMenu || !postFile ? null : (
        <>
          {groupPost ? (
            <GroupChannelActions
              odinId={odinId}
              postFile={postFile}
              channel={channel}
              channelLink={channelLink}
            />
          ) : (!odinId && isOwner) || isAuthor ? (
            <Suspense>
              <OwnerActions postFile={postFile} />
            </Suspense>
          ) : odinId ? (
            <ExternalActions odinId={odinId} postFile={postFile} />
          ) : null}
        </>
      )}
    </div>
  );
};

export const ToGroupBlock = ({
  odinId,
  authorOdinId,
  channel,
  className,
}: {
  odinId?: string;
  authorOdinId?: string;
  channel?:
    | HomebaseFile<ChannelDefinitionVm | ChannelDefinition>
    | NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition>;
  className?: string;
}) => {
  const { getIdentity } = useDotYouClient();

  const identity = getIdentity();
  const groupPost =
    channel?.fileMetadata.appData.content.isCollaborative ||
    (authorOdinId !== (odinId || identity) && (odinId || identity) && authorOdinId);
  const isConnected = useIsConnected(odinId).data;

  if (!groupPost) return null;

  const channelLink = channel
    ? `${odinId ? `https://${odinId}` : ''}${HOME_ROOT_PATH}posts/${
        channel.fileMetadata.appData.content.slug
      }${isConnected && identity ? '?youauth-logon=' + identity : ''}`
    : undefined;

  return (
    <span className={className}>
      {t('to')}{' '}
      <a
        className="text-indigo-500 hover:underline inline-flex items-center flex-row gap-1"
        href={channelLink}
        onClick={(e) => e.stopPropagation()}
      >
        {channel?.fileMetadata.appData.content.name
          ? `${channel?.fileMetadata.appData.content.name}`
          : ''}
        <Persons className="h-3 w-3" />
      </a>
    </span>
  );
};

const ExternalActions = ({
  odinId,
  postFile,
}: {
  odinId: string;
  postFile: HomebaseFile<PostContent>;
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

const GroupChannelActions = ({
  odinId,
  channelLink,
  channel,
  postFile,
}: {
  odinId?: string;
  channelLink?: string;
  channel?:
    | HomebaseFile<ChannelDefinitionVm | ChannelDefinition>
    | NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition>;
  postFile: HomebaseFile<PostContent>;
}) => {
  const { getIdentity } = useDotYouClient();

  const identity = getIdentity();
  const isAuthor = postFile.fileMetadata.appData.content.authorOdinId === identity;

  const {
    removeFromFeed: { mutateAsync: removeFromMyFeed },
    getReportContentUrl,
  } = useManageSocialFeed(odinId ? { odinId } : undefined);

  const { mutateAsync: removePost, error: removePostError } = useManagePost().remove;

  const options: (ActionGroupOptionProps | undefined)[] = [];

  if (window.location.pathname.startsWith('/apps/feed')) {
    if (channelLink)
      options.push({
        icon: Link,
        label: `${t('Go to collaborative channel')}`,
        href: channelLink,
      });

    options.push({
      icon: Times,
      label: `${t('Remove this post from my feed')}`,
      onClick: () => {
        removeFromMyFeed({ postFile });
      },
    });

    if (!isAuthor) {
      options.push({
        icon: Flag,
        label: `${t('Report')}`,
        onClick: async () => {
          const reportUrl = await getReportContentUrl();
          window.open(reportUrl, '_blank');
        },
      });
    }
  }

  // If the channel has serverMetadata, it is a collaborative channel from this identity so we can remove the post
  if (channel && channel.serverMetadata) {
    options.push({
      icon: Trash,
      label: t(
        postFile.fileMetadata.appData.content.type === 'Article' ? 'Remove Article' : 'Remove post'
      ),
      confirmOptions: {
        title: `${t('Remove')} "${
          postFile.fileMetadata.appData.content.caption.substring(0, 50) || t('Untitled')
        }"`,
        buttonText: 'Permanently remove',
        body: t('Are you sure you want to remove this post? This action cannot be undone.'),
      },
      onClick: async (e) => {
        e.stopPropagation();
        await removePost({
          channelId: postFile.fileMetadata.appData.content.channelId,
          postFile,
        });

        return false;
      },
    });
  }

  return (
    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
      <ErrorNotification error={removePostError} />
      <ActionGroup className="" type="mute" size="none" options={options} />
    </div>
  );
};
