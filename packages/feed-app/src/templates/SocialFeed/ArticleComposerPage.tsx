import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  ActionGroup,
  Arrow,
  Article as ArticleIcon,
  ConfirmDialog,
  DialogWrapper,
  ErrorNotification,
  Label,
  SaveStatus,
  Select,
  Trash,
  useDebounce,
  usePortal,
} from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { InnerFieldEditors } from '../../components/SocialFeed/ArticleFieldsEditor/ArticleFieldsEditor';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { Article, ChannelDefinition, ReactAccess } from '@youfoundation/js-lib/public';
import { useArticleComposer } from '@youfoundation/common-app';
import { ChannelSelector } from '../../components/SocialFeed/PostComposer';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DriveSearchResult, NewDriveSearchResult, RichText } from '@youfoundation/js-lib/core';

export const ArticleComposerPage = () => {
  const { channelKey, postKey } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false);
  const [isConfirmUnpublish, setIsConfirmUnpublish] = useState(false);

  const {
    // Actions
    doSave,
    doRemovePost,
    movePost,

    // Data
    channel,
    postFile,
    isValidPost,
    isPublished,
    primaryMediaFile,

    // Data updates
    setPostFile,
    setChannel,
    setPrimaryMediaFile,

    // Status
    saveStatus,
    removeStatus,

    // Errors
    error,
  } = useArticleComposer({
    postKey,
    channelKey: channelKey || searchParams.get('channel') || undefined,
    caption: searchParams.get('caption') || undefined,
  });

  const debouncedSave = useDebounce(() => doSave(postFile), { timeoutMillis: 1500 });

  const PostButton = ({ className }: { className?: string }) => {
    if (isPublished)
      return (
        <ActionButton
          className={`m-2 md:w-auto ${className ?? ''}`}
          state={saveStatus !== 'success' ? saveStatus : undefined}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            doSave(postFile, 'draft');
          }}
          confirmOptions={{
            title: t('Post'),
            body: t(
              'Are you sure you want to unpublish this post, it will no longer be publicly available?'
            ),
            buttonText: t('Convert to draft'),
            type: 'info',
          }}
          type="secondary"
        >
          {t('Convert to draft')}
        </ActionButton>
      );

    return (
      <ActionButton
        className={`m-2 md:w-auto ${
          isValidPost(postFile) ||
          !postFile.fileMetadata.appData.content.caption ||
          !postFile.fileMetadata.appData.content.caption.length
            ? 'pointer-events-none opacity-20 grayscale'
            : ''
        } ${className ?? ''}`}
        icon={Arrow}
        state={saveStatus !== 'success' ? saveStatus : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          doSave(postFile, 'publish');
        }}
        confirmOptions={{
          title: t('Post'),
          body: t('Are you sure you want to publish this post?'),
          buttonText: t('Publish'),
          type: 'info',
        }}
      >
        {t('Publish')}
      </ActionButton>
    );
  };

  return (
    <>
      <PageMeta
        title={
          <div className="flex-col">
            {postFile?.fileMetadata.appData.content?.caption || t('New article')}
            <small className="text-sm text-gray-400">
              <SaveStatus state={saveStatus} className="text-sm" />
            </small>
          </div>
        }
        browserTitle={postFile?.fileMetadata.appData.content?.caption || t('New article')}
        icon={ArticleIcon}
        breadCrumbs={[
          { title: t('Articles'), href: '/owner/feed/articles' },
          { title: t('New article') },
        ]}
        actions={
          <>
            <ActionGroup
              type="mute"
              size="square"
              options={[
                {
                  label: t('Options'),
                  onClick: () => setIsOptionsDialogOpen(!isOptionsDialogOpen),
                },
                ...(!(postFile.fileId && !isPublished)
                  ? [
                      {
                        label: t('Remove'),
                        onClick: () => {
                          doRemovePost();
                          navigate('/owner/feed/articles');
                        },
                        icon: Trash,
                        confirmOptions: {
                          title: t('Remove'),
                          body: `${t('Are you sure you want to remove')} "${
                            postFile?.fileMetadata.appData.content?.caption || t('New article')
                          }"`,
                          buttonText: t('Remove'),
                        },
                      },
                    ]
                  : []),
              ]}
            >
              ...
            </ActionGroup>
            {postFile.fileId && !isPublished ? (
              <ActionButton
                type="remove"
                icon={Trash}
                onClick={() => {
                  doRemovePost();
                  navigate('/owner/feed/articles');
                }}
                confirmOptions={{
                  title: t('Discard draft'),
                  body: `${t('Are you sure you want to discard')} "${
                    postFile.fileMetadata.appData.content.caption || t('Untitled')
                  }"`,
                  buttonText: t('Discard'),
                  type: 'info',
                }}
                size="square"
                state={removeStatus}
                className="m-2"
              />
            ) : null}
            <PostButton />
          </>
        }
      />
      <section className="pb-10">
        <div className="sm:px-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doSave();
              return false;
            }}
            className={isPublished ? 'opacity-90 grayscale' : ''}
            onClick={() => isPublished && setIsConfirmUnpublish(true)}
          >
            <InnerFieldEditors
              key={postFile.fileMetadata.appData.content.id}
              postFile={postFile}
              primaryMediaFile={primaryMediaFile}
              channel={channel}
              updateVersionTag={(versionTag) =>
                setPostFile({
                  ...postFile,
                  fileMetadata: {
                    ...postFile.fileMetadata,
                    versionTag,
                  },
                })
              }
              onChange={(e) => {
                const dirtyPostFile = { ...postFile };
                if (e.target.name === 'abstract') {
                  dirtyPostFile.fileMetadata.appData.content.abstract = (
                    e.target.value as string
                  ).trim();
                } else if (e.target.name === 'caption') {
                  dirtyPostFile.fileMetadata.appData.content.caption = (
                    e.target.value as string
                  ).trim();
                } else if (e.target.name === 'primaryImageFileId') {
                  setPrimaryMediaFile(
                    e.target.value ? { file: e.target.value as Blob } : undefined
                  );
                } else if (e.target.name === 'body') {
                  dirtyPostFile.fileMetadata.appData.content.body = e.target.value as RichText;
                }

                setPostFile((oldPostFile) => ({
                  ...dirtyPostFile,
                  fileMetadata: {
                    ...dirtyPostFile.fileMetadata,
                    versionTag: oldPostFile.fileMetadata.versionTag,
                  },
                }));
                debouncedSave();
              }}
              disabled={isPublished}
            />

            <div className="mb-5 flex md:hidden">
              <PostButton className="w-full justify-center" />
            </div>
          </form>
          <ErrorNotification error={error} />
        </div>
      </section>
      <OptionsDialog
        postFile={postFile}
        isPublished={isPublished}
        isOpen={isOptionsDialogOpen}
        onCancel={() => setIsOptionsDialogOpen(false)}
        onConfirm={async (newReactAccess, newChannel) => {
          setIsOptionsDialogOpen(false);

          if (newReactAccess !== undefined) {
            const dirtyPostFile = { ...postFile };
            dirtyPostFile.fileMetadata.appData.content.reactAccess =
              newReactAccess !== true ? newReactAccess : undefined;

            setPostFile(dirtyPostFile);
            await doSave(dirtyPostFile);
          }

          if (newChannel) {
            if (postFile.fileId) movePost(newChannel);
            else setChannel(newChannel);
          }
        }}
      />
      {isConfirmUnpublish ? (
        <ConfirmDialog
          title={t('Published')}
          onConfirm={() => {
            doSave(postFile, 'draft');
            setIsConfirmUnpublish(false);
          }}
          buttonText={t('Convert to draft')}
          onCancel={() => setIsConfirmUnpublish(false)}
          body={t(
            'This post is currently published, if you wish to edit you need to convert it back to draft'
          )}
        />
      ) : null}
    </>
  );
};

const OptionsDialog = ({
  isPublished,
  postFile,

  isOpen,
  onCancel,
  onConfirm,
}: {
  isPublished?: boolean;
  postFile: DriveSearchResult<Article> | NewDriveSearchResult<Article>;

  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (
    newReactAccess: ReactAccess | undefined,
    newChannel: ChannelDefinition | undefined
  ) => void;
}) => {
  const target = usePortal('modal-container');

  const [newReactAccess, setNewReactAccess] = useState<ReactAccess | undefined>(
    postFile.fileMetadata.appData.content.reactAccess
  );
  const [newChannel, setNewChannel] = useState<ChannelDefinition | undefined>();

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper title={t('Options')} onClose={onCancel}>
      <form onSubmit={() => onConfirm(newReactAccess, newChannel)}>
        <div className="mt-4 px-2 pt-4">
          <Label>{t('Reactions')}</Label>
          <Select
            id="reactAccess"
            name="reactAccess"
            defaultValue={
              postFile.fileMetadata.appData.content.reactAccess !== undefined
                ? postFile.fileMetadata.appData.content.reactAccess
                  ? 'true'
                  : 'false'
                : undefined
            }
            onChange={(e) => setNewReactAccess(e.target.value === 'true')}
          >
            <option>{t('Make a selection')}</option>
            <option value={'true'}>{t('Enabled')}</option>
            <option value={'false'}>{t('Disabled')}</option>
          </Select>
        </div>
        <div className="mt-4 px-2 pt-4">
          <Label>{t('Channel')}</Label>
          {isPublished ? (
            <p className="text-sm text-gray-400">
              {t('After a publish, the post can no longer be moved between channels')}
            </p>
          ) : null}
          <ChannelSelector
            className={`w-full rounded border border-gray-300 px-3 py-1 focus:border-indigo-500 dark:border-gray-700`}
            defaultValue={postFile.fileMetadata.appData.content?.channelId}
            onChange={setNewChannel}
            disabled={isPublished}
            excludeMore={true}
          />
        </div>
        <div className="flex flex-row-reverse gap-2 py-3">
          <ActionButton className="m-2">{t('Ok')}</ActionButton>
          <ActionButton
            type="secondary"
            className="m-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
          >
            {t('Cancel')}
          </ActionButton>
        </div>
      </form>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default ArticleComposerPage;
