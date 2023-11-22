import { PostContent, getChannelDrive, Media, MediaFile } from '@youfoundation/js-lib/public';
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
import { DriveSearchResult } from '@youfoundation/js-lib/core';

export const EditPostDialog = ({
  postFile: incomingPostFile,
  isOpen,
  onConfirm,
  onCancel,
}: {
  postFile: DriveSearchResult<PostContent>;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    update: { mutate: updatePost, error: updatePostError, status: updatePostStatus },
  } = usePost();
  const [postFile, setPostFile] = useState<DriveSearchResult<PostContent>>({ ...incomingPostFile });
  const [newMediaFiles, setNewMediaFiles] = useState<MediaFile[]>(
    (postFile.fileMetadata.appData.content as Media).mediaFiles?.length
      ? ((postFile.fileMetadata.appData.content as Media).mediaFiles as MediaFile[])
      : postFile.fileMetadata.appData.content.primaryMediaFile
      ? [postFile.fileMetadata.appData.content.primaryMediaFile]
      : []
  );

  useEffect(() => {
    if (incomingPostFile) {
      setPostFile({ ...incomingPostFile });
      setNewMediaFiles(
        (incomingPostFile.fileMetadata.appData.content as Media).mediaFiles?.length
          ? ((incomingPostFile.fileMetadata.appData.content as Media).mediaFiles as MediaFile[])
          : incomingPostFile.fileMetadata.appData.content.primaryMediaFile
          ? [incomingPostFile.fileMetadata.appData.content.primaryMediaFile]
          : []
      );
    }
  }, [incomingPostFile]);

  useEffect(() => {
    if (updatePostStatus === 'success') onConfirm();
  }, [updatePostStatus]);

  if (!isOpen) return null;

  const doUpdate = async () => {
    const newPostFile = { ...postFile };

    await updatePost({
      channelId: incomingPostFile.fileMetadata.appData.content.channelId,
      postFile: { ...newPostFile },
      mediaFiles: newMediaFiles,
    });
  };

  if (!postFile?.fileId) return null;

  const dialog = (
    <>
      <ErrorNotification error={updatePostError} />
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

            return false;
          }}
        >
          <VolatileInput
            defaultValue={postFile.fileMetadata.appData.content.caption}
            onChange={(newCaption) => {
              const dirtyPostFile = { ...postFile };
              dirtyPostFile.fileMetadata.appData.content.caption = newCaption;
              setPostFile(dirtyPostFile);
            }}
            placeholder={t("What's up?")}
            className={`w-full resize-none rounded-md border bg-transparent p-2`}
          />
          <ExistingFileOverview
            className="mt-2"
            fileId={postFile.fileId}
            mediaFiles={newMediaFiles}
            targetDrive={getChannelDrive(postFile.fileMetadata.appData.content.channelId)}
            setMediaFiles={setNewMediaFiles}
          />
          <div className="-m-2 mt-3 flex flex-row-reverse items-center md:flex-nowrap">
            <ActionButton
              className={`m-2 ${
                postFile.fileMetadata.appData.content.caption?.length
                  ? ''
                  : 'pointer-events-none opacity-20 grayscale'
              }`}
              icon={Save}
              state={updatePostStatus}
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
