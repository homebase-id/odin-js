import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  ActionGroup,
  Arrow,
  Article as ArticleIcon,
  Cog,
  ConfirmDialog,
  DialogWrapper,
  Ellipsis,
  ErrorNotification,
  Label,
  SaveStatus,
  Select,
  Trash,
  useDebounce,
  usePortal,
  t,
  ChannelOrAclSelector,
} from '@youfoundation/common-app';
import { InnerFieldEditors } from '../../components/SocialFeed/ArticleFieldsEditor/ArticleFieldsEditor';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { Article, ChannelDefinition, ReactAccess } from '@youfoundation/js-lib/public';
import { useArticleComposer } from '@youfoundation/common-app';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { HomebaseFile, NewHomebaseFile, RichText } from '@youfoundation/js-lib/core';
import { ROOT_PATH } from '../../app/App';

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
    files,

    // Data updates
    setPostFile,
    setChannel,
    setFiles,

    // Status
    saveStatus,
    // removeStatus,

    // Errors
    error,
  } = useArticleComposer({
    postKey,
    channelKey: channelKey || searchParams.get('channel') || undefined,
    caption: searchParams.get('caption') || undefined,
  });

  const debouncedSave = useDebounce(() => doSave(postFile, isPublished ? 'publish' : undefined), {
    timeoutMillis: 1500,
  });

  const PostButton = ({ className }: { className?: string }) => {
    if (isPublished)
      return (
        <ActionButton
          className={`md:w-auto ${className ?? ''}`}
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
          type="primary"
        >
          {t('Convert to draft')}
        </ActionButton>
      );

    return (
      <ActionButton
        className={`md:w-auto ${
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
          doSave(postFile, 'publish', undefined, true);
        }}
        confirmOptions={{
          title: t('Post'),
          body: t('Are you sure you want to publish this post?'),
          buttonText: t('Publish'),
          type: 'info',
        }}
        type="primary"
      >
        {t('Publish')}
      </ActionButton>
    );
  };

  const handleRTEChange = useCallback(
    (e: {
      target: {
        name: string;
        value: string | { fileKey: string; type: string } | RichText | undefined;
      };
    }) => {
      setPostFile((oldPostFile) => {
        const dirtyPostFile = { ...oldPostFile };

        if (e.target.name === 'abstract') {
          dirtyPostFile.fileMetadata.appData.content.abstract = (e.target.value as string).trim();
        } else if (e.target.name === 'caption') {
          dirtyPostFile.fileMetadata.appData.content.caption = (e.target.value as string).trim();
        } else if (e.target.name === 'primaryMediaFile') {
          if (typeof e.target.value === 'object' && 'fileKey' in e.target.value) {
            dirtyPostFile.fileMetadata.appData.content.primaryMediaFile = {
              fileId: undefined,
              fileKey: e.target.value.fileKey,
              type: e.target.value.type,
            };
          } else {
            dirtyPostFile.fileMetadata.appData.content.primaryMediaFile = undefined;
          }
        } else if (e.target.name === 'body') {
          dirtyPostFile.fileMetadata.appData.content.body = e.target.value as RichText;
        }

        return {
          ...dirtyPostFile,
          fileMetadata: {
            ...dirtyPostFile.fileMetadata,
            versionTag: oldPostFile.fileMetadata.versionTag,
          },
        };
      });

      debouncedSave();
    },
    [setPostFile, debouncedSave]
  );

  return (
    <>
      <PageMeta
        title={
          <div className="flex-col">
            {postFile?.fileMetadata.appData.content?.caption || t('New article')}
            <small className="text-sm text-gray-400">
              <SaveStatus
                state={saveStatus === 'error' ? 'idle' : saveStatus}
                className="text-sm"
              />
            </small>
          </div>
        }
        browserTitle={postFile?.fileMetadata.appData.content?.caption || t('New article')}
        icon={ArticleIcon}
        breadCrumbs={[
          { title: t('Feed'), href: `${ROOT_PATH}` },
          { title: t('Articles'), href: `${ROOT_PATH}/articles` },
          { title: isPublished ? t('Edit article') : t('New article') },
        ]}
        actions={
          <>
            <PostButton />

            <ActionGroup
              type="secondary"
              size="square"
              options={[
                {
                  label: t('Options'),
                  icon: Cog,
                  onClick: () => setIsOptionsDialogOpen(!isOptionsDialogOpen),
                },
                ...(postFile.fileId
                  ? [
                      {
                        label: t('Remove'),
                        onClick: () => {
                          doRemovePost();
                          navigate(`${ROOT_PATH}/articles`);
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
              icon={Ellipsis}
            >
              {t('More')}
            </ActionGroup>
          </>
        }
      />
      <section className="pb-10">
        <div className="sm:px-10">
          <div className="grid grid-flow-row gap-1">
            <span className="text-sm text-gray-400">{t('Channel')}</span>
            <div className="mb-5 flex flex-row items-center gap-2 border-gray-200 border-opacity-60 bg-background p-2 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4">
              {isPublished ? (
                <p className="text-sm text-gray-400">
                  {t('After a publish, the post can no longer be moved between channels')}
                </p>
              ) : (
                <ChannelOrAclSelector
                  className={`w-full rounded border-gray-300 px-3 focus:border-indigo-500 dark:border-gray-700`}
                  defaultChannelValue={postFile.fileMetadata.appData.content?.channelId}
                  onChange={(newChannel) => newChannel && setChannel(newChannel)}
                  disabled={isPublished}
                  excludeMore={true}
                  excludeCustom={true}
                />
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doSave();
              return false;
            }}
          >
            <InnerFieldEditors
              key={postFile.fileMetadata.appData.content.id}
              postFile={postFile}
              channel={channel}
              files={files}
              setFiles={setFiles}
              onChange={handleRTEChange}
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
        // isPublished={isPublished}
        isOpen={isOptionsDialogOpen}
        onCancel={() => setIsOptionsDialogOpen(false)}
        onConfirm={async (newReactAccess) => {
          setIsOptionsDialogOpen(false);

          if (newReactAccess !== undefined) {
            const dirtyPostFile = { ...postFile };
            dirtyPostFile.fileMetadata.appData.content.reactAccess =
              newReactAccess !== true ? newReactAccess : undefined;

            setPostFile(dirtyPostFile);
            await doSave(dirtyPostFile);
          }

          // if (newChannel) {
          //   if (postFile.fileId) movePost(newChannel);
          //   else setChannel(newChannel);
          // }
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
  postFile,

  isOpen,
  onCancel,
  onConfirm,
}: {
  postFile: HomebaseFile<Article> | NewHomebaseFile<Article>;

  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (newReactAccess: ReactAccess | undefined) => void;
}) => {
  const target = usePortal('modal-container');

  const [newReactAccess, setNewReactAccess] = useState<ReactAccess | undefined>(
    postFile.fileMetadata.appData.content.reactAccess
  );

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper title={t('Options')} onClose={onCancel}>
      <form onSubmit={() => onConfirm(newReactAccess)}>
        <div className="px-2">
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
