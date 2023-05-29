import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionButton,
  Arrow,
  Article as ArticleIcon,
  DialogWrapper,
  ErrorNotification,
  Label,
  Question,
  SaveStatus,
  Select,
  Trash,
  usePortal,
} from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { InnerFieldEditors } from '../../components/SocialFeed/ArticleFieldsEditor/ArticleFieldsEditor';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  SecurityGroupType,
  ImageUploadResult,
  RichText,
  Article,
  ChannelDefinition,
  PostFile,
} from '@youfoundation/js-lib';
import useArticleComposer from '@youfoundation/common-app/src/hooks/socialFeed/article/useArticleComposer';
import { ChannelSelector } from '../../components/SocialFeed/PostComposer';
import { useState } from 'react';
import { createPortal } from 'react-dom';

const ArticleComposerPage = () => {
  const { channelKey, postKey } = useParams();
  const navigate = useNavigate();
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false);

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

    // Data updates
    setPostFile,
    setChannel,

    // Status
    saveStatus,
    removeStatus,

    // Errors
    error,
  } = useArticleComposer({
    postKey,
    channelKey,
  });

  const PostButton = ({ className }: { className?: string }) => {
    return (
      <ActionButton
        className={`m-2 md:w-auto ${
          isValidPost(postFile) || !postFile.content.caption || !postFile.content.caption.length
            ? 'pointer-events-none opacity-20 grayscale'
            : ''
        } ${className ?? ''}`}
        icon={Arrow}
        state={saveStatus !== 'success' ? saveStatus : undefined}
        onClick={() => doSave(postFile, true)}
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
            {t('New article')}
            <small className="text-sm text-gray-400">
              <SaveStatus state={saveStatus} className="text-sm" />
            </small>
          </div>
        }
        icon={ArticleIcon}
        breadCrumbs={[
          { title: t('Articles'), href: '/owner/feed/articles' },
          { title: postFile?.content?.caption || t('New article') },
        ]}
        actions={
          <>
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
                    postFile.content.caption || t('Untitled')
                  }"`,
                  buttonText: t('Discard'),
                  type: 'info',
                }}
                size="square"
                state={removeStatus}
                className="m-2"
              />
            ) : null}
            <ActionButton
              onClick={() => setIsOptionsDialogOpen(!isOptionsDialogOpen)}
              type="mute"
              size="square"
            >
              ...
            </ActionButton>
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
          >
            <div className="mb-5 flex flex-row flex-wrap items-center bg-background md:flex-nowrap">
              <></>
            </div>

            {/* <div className="mb-5 border-gray-200 border-opacity-60 bg-background p-2 dark:border-gray-800 md:rounded-lg md:border md:p-4"> */}
            <InnerFieldEditors
              key={postFile.content.id}
              postFile={postFile}
              channel={channel}
              onChange={(e) => {
                const dirtyPostFile = { ...postFile };
                if (e.target.name === 'abstract') {
                  dirtyPostFile.content.abstract = (e.target.value as string).trim();
                } else if (e.target.name === 'caption') {
                  dirtyPostFile.content.caption = (e.target.value as string).trim();
                } else if (e.target.name === 'primaryImageFileId') {
                  const uploadResult = e.target.value as ImageUploadResult;
                  dirtyPostFile.content.primaryMediaFile = {
                    fileId: uploadResult.fileId,
                    type: 'image',
                  };
                  dirtyPostFile.previewThumbnail = uploadResult.previewThumbnail;
                } else if (e.target.name === 'body') {
                  dirtyPostFile.content.body = e.target.value as RichText;
                } else if (e.target.name === 'reactAccess') {
                  const newReactAccess = e.target.value as SecurityGroupType;
                  dirtyPostFile.content.reactAccess =
                    newReactAccess === SecurityGroupType.Owner
                      ? SecurityGroupType.Owner
                      : undefined;
                }

                setPostFile(dirtyPostFile);
                doSave(dirtyPostFile);
              }}
            />

            <div className="mb-5 flex md:hidden">
              <PostButton className="w-full justify-center" />
            </div>
            {/* </div> */}
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

          if (newReactAccess) {
            const dirtyPostFile = { ...postFile };
            dirtyPostFile.content.reactAccess =
              newReactAccess === SecurityGroupType.Owner ? SecurityGroupType.Owner : undefined;

            setPostFile(dirtyPostFile);
            await doSave(dirtyPostFile);
          }

          if (newChannel) {
            if (postFile.fileId && channel) movePost(channel);
            else if (channel) setChannel(channel);
          }
        }}
      />
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
  postFile: PostFile<Article>;

  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (
    newReactAccess: SecurityGroupType.Connected | SecurityGroupType.Owner | undefined,
    newChannel: ChannelDefinition | undefined
  ) => void;
}) => {
  const target = usePortal('modal-container');

  const [newReactAccess, setNewReactAccess] = useState<
    SecurityGroupType.Connected | SecurityGroupType.Owner | undefined
  >(postFile.content.reactAccess);
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
            defaultValue={postFile.content.reactAccess}
            onChange={(e) =>
              setNewReactAccess(
                e.target.value as SecurityGroupType.Connected | SecurityGroupType.Owner
              )
            }
          >
            <option>{t('Make a selection')}</option>
            {/* <option value={SecurityGroupType.Authenticated}>{t('Authenticated')}</option> */}
            <option value={SecurityGroupType.Connected}>{t('Enabled')}</option>
            <option value={SecurityGroupType.Owner}>{t('Disabled')}</option>
          </Select>
        </div>
        <div className="mt-4 px-2 pt-4">
          <Label>{t('Channel')}</Label>
          <ChannelSelector
            className={`w-full rounded border border-gray-300 px-3 py-1 focus:border-indigo-500 dark:border-gray-700`}
            defaultValue={postFile.content?.channelId}
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
