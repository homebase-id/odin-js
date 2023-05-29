import {
  ChannelDefinition,
  PostFile,
  SecurityGroupType,
  Article,
  getChannelDrive,
  ImageUploadResult,
  RichText,
} from '@youfoundation/js-lib';
import { useMemo, useState } from 'react';
import {
  RichTextEditor,
  t,
  ErrorBoundary,
  Label,
  ActionButton,
  Arrow,
  Textarea,
} from '@youfoundation/common-app';
import { debounce } from 'lodash-es';

import ImageSelector from '@youfoundation/common-app/src/form/image/ImageSelector';

export const InnerFieldEditors = ({
  postFile,
  channel,
  onChange,
}: {
  postFile: PostFile<Article>;
  channel: ChannelDefinition;
  onChange: (e: { target: { name: string; value: string | ImageUploadResult | RichText } }) => void;
}) => {
  const debouncedChange = useMemo(() => debounce(onChange, 1500), [onChange]);

  const body: RichText = Array.isArray((postFile.content as Article)?.body)
    ? ((postFile.content as Article)?.body as RichText)
    : [
        {
          type: 'paragraph',
          children: [{ text: (postFile.content as Article)?.body ?? '' }] as Record<
            string,
            unknown
          >[],
        },
      ];

  const [isEditTeaser, setIsEditTeaser] = useState(false);
  return (
    <>
      <div className="grid grid-flow-row gap-1">
        <span className="text-sm text-gray-400">{t('Metadata')}</span>
        <div className="mb-5 border-gray-200 border-opacity-60 bg-background p-2 pb-0 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4 md:pb-0">
          <div className="mb-2 flex flex-row items-center justify-between gap-2 md:mb-4">
            <div className="w-full">
              {isEditTeaser ? <Label className="mb-1">{t('Title')}</Label> : null}
              <input
                id="caption"
                name="caption"
                defaultValue={postFile.content.caption}
                onChange={debouncedChange}
                placeholder={t('Title')}
                className={`w-full resize-none rounded-md bg-transparent px-2 py-1 text-lg`}
              />
            </div>
            <ActionButton
              className="shrink-0"
              onClick={() => setIsEditTeaser(!isEditTeaser)}
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
                <Label className="mb-1">{t('Summary')}</Label>
                <Textarea
                  id="abstract"
                  name="abstract"
                  defaultValue={(postFile.content as Article).abstract}
                  onChange={debouncedChange}
                  placeholder={t('Summary')}
                  className={`resize-none`}
                />
              </div>
              <div className="m-1 mt-4">
                <Label className="mb-1">{t('Hero')}</Label>
                <ImageSelector
                  id="post_image"
                  name="primaryImageFileId"
                  defaultValue={postFile.content.primaryMediaFile?.fileId}
                  onChange={(e) =>
                    e.target.value &&
                    onChange(e as { target: { name: string; value: ImageUploadResult } })
                  }
                  targetDrive={getChannelDrive(channel.channelId)}
                  acl={
                    channel.acl
                      ? { ...channel.acl }
                      : { requiredSecurityGroup: SecurityGroupType.Anonymous }
                  }
                  sizeClass={`${
                    !postFile.content.primaryMediaFile ? 'aspect-[16/9] md:aspect-[5/1]' : ''
                  }  w-full object-cover`}
                  label={t('No primary image selected')}
                />
              </div>
            </div>
          ) : null}
        </div>

        <span className="text-sm text-gray-400">{t('Body')}</span>
        <div className="mb-5 border-gray-200 border-opacity-60 bg-background p-2 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4">
          <ErrorBoundary>
            <RichTextEditor
              defaultValue={body}
              placeholder={t('Start writing...')}
              mediaDrive={getChannelDrive(channel.channelId)}
              name="body"
              onChange={debouncedChange}
              className="min-h-[50vh]"
            />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
};
