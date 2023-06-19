import { ChannelDefinition, PostContent, PostFile } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, useDotYouClient } from '@youfoundation/common-app';
import { useChannel } from '@youfoundation/common-app';
import { ChannelDefinitionVm } from '@youfoundation/common-app';
import { ErrorNotification, ActionGroup, ActionGroupOptionProps } from '@youfoundation/common-app';
import { Pencil } from '@youfoundation/common-app';
import { Times } from '@youfoundation/common-app';
import { Trash } from '@youfoundation/common-app';
import { UserX, EditPostDialog } from '@youfoundation/common-app';
import usePost from '../../../hooks/socialFeed/post/usePost';

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
          className="text-primary ml-1 border-l pl-1 hover:underline dark:border-slate-500"
          href={`${odinId ? `https://${odinId}` : ''}/home/posts/${channel.slug}`}
          onClick={(e) => e.stopPropagation()}
        >
          {channel?.name ? `${channel?.name}` : ''}
        </a>
      ) : null}

      {/* There is only a odinId when on the feed and displaying external data */}
      {excludeContextMenu || !postFile ? null : isOwner &&
        (!odinId || odinId === window.location.hostname) ? (
        <OwnerActions postFile={postFile} />
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

const OwnerActions = ({ postFile }: { postFile: PostFile<PostContent> }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { mutateAsync: removePost, error: removePostError } = usePost().remove;
  const { data: channel } = useChannel({ channelId: postFile.content.channelId }).fetch;

  const navigate = useNavigate();
  return (
    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
      <ErrorNotification error={removePostError} />
      <ActionGroup
        className=""
        type="mute"
        size="small"
        options={[
          {
            icon: Pencil,
            label: t(postFile.content.type === 'Article' ? 'Edit Article' : 'Edit post'),
            onClick: (e) => {
              e.stopPropagation();
              if (postFile.content.type === 'Article') {
                const targetUrl = `/owner/feed/edit/${channel?.slug}/${postFile.content.id}`;
                if (window.location.pathname.startsWith('/owner')) navigate(targetUrl);
                else window.location.href = targetUrl;
              } else {
                setIsEditOpen(true);
              }
            },
          },
          ...(postFile.fileId
            ? ([
                {
                  icon: Trash,
                  label: 'Remove post',
                  confirmOptions: {
                    title: `${t('Remove')} "${
                      postFile.content.caption.substring(0, 50) || t('Untitled')
                    }"`,
                    buttonText: 'Permanently remove',
                    body: t(
                      'Are you sure you want to remove this post? This action cannot be undone.'
                    ),
                  },
                  onClick: async (e) => {
                    e.stopPropagation();
                    await removePost({
                      channelId: postFile.content.channelId,
                      fileId: postFile.fileId ?? '',
                      slug: postFile.content.slug,
                    });

                    setTimeout(() => {
                      window.location.reload();
                    }, 200);

                    return false;
                  },
                },
              ] as ActionGroupOptionProps[])
            : []),
        ]}
      />
      <EditPostDialog
        postFile={postFile}
        isOpen={isEditOpen}
        onConfirm={() => setIsEditOpen(false)}
        onCancel={() => setIsEditOpen(false)}
      />
    </div>
  );
};
