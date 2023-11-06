import {
  PostContent,
  PostFile,
  getChannelDrive,
  Media,
  MediaFile,
} from '@youfoundation/js-lib/public';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ExistingFileOverview,
  Save,
  VolatileInput,
  t,
} from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';

import { ErrorNotification } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { usePost } from '../../hooks/socialFeed/post/usePost';

export const EditPostDialog = ({
  postFile: incomingPostFile,
  isOpen,
  onConfirm,
  onCancel,
}: {
  postFile: PostFile<PostContent>;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    save: { mutateAsync: savePost, error: savePostError, status: savePostStatus },
    // removeFiles: { mutateAsync: removeFiles },
  } = usePost();
  const [postFile, setPostFile] = useState<PostFile<PostContent>>({ ...incomingPostFile });
  const [toRemoveFiles, setToRemoveFiles] = useState<MediaFile[]>([]);

  useEffect(() => {
    if (incomingPostFile) {
      setPostFile({ ...incomingPostFile });
    }
  }, [incomingPostFile]);

  if (!isOpen) {
    return null;
  }

  const doUpdate = async () => {
    const newPostFile = { ...postFile };

    if (toRemoveFiles?.length) {
      // TODO: Remove files
      console.log('toRemoveFiles', toRemoveFiles);
      // // Update mediaFiles to remove the refs of those that are set to be removed
      // (newPostFile.content as Media).mediaFiles = (newPostFile.content as Media).mediaFiles?.filter(
      //   (file) => !toRemoveFiles.some((toRemove) => toRemove === file.fileId)
      // );

      // // Set first fileId as primary if primary is set to be removed
      // if (
      //   toRemoveFiles.some(
      //     (toRemove) => toRemove === newPostFile.content.primaryMediaFile?.fileId
      //   )
      // ) {
      //   newPostFile.content.primaryMediaFile = (newPostFile.content as Media).mediaFiles?.[0];
      // }

      // await removeFiles({ files: toRemoveFiles, channelId: incomingPostFile.content.channelId });
    }

    await savePost({
      channelId: incomingPostFile.content.channelId,
      postFile: { ...newPostFile },
    });
  };

  const dialog = (
    <>
      <ErrorNotification error={savePostError} />
      <DialogWrapper
        title={<div className="flex flex-row items-center">{t('Edit Post')}</div>}
        onClose={onCancel}
        keepOpenOnBlur={true}
        isSidePanel={true}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await doUpdate();

            onConfirm();
            return false;
          }}
        >
          <VolatileInput
            defaultValue={postFile.content.caption}
            onChange={(newCaption) =>
              setPostFile({
                ...postFile,
                content: { ...postFile.content, caption: newCaption },
              })
            }
            placeholder={t("What's up?")}
            className={`w-full resize-none rounded-md border bg-transparent p-2`}
          />
          <ExistingFileOverview
            className="mt-2"
            mediaFiles={
              (postFile.content as Media).mediaFiles?.length
                ? (postFile.content as Media).mediaFiles
                : postFile.content.primaryMediaFile
                ? [postFile.content.primaryMediaFile]
                : []
            }
            targetDrive={getChannelDrive(postFile.content.channelId)}
            toRemoveFiles={toRemoveFiles}
            setToRemoveFiles={setToRemoveFiles}
          />
          <div className="-m-2 mt-3 flex flex-row-reverse items-center md:flex-nowrap">
            <ActionButton
              className={`m-2 ${
                postFile.content.caption?.length ? '' : 'pointer-events-none opacity-20 grayscale'
              }`}
              icon={Save}
              state={savePostStatus}
            >
              {t('Save')}
            </ActionButton>
            <ActionButton
              className={`m-2`}
              type="secondary"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onCancel();
              }}
            >
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </DialogWrapper>
    </>
  );

  return createPortal(dialog, target);
};
