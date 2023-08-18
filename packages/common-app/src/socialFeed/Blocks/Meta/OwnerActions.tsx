import { PostContent, PostFile } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
import { useChannel } from '@youfoundation/common-app';
import usePost from '../../../hooks/socialFeed/post/usePost';
import { ErrorNotification, ActionGroup, ActionGroupOptionProps } from '@youfoundation/common-app';
import { Pencil } from '@youfoundation/common-app';
import { Trash } from '@youfoundation/common-app';
import { EditPostDialog } from '@youfoundation/common-app';

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
                  label: t(postFile.content.type === 'Article' ? 'Remove Article' : 'Remove post'),
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

export default OwnerActions;
