import { PostContent } from '@homebase-id/js-lib/public';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManagePost } from '../../../hooks/socialFeed/post/useManagePost';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ErrorNotification } from '../../../ui/Alert/ErrorNotification';
import { ActionGroup, ActionGroupOptionProps } from '../../../ui/Buttons/ActionGroup';
import { Pencil } from '../../../ui/Icons/Pencil';
import { t } from '../../../helpers/i18n/dictionary';
import { Clipboard, Trash } from '../../../ui/Icons';
import { EditPostDialog } from '../../EditPostDialog/EditPostDialog';
import { useChannel } from '../../../hooks/socialFeed/channels/useChannel';

export const OwnerActions = ({ postFile }: { postFile: HomebaseFile<PostContent> }) => {
  const postContent = postFile.fileMetadata.appData.content;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const { mutateAsync: removePost, error: removePostError } = useManagePost().remove;
  const { data: channel } = useChannel({ channelId: postContent.channelId }).fetch;

  const navigate = useNavigate();
  return (
    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
      <ErrorNotification error={removePostError} />
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
                      const targetUrl = `/apps/feed/edit/${
                        channel?.fileMetadata.appData.content.slug ||
                        channel?.fileMetadata.appData.uniqueId
                      }/${postContent.id}`;
                      if (window.location.pathname.startsWith('/owner')) navigate(targetUrl);
                      else window.location.href = targetUrl;
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
                    await removePost({
                      channelId: postContent.channelId,
                      postFile,
                    });

                    return false;
                  },
                },
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
