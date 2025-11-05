import {
  POST_LINKS_PAYLOAD_KEY,
  RemoteCollaborativeChannelDefinition,
  PostContent,
  getChannelDrive,
  POST_FULL_TEXT_PAYLOAD_KEY,
} from '@homebase-id/js-lib/public';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useManagePost } from '../../hooks/socialFeed/post/useManagePost';
import {
  DEFAULT_PAYLOAD_KEY,
  HomebaseFile,
  MediaFile,
  NewMediaFile,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import { VolatileInput, FileOverview, AllContactMentionDropdown } from '../../form';
import { t } from '../../helpers';
import { useChannel, usePortal } from '../../hooks';
import { ErrorNotification, DialogWrapper, ActionButton } from '../../ui';
import { Save } from '../../ui/Icons';

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
  const { data: channel } = useChannel({
    odinId: odinId,
    channelKey: incomingPostFile.fileMetadata.appData.content.channelId,
  }).fetch;

  const [postFile, setPostFile] = useState<HomebaseFile<PostContent>>({ ...incomingPostFile });
  const [newMediaFiles, setNewMediaFiles] = useState<(MediaFile | NewMediaFile)[]>(
    postFile.fileMetadata.payloads?.filter(
      (p) =>
        p.key !== DEFAULT_PAYLOAD_KEY &&
        p.key !== POST_LINKS_PAYLOAD_KEY &&
        p.key !== POST_FULL_TEXT_PAYLOAD_KEY
    ) || []
  );

  useEffect(() => {
    if (incomingPostFile) {
      setPostFile({ ...incomingPostFile });
      const newMediaFiles = incomingPostFile.fileMetadata.payloads?.filter(
        (p) =>
          p.key !== DEFAULT_PAYLOAD_KEY &&
          p.key !== POST_LINKS_PAYLOAD_KEY &&
          p.key !== POST_FULL_TEXT_PAYLOAD_KEY
      );
      if (newMediaFiles) setNewMediaFiles(newMediaFiles);
    }
  }, [incomingPostFile]);

  useEffect(() => {
    if (updatePostStatus === 'success') onConfirm();
  }, [updatePostStatus]);

  if (!isOpen) return null;

  const doUpdate = async () => {
    const newPostFile = {
      ...postFile,
      serverMetadata: {
        accessControlList: (channel?.fileId &&
          (channel as unknown as HomebaseFile<RemoteCollaborativeChannelDefinition>).fileMetadata
            .appData.content.acl) ||
          channel?.serverMetadata?.accessControlList || {
            requiredSecurityGroup: SecurityGroupType.Connected,
          },
      },
    };

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
            className={`w-full resize-none rounded-md border bg-transparent p-2 relative`}
            autoCompleters={[AllContactMentionDropdown]}
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
