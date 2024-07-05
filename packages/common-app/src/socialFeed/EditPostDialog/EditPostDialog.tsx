import { PostContent, getChannelDrive } from '@youfoundation/js-lib/public';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useManagePost } from '../../hooks/socialFeed/post/useManagePost';
import {
  DEFAULT_PAYLOAD_KEY,
  HomebaseFile,
  MediaFile,
  NewMediaFile,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { VolatileInput, FileOverview } from '../../form';
import { t } from '../../helpers';
import { usePortal } from '../../hooks';
import { ErrorNotification, DialogWrapper, ActionButton, Save } from '../../ui';

export const EditPostDialog = ({
  postFile: incomingPostFile,
  odinId,
  isOpen,
  onConfirm,
  onCancel,
}: {
  postFile: HomebaseFile<PostContent>;
  odinId?: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    update: { mutate: updatePost, error: updatePostError, status: updatePostStatus },
  } = useManagePost();
  const [postFile, setPostFile] = useState<HomebaseFile<PostContent>>({ ...incomingPostFile });
  const [newMediaFiles, setNewMediaFiles] = useState<(MediaFile | NewMediaFile)[]>(
    postFile.fileMetadata.payloads?.filter((p) => p.key !== DEFAULT_PAYLOAD_KEY) || []
  );

  useEffect(() => {
    if (incomingPostFile) {
      setPostFile({ ...incomingPostFile });
      setNewMediaFiles(
        incomingPostFile.fileMetadata.payloads?.filter((p) => p.key !== DEFAULT_PAYLOAD_KEY)
      );
    }
  }, [incomingPostFile]);

  useEffect(() => {
    if (updatePostStatus === 'success') onConfirm();
  }, [updatePostStatus]);

  if (!isOpen) return null;

  const doUpdate = async () => {
    const newPostFile = {
      ...postFile,
      serverMetadata: postFile.serverMetadata || {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    console.log('doUpdate', {
      channelId: incomingPostFile.fileMetadata.appData.content.channelId,
      odinId,
      postFile: newPostFile,
      mediaFiles: newMediaFiles,
    });
    await updatePost({
      channelId: incomingPostFile.fileMetadata.appData.content.channelId,
      odinId,
      postFile: newPostFile,
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
          <FileOverview
            className="mt-2"
            files={newMediaFiles?.map((file) => ({
              ...file,
              fileId: (file as MediaFile).fileId || postFile.fileId,
            }))}
            targetDrive={getChannelDrive(postFile.fileMetadata.appData.content.channelId)}
            setFiles={setNewMediaFiles}
            cols={4}
          />
          <div className="gap-2 mt-3 flex flex-col sm:flex-row-reverse ">
            <ActionButton
              className={`${
                postFile.fileMetadata.appData.content.caption?.length || newMediaFiles.length
                  ? ''
                  : 'pointer-events-none opacity-20 grayscale'
              }`}
              icon={Save}
              state={updatePostStatus}
            >
              {t('Save')}
            </ActionButton>
            <ActionButton
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
