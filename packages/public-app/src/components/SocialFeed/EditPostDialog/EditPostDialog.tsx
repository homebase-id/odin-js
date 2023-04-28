import {
  PostContent,
  PostFile,
  TargetDrive,
  getChannelDrive,
  Media,
  MediaFile,
} from '@youfoundation/js-lib';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePortal from '../../../hooks/portal/usePortal';
import usePost from '../../../hooks/socialFeed/post/usePost';
import Image from '../../Image/Image';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../../ui/Buttons/ActionButton';
import Button from '../../ui/Buttons/ActionButton';
import { DialogWrapper } from '@youfoundation/common-app';

const EditPostDialog = ({
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
    removeFiles: { mutateAsync: removeFiles },
  } = usePost();
  const [postFile, setPostFile] = useState<PostFile<PostContent>>({ ...incomingPostFile });
  const [toRemoveFileIds, setToRemoveFileIds] = useState<string[]>([]);

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

    if (toRemoveFileIds?.length) {
      // Update mediaFiles to remove the refs of those that are set to be removed
      (newPostFile.content as Media).mediaFiles = (newPostFile.content as Media).mediaFiles?.filter(
        (file) => !toRemoveFileIds.some((toRemove) => toRemove === file.fileId)
      );

      // Set first fileId as primary if primary is set to be removed
      if (
        toRemoveFileIds.some(
          (toRemove) => toRemove === newPostFile.content.primaryMediaFile?.fileId
        )
      ) {
        newPostFile.content.primaryMediaFile = (newPostFile.content as Media).mediaFiles?.[0];
      }

      await removeFiles({ files: toRemoveFileIds, channelId: incomingPostFile.content.channelId });
    }

    await savePost({
      channelId: incomingPostFile.content.channelId,
      blogFile: { ...newPostFile },
    });
  };

  const dialog = (
    <>
      <ErrorNotification error={savePostError} />
      <DialogWrapper
        title={<div className="flex flex-row items-center">{t('Edit Post')}</div>}
        onClose={onCancel}
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
          <div className="relative">
            <textarea
              defaultValue={postFile.content.caption}
              onChange={(e) =>
                setPostFile({
                  ...postFile,
                  content: { ...postFile.content, caption: e.target.value },
                })
              }
              placeholder={t("What's up?")}
              className={`w-full resize-none rounded-sm border bg-transparent p-2 ${
                postFile.content.caption?.length ? '' : 'h-[2.5rem]'
              }`}
            />
          </div>
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
            toRemoveFileIds={toRemoveFileIds}
            setToRemoveFileIds={setToRemoveFileIds}
          />
          <div className="-m-2 mt-3 flex flex-row-reverse items-center md:flex-nowrap">
            <Button
              className={`m-2 ${
                postFile.content.caption?.length ? '' : 'pointer-events-none opacity-20 grayscale'
              }`}
              icon={'send'}
              state={savePostStatus}
            >
              {t('Save')}
            </Button>
            <Button
              className={`m-2`}
              type="secondary"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onCancel();
              }}
            >
              {t('Cancel')}
            </Button>
          </div>
        </form>
      </DialogWrapper>
    </>
  );

  return createPortal(dialog, target);
};

const ExistingFileOverview = ({
  mediaFiles,
  toRemoveFileIds,
  targetDrive,
  setToRemoveFileIds,
  className,
}: {
  mediaFiles?: MediaFile[];
  toRemoveFileIds: string[];
  targetDrive: TargetDrive;
  setToRemoveFileIds: (mediaFileIds: string[]) => void;
  className?: string;
}) => {
  if (!mediaFiles) {
    return null;
  }

  const renderedFiles = useMemo(() => {
    return mediaFiles
      .filter((file) => !toRemoveFileIds.some((toRemoveFileId) => toRemoveFileId === file.fileId))
      .map((image) => {
        return (
          <div key={image.fileId} className="relative w-1/2 p-[2px] md:w-1/3">
            <Image
              fileId={image.fileId}
              targetDrive={targetDrive}
              className="aspect-square h-auto w-full"
              fit="cover"
            />
            <ActionButton
              className="absolute bottom-3 right-3"
              icon="trash"
              type="remove"
              size="square"
              onClick={(e) => {
                e.preventDefault();
                setToRemoveFileIds([...toRemoveFileIds, image.fileId]);
                return false;
              }}
            />
          </div>
        );
      });
  }, [mediaFiles, toRemoveFileIds]);

  return (
    <div className={`-m-[2px] flex flex-row flex-wrap ${className ?? ''}`}>{renderedFiles}</div>
  );
};

export default EditPostDialog;
