import {
  ChannelDefinition,
  Article,
  getChannelDrive,
  RemoteCollaborativeChannelDefinition,
} from '@homebase-id/js-lib/public';
import { lazy, useMemo, useState } from 'react';
import {
  t,
  ErrorBoundary,
  Label,
  ActionButton,
  Textarea,
  useRawImage,
  ImageSelector,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';

import {
  HomebaseFile,
  NewHomebaseFile,
  RichText,
  MediaFile,
  NewMediaFile,
} from '@homebase-id/js-lib/core';
import { MediaOptions } from '@homebase-id/rich-text-editor/src/editor/ImagePlugin/ImagePlugin';
const RichTextEditor = lazy(() =>
  import('@homebase-id/rich-text-editor').then((m) => ({ default: m.RichTextEditor }))
);
const POST_MEDIA_RTE_PAYLOAD_KEY = 'pst_rte';

export const InnerFieldEditors = ({
  odinId,
  postFile,
  channel,
  files,

  onChange,

  disabled,
  setFiles,
}: {
  odinId?: string;
  postFile: HomebaseFile<Article> | NewHomebaseFile<Article>;
  channel: NewHomebaseFile<ChannelDefinition>;
  files: (NewMediaFile | MediaFile)[];

  onChange: (e: {
    target: {
      name: string;
      value: string | { fileKey: string; type: string } | RichText | undefined;
    };
  }) => void;
  disabled?: boolean;
  setFiles: (newFiles: (NewMediaFile | MediaFile)[]) => void;
}) => {
  const channelId =
    (channel as HomebaseFile<RemoteCollaborativeChannelDefinition>).fileMetadata.appData.content
      .uniqueId || (channel.fileMetadata.appData.uniqueId as string);

  const [isEditTeaser, setIsEditTeaser] = useState(true);
  const { data: imageData } = useRawImage({
    odinId,
    imageFileId: postFile.fileId,
    imageFileKey: postFile.fileMetadata.appData.content.primaryMediaFile?.fileKey,
    imageDrive: getChannelDrive(channelId),
    lastModified: (postFile as HomebaseFile<unknown>)?.fileMetadata?.updated,
  }).fetch;

  const pendingFile = files.find(
    (f) => 'file' in f && f.key === postFile.fileMetadata.appData.content.primaryMediaFile?.fileKey
  ) as NewMediaFile | null;

  const targetDrive = getChannelDrive(channelId);
  const mediaOptions: MediaOptions = useMemo(
    () => ({
      odinId,
      globalTransitId: postFile.fileMetadata.globalTransitId,
      fileId: postFile.fileId || '',
      mediaDrive: targetDrive,
      pendingUploadFiles: files.filter((f) => 'file' in f) as NewMediaFile[],
      onAppend: async (file) => {
        const fileKey = `${POST_MEDIA_RTE_PAYLOAD_KEY}i${files.length}`;

        setFiles([...files, { file: file, key: fileKey }]);
        return { fileId: postFile.fileId || '', fileKey: fileKey };
      },
      onRemove: async ({ fileKey }: { fileId: string; fileKey: string }) => {
        setFiles(files.filter((f) => f.key !== fileKey));
        return true;
      },
    }),
    [odinId, postFile.fileId, files, setFiles]
  );

  return (
    <>
      <div className="grid grid-flow-row gap-1">
        <span className="text-sm text-gray-400">{t('Metadata')}</span>
        <div className="mb-5 border-gray-200 border-opacity-60 bg-background p-2 pb-0 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4 md:pb-0">
          <div className="mb-2 flex flex-row justify-between gap-2 md:mb-4">
            <div className="w-full">
              {isEditTeaser ? (
                <Label className="mb-1 text-gray-700 dark:text-gray-300">{t('Title')}</Label>
              ) : null}
              <input
                id="caption"
                name="caption"
                defaultValue={postFile.fileMetadata.appData.content.caption}
                onChange={onChange}
                placeholder={t('Title')}
                className={`w-full resize-none rounded-md bg-transparent px-2 py-1 text-lg`}
                disabled={disabled}
              />
            </div>
            <ActionButton
              className="mb-auto shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditTeaser(!isEditTeaser);
              }}
              type="mute"
            >
              {isEditTeaser ? t('Collapse') : t('Expand')}{' '}
              <Arrow
                className={`h-5 w-5 transition-transform ${
                  isEditTeaser ? '-rotate-90' : 'rotate-90'
                }`}
              />
            </ActionButton>
          </div>

          {isEditTeaser ? (
            <div className="border-t pb-4 pt-4 md:mt-4">
              <div className="m-1">
                <Label className="mb-1 text-gray-700 dark:text-gray-300">{t('Summary')}</Label>
                <Textarea
                  id="abstract"
                  name="abstract"
                  defaultValue={(postFile.fileMetadata.appData.content as Article).abstract}
                  onChange={onChange}
                  placeholder={t('Summary')}
                  className={`resize-none`}
                  disabled={disabled}
                />
              </div>
              <div className="m-1 mt-4">
                <Label className="mb-1 text-gray-700 dark:text-gray-300">{t('Hero')}</Label>
                <ImageSelector
                  id="post_image"
                  name="primaryImageFileId"
                  defaultValue={
                    pendingFile?.file ||
                    imageData?.url ||
                    postFile.fileMetadata.appData.content.primaryMediaFile?.fileKey
                  }
                  onChange={async (e) => {
                    if (!e.target.value) {
                      setFiles(
                        files.filter(
                          (f) =>
                            f.key !==
                            postFile.fileMetadata.appData.content.primaryMediaFile?.fileKey
                        )
                      );

                      onChange({
                        target: {
                          name: 'primaryMediaFile',
                          value: undefined,
                        },
                      });
                      return;
                    }

                    const fileKey = `${POST_MEDIA_RTE_PAYLOAD_KEY}i${files.length}`;

                    setFiles([...files, { file: e.target.value as Blob, key: fileKey }]);
                    onChange({
                      target: {
                        name: 'primaryMediaFile',
                        value: { fileKey: fileKey, type: 'image' },
                      },
                    });
                  }}
                  sizeClass={`${
                    !postFile.fileMetadata.appData.content.primaryMediaFile
                      ? 'aspect-[16/9] md:aspect-[5/1]'
                      : ''
                  }  w-full object-cover`}
                  label={t('No primary image selected')}
                  disabled={disabled}
                />
              </div>
            </div>
          ) : null}
        </div>

        <span className="text-sm text-gray-400">{t('Body')}</span>
        <div className="mb-5 border-gray-200 border-opacity-60 bg-background p-2 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4">
          <ErrorBoundary>
            <RichTextEditor
              defaultValue={(postFile.fileMetadata.appData.content as Article)?.body}
              placeholder={t('Start writing...')}
              mediaOptions={mediaOptions}
              name="body"
              onChange={onChange}
              className="min-h-[50vh]"
              disabled={disabled}
              key={postFile.fileId ? 'editor' : 'editor-new'}
              stickyToolbar={true}
            />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
};
