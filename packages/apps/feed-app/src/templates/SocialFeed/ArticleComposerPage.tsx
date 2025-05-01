import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  ActionGroup,
  DialogWrapper,
  ErrorNotification,
  Label,
  SaveStatus,
  Select,
  usePortal,
  t,
  ChannelOrAclSelector,
  BlockerDialog,
  FEED_ROOT_PATH,
} from '@homebase-id/common-app';
import {
  Arrow,
  Article as ArticleIcon,
  Cog,
  Trash,
  Lock,
  Save,
  OpenLock,
} from '@homebase-id/common-app/icons';
import { InnerFieldEditors } from '../../components/SocialFeed/ArticleFieldsEditor/ArticleFieldsEditor';
import { PageMeta } from '@homebase-id/common-app';
import { Article, ReactAccess } from '@homebase-id/js-lib/public';
import { useArticleComposer } from '@homebase-id/common-app';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HomebaseFile, NewHomebaseFile, RichText } from '@homebase-id/js-lib/core';

export const ArticleComposerPage = () => {
  const { channelKey, postKey, odinKey } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false);

  console.info("odinKey:", odinKey??"none");
  const {
    // Actions
    doSave,
    doRemovePost,

    // Data
    channel,
    postFile,
    isInvalidPost,
    isPublished,
    files,

    // Data updates
    setPostFile,
    setOdinId,
    setChannel,
    setFiles,

    // Status
    saveStatus,

    // Errors
    error,

    isLoadingServerData,
  } = useArticleComposer({
    odinKey,
    postKey,
    channelKey: channelKey || searchParams.get('channel') || undefined,
    caption: searchParams.get('caption') || undefined,
  });

  const [needsSaving, setNeedsSaving] = useState(false);
  const [willSave, setWillSave] = useState(false);

  // Delay needSaving to willSave; Auto save every 15s
  const milliseconds = 1000 * 15;
  console.log("auto-save interval (seconds)", milliseconds/1000)
  useEffect(() => {
    const interval = setInterval(() => {
      setNeedsSaving((needsSaving) => {
        setWillSave(needsSaving);
        return needsSaving;
      });
    }, milliseconds);
    return () => clearInterval(interval);
  }, [setNeedsSaving, setWillSave]);
    
  useEffect(()=>
  {
        console.info("something changed postFile");
        console.info(`postFile fileId: :${postFile.fileId}`);
      console.info(`postFile version: ${postFile.fileMetadata.versionTag}`);
      console.info(`postFile whole: ${postFile}`);
        
    },[postFile]);
  
  useEffect(() => {
    if (willSave) {
      setNeedsSaving(false);
      setWillSave(false);
      console.info("Start: auto-saving post: fileId/uniqueId/versiontag", postFile.fileId, postFile.fileMetadata.appData.uniqueId, postFile.fileMetadata.versionTag)
      doSave(postFile, isPublished ? 'publish' : undefined).then(()=>{
        console.log('done: auto-saving post: fileId/uniqueId/versiontag', postFile.fileId,postFile.fileMetadata.appData.uniqueId, postFile.fileMetadata.versionTag);
      });
    }
  }, [willSave, setWillSave, postFile, isPublished]);

  const PublishButton = useCallback(
    ({ className }: { className?: string }) => {
      if (isPublished) return null;

      return (
        <ActionButton
          className={`md:w-auto ${
            !postFile.fileId ||
            isInvalidPost(postFile) ||
            !postFile.fileMetadata.appData.content.caption ||
            !postFile.fileMetadata.appData.content.caption.length
              ? 'pointer-events-none opacity-20 grayscale'
              : ''
          } ${className ?? ''}`}
          icon={Arrow}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            doSave(postFile, 'publish', undefined, true);
            setNeedsSaving(false);
          }}
          confirmOptions={{
            title: t('Post'),
            body: t('Are you sure you want to publish this post?'),
            buttonText: t('Publish'),
            type: 'info',
          }}
          type="secondary"
        >
          {t('Publish')}
        </ActionButton>
      );
    },
    [isPublished, saveStatus, postFile]
  );

  // Show browser specific message when trying to close the tab with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (needsSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
  });

  // Block navigating elsewhere when data has been entered into the input
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      needsSaving && currentLocation.pathname !== nextLocation.pathname
  );

  const handleRTEChange = useCallback(
    (e: {
      target: {
        name: string;
        value: string | { fileKey: string; type: string } | RichText | undefined;
      };
    }) => {
      setNeedsSaving(true);
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
    },
    [setNeedsSaving, setPostFile]
  );

  if (isLoadingServerData) return null;

  return (
    <>
      <PageMeta
        title={
          <div className="flex-col">
            {postFile?.fileMetadata.appData.content?.caption || t('New article')}
            <small className="text-sm text-gray-400">
              <span className="flex flex-row items-center gap-1">
                {postFile?.fileMetadata.isEncrypted ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <OpenLock className="h-3 w-3" />
                )}
                {channel?.fileMetadata.appData.content.name || ''}
              </span>
            </small>
          </div>
        }
        browserTitle={postFile?.fileMetadata.appData.content?.caption || t('New article')}
        icon={ArticleIcon}
        breadCrumbs={[
          { title: t('Feed'), href: `${FEED_ROOT_PATH}` },
          { title: t('Articles'), href: `${FEED_ROOT_PATH}/articles` },
          { title: isPublished ? t('Edit article') : t('New article') },
        ]}
        actions={
          <>
            <ActionButton
              icon={Save}
              state={saveStatus !== 'success' ? saveStatus : 'idle'}
              onClick={() => {
                doSave(undefined, isPublished ? 'publish' : undefined);
                setNeedsSaving(false);
              }}
            />
            <PublishButton />
            <ActionGroup
              type="mute"
              size="square"
              options={[
                {
                  label: t('Options'),
                  icon: Cog,
                  onClick: () => setIsOptionsDialogOpen(!isOptionsDialogOpen),
                },
                postFile.fileId
                  ? {
                      label: t('Remove'),
                      onClick: () => {
                        doRemovePost();
                        navigate(`${FEED_ROOT_PATH}/articles`);
                      },
                      icon: Trash,
                      confirmOptions: {
                        title: t('Remove'),
                        body: `${t('Are you sure you want to remove')} "${
                          postFile?.fileMetadata.appData.content?.caption || t('New article')
                        }". Any reactions or comments will be lost.`,
                        buttonText: t('Remove'),
                      },
                    }
                  : undefined,
              ]}
            />
          </>
        }
      />

      <section className="pb-10">
        <div className="sm:px-10">
          {isPublished || postFile.fileId ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doSave(undefined, isPublished ? 'publish' : undefined);
                setNeedsSaving(false);
                return false;
              }}
            >
              <InnerFieldEditors
                key={postFile.fileMetadata.appData.content.id}
                postFile={postFile}
                odinId={odinKey}
                channel={channel}
                files={files}
                setFiles={setFiles}
                onChange={handleRTEChange}
              />

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <PublishButton className="w-full sm:hidden" />
                <div className="flex flex-col items-end gap-1">
                  <ActionButton icon={Save} state={saveStatus !== 'success' ? saveStatus : 'idle'}>
                    {t('Save')}
                  </ActionButton>
                  <SaveStatus state={saveStatus} className="text-sm" />
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-flow-row gap-1">
              <span className="text-sm text-gray-400">{t('Channel')}</span>
              <div className="mb-5 flex flex-row items-center gap-2 border-gray-200 border-opacity-60 bg-background p-2 text-foreground dark:border-gray-800 md:rounded-lg md:border md:p-4">
                <ChannelOrAclSelector
                  key={postFile.fileMetadata.appData.content?.channelId}
                  className={`w-full rounded border-gray-300 px-3 focus:border-indigo-500 dark:border-gray-700`}
                  defaultChannelValue={postFile.fileMetadata.appData.content?.channelId}
                  onChange={({ channel: newChannel, odinId }) => {
                    if (!newChannel) return;
                    setChannel(newChannel);
                    setOdinId(odinId);
                  }}
                  disabled={isPublished}
                  excludeMore={true}
                  excludeCustom={true}
                />
              </div>

              <div className="flex flex-row-reverse gap-2">
                <ActionButton
                  className={``}
                  icon={Arrow}
                  state={saveStatus !== 'success' ? saveStatus : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    doSave(postFile);
                  }}
                  type="primary"
                >
                  {t('Continue')}
                </ActionButton>
                <ActionButton type="secondary" onClick={() => navigate(-1)}>
                  {t('Cancel')}
                </ActionButton>
              </div>
            </div>
          )}

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
            setNeedsSaving(false);
            await doSave(dirtyPostFile, isPublished ? 'publish' : undefined);
          }
        }}
      />
      {blocker && blocker.reset && blocker.proceed ? (
        <BlockerDialog
          isOpen={blocker.state === 'blocked'}
          onCancel={blocker.reset}
          onProceed={blocker.proceed}
          title={t('You have unsaved changes')}
        >
          <p>{t('Are you sure you want to leave this page? Your changes will be lost.')}</p>
        </BlockerDialog>
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
