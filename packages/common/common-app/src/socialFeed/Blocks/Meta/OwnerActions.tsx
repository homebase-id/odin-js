import { ChannelDefinition, PostContent } from '@homebase-id/js-lib/public';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManagePost } from '../../../hooks/socialFeed/post/useManagePost';
import { ApiType, OdinClient, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { ErrorNotification } from '../../../ui/Alert/ErrorNotification';
import { ActionGroup, ActionGroupOptionProps } from '../../../ui/Buttons/ActionGroup';
import { Pencil } from '../../../ui/Icons/Pencil';
import { t } from '../../../helpers/i18n/dictionary';
import { Clipboard, Globe, Trash } from '../../../ui/Icons';
import { EditPostDialog } from '../../EditPostDialog/EditPostDialog';
import { useOdinClientContext } from '../../../hooks';
import { FEED_ROOT_PATH } from '../../../constants';

export const OwnerActions = ({
  odinId,
  postFile,
  channel,
}: {
  odinId?: string;
  authorOdinId?: string;
  postFile: HomebaseFile<PostContent>;
  channel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition> | undefined;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const postContent = postFile.fileMetadata.appData.content;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | unknown | undefined>(undefined);
  const { mutateAsync: removePost } = useManagePost().remove;
  const { mutateAsync: editPost } = useManagePost().update;

  const navigate = useNavigate();
  if (!loggedOnIdentity) return null;
  const host = new OdinClient({ api: ApiType.Guest, hostIdentity: loggedOnIdentity }).getRoot();

  return (
    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
      <ErrorNotification error={asyncError} />
      <ActionGroup
        className=""
        type="mute"
        size="none"
        options={[
          ...(postFile.fileId
            ? ([
                {
                  icon: Pencil,
                  label: t(postContent.type === 'Article' ? 'Edit Article' : 'Edit post'),
                  onClick: (e) => {
                    e.stopPropagation();
                    if (postContent.type === 'Article') {
                      const targetUrl = `/apps/feed/edit/${odinId || window.location.host}/${
                        channel?.fileMetadata.appData.content.slug ||
                        channel?.fileMetadata.appData.uniqueId
                      }/${postContent.id}`;

                      if (!odinId || window.location.host === odinId) {
                        // Navigate to own identity
                        window.location.href = `${host}${targetUrl}`;
                      } else {
                        if (window.location.pathname.startsWith(FEED_ROOT_PATH))
                          navigate(targetUrl);
                        else window.location.href = targetUrl;
                      }
                    } else {
                      setIsEditOpen(true);
                    }
                  },
                },
                postContent.type === 'Article'
                  ? {
                      icon: Clipboard,
                      label: t('Duplicate Article'),
                      href: `/apps/feed/duplicate/${
                        channel?.fileMetadata.appData.content.slug ||
                        channel?.fileMetadata.appData.uniqueId
                      }/${postContent.id}`,
                    }
                  : undefined,
                {
                  icon: Trash,
                  label: t(postContent.type === 'Article' ? 'Remove Article' : 'Remove post'),
                  confirmOptions: {
                    title: `${t('Remove')} "${
                      postContent.caption.substring(0, 50) || t('Untitled')
                    }"`,
                    buttonText: 'Permanently remove',
                    body: t(
                      'Are you sure you want to remove this post? This action cannot be undone.'
                    ),
                  },
                  onClick: async (e) => {
                    e.stopPropagation();
                    try {
                      await removePost({
                        channelId: postContent.channelId,
                        postFile,
                      });
                    } catch (error) {
                      setAsyncError(error);
                    }

                    return false;
                  },
                },
                channel?.fileMetadata.appData.content.isCollaborative &&
                !postFile.fileMetadata.appData.content.isCollaborative
                  ? {
                      icon: Globe,
                      label: t('Make collaborative'),
                      onClick: async (e) => {
                        e.stopPropagation();
                        try {
                          const collaborativePost = { ...postFile };
                          collaborativePost.fileMetadata.appData.content.isCollaborative = true;
                          await editPost({
                            postFile: collaborativePost,
                            channelId: postContent.channelId,
                          });
                        } catch (error) {
                          setAsyncError(error);
                        }
                        return false;
                      },
                    }
                  : undefined,
              ] as ActionGroupOptionProps[])
            : []),
        ]}
      />
      {isEditOpen ? (
        <EditPostDialog
          postFile={postFile}
          isOpen={isEditOpen}
          onConfirm={() => setIsEditOpen(false)}
          onCancel={() => setIsEditOpen(false)}
        />
      ) : null}
    </div>
  );
};
