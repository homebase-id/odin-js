import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChannelDefinition, EmbeddedPost, PostContent } from '@homebase-id/js-lib/public';
import { OwnerActions } from './OwnerActions';
import { ApiType, DotYouClient, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { aclEqual } from '@homebase-id/js-lib/helpers';
import { AclSummary } from '../../../acl';
import { t } from '../../../helpers';
import { ActionGroupOptionProps, ActionGroup, ErrorNotification } from '../../../ui';
import { ChannelDefinitionVm, useManagePost, useManageSocialFeed } from '../../../hooks/socialFeed';
import { useDotYouClient } from '../../../hooks/auth/useDotYouClient';
import { useIsConnected } from '../../../hooks/connections/useIsConnected';
import { EditPostDialog } from '../../EditPostDialog/EditPostDialog';
import { Persons, UserX, Times, Flag, Block, Link, Trash, Lock, Pencil } from '../../../ui/Icons';
import { FEED_ROOT_PATH, HOME_ROOT_PATH } from '../../../constants';

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
  const isPostToMyCollaborativeChannel =
    authorOdinId !== (odinId || identity) && (odinId || identity) && authorOdinId;
  const isAuthor = authorOdinId === identity;

  const isConnected = useIsConnected(odinId).data;
  const channelLink = channel
    ? `${odinId ? new DotYouClient({ identity: odinId, api: ApiType.Guest }).getRoot() : ''}${HOME_ROOT_PATH}posts/${
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
          {isPostToMyCollaborativeChannel ? (
            <GroupChannelActions
              odinId={odinId}
              postFile={postFile}
              channel={channel}
              channelLink={channelLink}
            />
          ) : (!odinId && isOwner) || isAuthor ? (
            <Suspense>
              <OwnerActions postFile={postFile} channel={channel} />
            </Suspense>
          ) : odinId ? (
            <ExternalActions odinId={odinId} channel={channel} postFile={postFile} />
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
    ? `${odinId ? new DotYouClient({ identity: odinId, api: ApiType.Guest }).getRoot() : ''}${HOME_ROOT_PATH}posts/${
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
  channel,
  postFile,
}: {
  odinId: string;
  channel?:
    | HomebaseFile<ChannelDefinitionVm | ChannelDefinition>
    | NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition>;
  postFile: HomebaseFile<PostContent>;
}) => {
  const identity = useDotYouClient().getIdentity();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const {
    removeFromFeed: { mutateAsync: removeFromMyFeed },
    getReportContentUrl,
  } = useManageSocialFeed({ odinId });

  const host = new DotYouClient({ api: ApiType.Guest, identity: identity || undefined }).getRoot();
  const options: ActionGroupOptionProps[] = [
    {
      icon: UserX,
      label: `${t('Follow settings')}`,
      href: `${host}/owner/follow/following/${odinId}`,
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
      href: `${host}/owner/connections/${odinId}/block`,
    },
  ];

  // Only supported for posts that are marked as collaborative
  if (postFile.fileMetadata.appData.content.isCollaborative) {
    options.push({
      icon: Pencil,
      label: t(
        postFile.fileMetadata.appData.content.type === 'Article' ? 'Edit Article' : 'Edit post'
      ),
      onClick: (e) => {
        e.stopPropagation();
        if (postFile.fileMetadata.appData.content.type === 'Article') {
          const targetUrl = `/apps/feed/edit/${odinId || window.location.host}/${
            channel?.fileMetadata.appData.content.slug || channel?.fileMetadata.appData.uniqueId
          }/${postFile.fileMetadata.appData.content.id}`;

          if (window.location.host === odinId) {
            // Navigate to own identity
            window.location.href = `${host}${targetUrl}`;
          } else {
            if (window.location.pathname.startsWith(FEED_ROOT_PATH)) navigate(targetUrl);
            else window.location.href = targetUrl;
          }
        } else {
          setIsEditOpen(true);
        }
      },
    });
  }

  return (
    <>
      <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
        <ActionGroup className="" type="mute" size="none" options={options} />
      </div>

      {isEditOpen ? (
        <EditPostDialog
          postFile={postFile}
          odinId={odinId}
          isOpen={isEditOpen}
          onConfirm={() => setIsEditOpen(false)}
          onCancel={() => setIsEditOpen(false)}
        />
      ) : null}
    </>
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
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const identity = getIdentity();
  const isAuthor = postFile.fileMetadata.originalAuthor === identity;
  const host = new DotYouClient({ api: ApiType.Guest, identity: identity || undefined }).getRoot();

  const {
    removeFromFeed: { mutateAsync: removeFromMyFeed },
    getReportContentUrl,
  } = useManageSocialFeed(odinId ? { odinId } : undefined);

  const { mutateAsync: removePost, error: removePostError } = useManagePost().remove;

  const options: (ActionGroupOptionProps | undefined)[] = [];

  if (window.location.pathname.startsWith(FEED_ROOT_PATH)) {
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

    if (isAuthor) {
      options.push({
        icon: Pencil,
        label: t(
          postFile.fileMetadata.appData.content.type === 'Article' ? 'Edit Article' : 'Edit post'
        ),
        onClick: (e) => {
          e.stopPropagation();
          if (postFile.fileMetadata.appData.content.type === 'Article') {
            const targetUrl = `/apps/feed/${odinId || window.location.host}/${
              channel?.fileMetadata.appData.content.slug || channel?.fileMetadata.appData.uniqueId
            }/${postFile.fileMetadata.appData.content.id}`;

            if (window.location.host === odinId) {
              // Navigate to own identity
              window.location.href = `${host}${targetUrl}`;
            } else {
              if (window.location.pathname.startsWith(FEED_ROOT_PATH)) navigate(targetUrl);
              else window.location.href = targetUrl;
            }
          } else {
            setIsEditOpen(true);
          }
        },
      });
    } else {
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
      {isEditOpen ? (
        <EditPostDialog
          postFile={postFile}
          odinId={odinId}
          isOpen={isEditOpen}
          onConfirm={() => setIsEditOpen(false)}
          onCancel={() => setIsEditOpen(false)}
        />
      ) : null}
    </div>
  );
};
