import { ChannelDefinition, PostContent } from '@homebase-id/js-lib/public';
import { useState } from 'react';
import { useManagePost } from '../../../hooks/socialFeed/post/useManagePost';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { ErrorNotification } from '../../../ui/Alert/ErrorNotification';
import { ActionGroup, ActionGroupOptionProps } from '../../../ui/Buttons/ActionGroup';
import { Pencil } from '../../../ui/Icons/Pencil';
import { t } from '../../../helpers/i18n/dictionary';
import { Globe, Trash } from '../../../ui/Icons';
import { EditPostDialog } from '../../EditPostDialog/EditPostDialog';
import { useDotYouClientContext } from '../../../hooks';

export const OwnerActions = ({
  postFile,
  channel,
}: {
  postFile: HomebaseFile<PostContent>;
  channel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition> | undefined;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const postContent = postFile.fileMetadata.appData.content;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | unknown | undefined>(undefined);
  const { mutateAsync: removePost } = useManagePost().remove;
  const { mutateAsync: editPost } = useManagePost().update;

  if (!loggedOnIdentity) return null;

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
                postContent.type !== 'Article'
                  ? {
                      icon: Pencil,
                      label: t('Edit post'), // this is edit post of my item on my feed
                      onClick: (e) => {
                        e.stopPropagation();
                        setIsEditOpen(true);
                      },
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
