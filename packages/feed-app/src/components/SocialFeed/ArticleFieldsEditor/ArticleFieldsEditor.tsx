import {
  ChannelDefinition,
  Article,
  getChannelDrive,
  NewMediaFile,
  appendPostMedia,
  removePostMedia,
} from '@youfoundation/js-lib/public';
import { lazy, useState } from 'react';
import {
  t,
  ErrorBoundary,
  Label,
  ActionButton,
  Arrow,
  Textarea,
  useDotYouClient,
  useImage,
} from '@youfoundation/common-app';

import { ImageSelector } from '@youfoundation/common-app';
import { DriveSearchResult, NewDriveSearchResult, RichText } from '@youfoundation/js-lib/core';
const RichTextEditor = lazy(() =>
  import('@youfoundation/rich-text-editor').then((m) => ({ default: m.RichTextEditor }))
);
export const InnerFieldEditors = ({
  postFile,
  channel,

  onChange,
  updateVersionTag,
  disabled,
}: {
  postFile: DriveSearchResult<Article> | NewDriveSearchResult<Article>;
  channel: NewDriveSearchResult<ChannelDefinition>;

  onChange: (e: {
    target: {
      name: string;
      value: string | { fileKey: string; type: string } | RichText | undefined;
    };
  }) => void;
  updateVersionTag: (versionTag: string) => void;
  disabled?: boolean;
}) => {
  const [isEditTeaser, setIsEditTeaser] = useState(false);
  const { data: imageData } = useImage({
    imageFileId: postFile.fileId,
    imageFileKey: postFile.fileMetadata.appData.content.primaryMediaFile?.fileKey,
    imageDrive: getChannelDrive(channel.fileMetadata.appData.uniqueId as string),
    lastModified: (postFile as DriveSearchResult<unknown>)?.fileMetadata?.updated,
  }).fetch;

  const dotYouClient = useDotYouClient().getDotYouClient();
  const targetDrive = getChannelDrive(channel.fileMetadata.appData.uniqueId as string);

  return (
    <>
      <div className="grid grid-flow-row gap-1">
        <span className="text-sm text-gray-400">{t('Metadata')}</span>
        <div className="mb-5 border-gray-200 border-opacity-60 bg-background p-2 pb-0 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4 md:pb-0">
          <div className="mb-2 flex flex-row items-center justify-between gap-2 md:mb-4">
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
              className="shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditTeaser(!isEditTeaser);
              }}
              type="secondary"
            >
              {isEditTeaser ? t('Collapse') : t('Expand')}{' '}
              <Arrow
                className={`h-4 w-4 transition-transform ${
                  isEditTeaser ? '-rotate-90' : 'rotate-90'
                }`}
              />
            </ActionButton>
          </div>

          {isEditTeaser ? (
            <div className="border-t pt-4 md:mt-4">
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
                  defaultValue={imageData?.url}
                  onChange={async (e) => {
                    const result = await appendPostMedia(
                      dotYouClient,
                      targetDrive,
                      postFile.fileId as string,
                      e.target.value as Blob
                    );
                    console.log('result', result);
                    if (!result) return null;

                    updateVersionTag(result.newVersionTag);

                    onChange({
                      target: {
                        name: 'primaryMediaFile',
                        value: {
                          fileKey: result.fileKey,
                          type: e.target.value?.type || 'image/jpeg',
                        },
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
              mediaOptions={
                postFile.fileId
                  ? {
                      fileId: postFile.fileId,
                      mediaDrive: targetDrive,
                      onAppend: async (file) => {
                        const result = await appendPostMedia(
                          dotYouClient,
                          targetDrive,
                          postFile.fileId as string,
                          file
                        );
                        if (!result) return null;
                        updateVersionTag(result.newVersionTag);

                        return { fileId: postFile.fileId as string, fileKey: result.fileKey };
                      },
                      onRemove: async ({
                        fileId,
                        fileKey,
                      }: {
                        fileId: string;
                        fileKey: string;
                      }) => {
                        if (!postFile.fileMetadata.versionTag) return null;

                        const result = await removePostMedia(
                          dotYouClient,
                          targetDrive,
                          fileId,
                          fileKey,
                          postFile.fileMetadata.versionTag
                        );
                        if (!result) return null;

                        updateVersionTag(result.newVersionTag);
                        return result;
                      },
                    }
                  : undefined
              }
              name="body"
              onChange={onChange}
              className="min-h-[50vh]"
              disabled={disabled}
              key={postFile.fileId ? 'editor' : 'editor-new'}
            />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
};
