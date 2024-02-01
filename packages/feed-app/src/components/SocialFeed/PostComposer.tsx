import {
  BlogConfig,
  ChannelDefinition,
  EmbeddedPost,
  NewMediaFile,
  ReactAccess,
} from '@youfoundation/js-lib/public';
import React, { Ref, useEffect, useMemo } from 'react';
import { useRef, useState } from 'react';
import {
  ActionButton,
  Arrow,
  ChannelsDialog,
  EmbeddedPostContent,
  EmojiSelector,
  FileOverview,
  FileSelector,
  Globe,
  VolatileInput,
  getImagesFromPasteEvent,
  getVideosFromPasteEvent,
  t,
  usePostComposer,
  useChannels,
  ErrorNotification,
  Article,
  Lock,
  ActionGroup,
  AclSummary,
  AclIcon,
  Pencil,
  useDotYouClient,
  AclDialog,
} from '@youfoundation/common-app';
import { base64ToUint8Array, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import {
  AccessControlList,
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { ROOT_PATH } from '../../app/App';

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;

const PostComposer = ({
  onPost,
  embeddedPost,
  className,
}: {
  onPost?: () => void;
  embeddedPost?: EmbeddedPost;
  className?: string;
}) => {
  const { isOwner } = useDotYouClient();
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input

  const { savePost, postState, processingProgress, error } = usePostComposer();
  const selectRef = useRef<HTMLSelectElement>(null);

  const [caption, setCaption] = useState<string>('');
  const [channel, setChannel] = useState<
    DriveSearchResult<ChannelDefinition> | NewDriveSearchResult<ChannelDefinition>
  >(BlogConfig.PublicChannelNewDsr);
  const [customAcl, setCustomAcl] = useState<AccessControlList | undefined>(undefined);
  const [files, setFiles] = useState<NewMediaFile[]>();

  const [reactAccess, setReactAccess] = useState<ReactAccess | undefined>(undefined);

  const isPosting = postState === 'uploading' || postState === 'encrypting';

  const doPost = async () => {
    if (isPosting) return;
    await savePost(caption, files, embeddedPost, channel, reactAccess, customAcl);
    resetUi();
    onPost && onPost();
  };

  const resetUi = () => {
    setCaption('');
    // setChannel(BlogConfig.PublicChannelNewDsr);
    setFiles(undefined);
    setStateIndex((i) => i + 1);
  };

  useEffect(() => {
    // We don't accept images (from the clipboard) when we're in embedded mode
    if (embeddedPost) return;

    const messageListener = (e: MessageEvent) => {
      if (e?.data?.source?.startsWith('react-devtools-')) return;

      console.log('incoming message', e);

      if (
        e.data.action === 'odin-upload' &&
        'dataUrl' in e.data &&
        typeof e.data.dataUrl === 'string'
      ) {
        const base64 = (e.data.dataUrl as string).split(',').pop();
        if (!base64) return;

        const bytes = base64ToUint8Array(base64);
        const file: NewMediaFile = {
          file: new Blob([bytes], { type: e.data.type }),
        };

        setFiles([...(files ?? []), file]);
      }
    };

    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, []);

  const canPost = caption?.length || files?.length || !!embeddedPost;

  return (
    <div className={`${className ?? ''}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          doPost();
          return false;
        }}
      >
        <div className="relative">
          <VolatileInput
            defaultValue={caption}
            onChange={(newCaption) => setCaption(newCaption)}
            placeholder={embeddedPost ? t('Add a comment?') : t("What's up?")}
            onPaste={(e) => {
              const mediaFiles = [...getImagesFromPasteEvent(e), ...getVideosFromPasteEvent(e)].map(
                (file) => ({ file })
              );

              if (mediaFiles.length && !embeddedPost) {
                setFiles([...(files ?? []), ...mediaFiles]);
                e.preventDefault();
              }
            }}
            onSubmit={
              isTouchDevice()
                ? undefined
                : () => {
                    doPost();
                    return false;
                  }
            }
            key={stateIndex}
          />
        </div>
        <FileOverview files={files} setFiles={setFiles} className="mt-2" cols={4} />
        {embeddedPost ? (
          <EmbeddedPostContent content={embeddedPost} className="pointer-events-none mt-4" />
        ) : null}

        <ProgressIndicator
          postState={postState}
          processingProgress={processingProgress}
          files={files?.length || 0}
        />
        <div className="mt-3 flex flex-row flex-wrap items-center gap-2 py-2 md:flex-nowrap">
          {!embeddedPost ? (
            <>
              <div
                className="mr-0 text-xl font-extralight leading-4 text-opacity-50"
                title="Attach a file"
              >
                <FileSelector
                  onChange={(mediaFiles) =>
                    setFiles([...(files ?? []), ...mediaFiles.map((file) => ({ file }))])
                  }
                  accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif, video/mp4"
                  className="text-foreground hover:text-opacity-70"
                  maxSize={HUNDRED_MEGA_BYTES}
                />
              </div>

              <EmojiSelector
                className="text-foreground hover:text-opacity-70"
                size="square"
                onInput={(val) => setCaption((oldVal) => `${oldVal} ${val}`)}
              />
              <ActionGroup
                size="square"
                type="mute"
                options={[
                  reactAccess === false
                    ? {
                        label: t('Enable reactions'),
                        icon: Globe,
                        onClick: () => setReactAccess(true),
                      }
                    : {
                        label: t('Disable reactions'),
                        icon: Lock,
                        onClick: () => setReactAccess(false),
                      },

                  ...(isOwner
                    ? [
                        {
                          label: t('Convert to an article'),
                          href: `${ROOT_PATH}/new?caption=${caption}&channel=${channel.fileMetadata.appData.uniqueId}`,
                          icon: Article,
                        },
                        {
                          label: t('See my drafts'),
                          href: `${ROOT_PATH}/articles`,
                          icon: Pencil,
                        },
                      ]
                    : []),
                ]}
              />
            </>
          ) : null}
          <ChannelOrAclSelector
            className="ml-auto max-w-[35%] flex-shrink"
            defaultChannelValue={
              channel?.fileMetadata?.appData?.uniqueId || BlogConfig.PublicChannelId
            }
            defaultAcl={customAcl}
            onChange={(channel, acl) => {
              channel && setChannel(channel);
              setCustomAcl(acl);
            }}
            excludeMore={true}
            ref={selectRef}
          />
          <ActionButton
            className={`w-full md:w-auto ${
              canPost ? '' : 'pointer-events-none hidden opacity-20 grayscale md:flex'
            } ${postState === 'uploading' ? 'pointer-events-none animate-pulse' : ''}`}
            icon={Arrow}
          >
            {channel.serverMetadata?.accessControlList && canPost ? (
              <AclIcon
                className="mr-3 h-4 w-4"
                acl={customAcl || channel.serverMetadata?.accessControlList}
              />
            ) : null}
            <span className="flex flex-col">
              {t('Post')}{' '}
              {channel.serverMetadata?.accessControlList && canPost ? (
                <small className="flex flex-row items-center gap-1 leading-none">
                  <AclSummary acl={customAcl || channel.serverMetadata?.accessControlList} />{' '}
                </small>
              ) : null}
            </span>
          </ActionButton>
        </div>
      </form>
      {error ? <ErrorNotification error={error} /> : null}
    </div>
  );
};

// eslint-disable-next-line react/display-name
export const ChannelOrAclSelector = React.forwardRef(
  (
    {
      className,
      defaultChannelValue,
      defaultAcl,
      onChange,
      disabled,
      excludeMore,
      excludeCustom,
    }: {
      className?: string;
      defaultChannelValue?: string;
      defaultAcl?: AccessControlList;
      onChange: (
        channel: DriveSearchResult<ChannelDefinition> | undefined,
        acl: AccessControlList | undefined
      ) => void;
      disabled?: boolean;
      excludeMore?: boolean;
      excludeCustom?: boolean;
    },
    ref: Ref<HTMLSelectElement>
  ) => {
    const { data: channels, isLoading } = useChannels({ isAuthenticated: true, isOwner: true });
    const [isChnlMgmtOpen, setIsChnlMgmtOpen] = useState(false);
    const [isCustomAclOpen, setIsCustomAclOpen] = useState(false);

    const publicChannel = useMemo(
      () =>
        channels?.find((chnl) =>
          stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, BlogConfig.PublicChannelId)
        ),
      [channels]
    );

    if (isLoading || !channels) {
      // return a different 'loading-select', so we can still use the defaultChannelValue once the channels are loaded
      return (
        <select
          className={`cursor-pointer bg-transparent px-3 py-2 text-sm ${className ?? ''}`}
          defaultValue={defaultChannelValue}
          key={'loading-select'}
        >
          <option>{t('Public Posts')}</option>
        </select>
      );
    }

    const getPublicChannel = () =>
      publicChannel?.fileMetadata.appData.uniqueId || BlogConfig.PublicChannelId;

    const getDefaultChannel = () =>
      channels.find((chnl) =>
        stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, defaultChannelValue)
      )?.fileMetadata.appData.uniqueId || getPublicChannel();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === 'more') {
        setIsChnlMgmtOpen(true);
        e.target.value = getDefaultChannel();
      } else if (e.target.value === 'custom') {
        setIsCustomAclOpen(true);
        // e.target.value = getPublicChannel();
      } else {
        onChange(
          channels.find((chnl) =>
            stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, e.target.value)
          ),
          undefined
        );
      }
    };

    return (
      <>
        <select
          className={`cursor-pointer bg-transparent px-3 py-2 text-sm ${
            disabled ? 'pointer-events-none opacity-50' : ''
          } ${className ?? ''}`}
          defaultValue={
            channels.find((chnl) =>
              stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, defaultChannelValue)
            )?.fileMetadata.appData.uniqueId
          }
          key={'loaded-select'}
          onChange={handleChange}
          ref={ref}
          disabled={disabled}
        >
          <optgroup label={t('Channels')}>
            {channels.map((channel) => (
              <option
                value={channel.fileMetadata.appData.uniqueId}
                key={channel.fileMetadata.appData.uniqueId}
              >
                {channel.fileMetadata.appData.content.name}
              </option>
            ))}
          </optgroup>

          {!excludeMore || !excludeCustom ? (
            <optgroup label={t('Advanced')}>
              {!excludeMore ? (
                <option value={'more'} key={'more'}>
                  {t('More')}...
                </option>
              ) : null}
              {!excludeCustom ? (
                <option value={'custom'} key={'custom'}>
                  {t('Custom')}...
                </option>
              ) : null}
            </optgroup>
          ) : null}
        </select>
        <ChannelsDialog isOpen={isChnlMgmtOpen} onCancel={() => setIsChnlMgmtOpen(false)} />
        <AclDialog
          acl={
            defaultAcl ||
            publicChannel?.serverMetadata?.accessControlList || {
              requiredSecurityGroup: SecurityGroupType.Anonymous,
            }
          }
          title={t('Who can see your post?')}
          onConfirm={(acl) => {
            onChange(publicChannel, acl);
            setIsCustomAclOpen(false);
          }}
          isOpen={isCustomAclOpen}
          onCancel={() => setIsCustomAclOpen(false)}
        />
      </>
    );
  }
);

const ProgressIndicator = ({
  postState,
  processingProgress,
  files,
}: {
  postState: 'uploading' | 'encrypting' | 'error' | undefined;
  processingProgress: number;
  files: number;
}) => {
  if (!postState) return null;

  let progressText = '';
  if (postState === 'uploading')
    if (processingProgress < 1)
      if (files > 1) progressText = t('Generating thumbnails');
      else progressText = t('Generating thumbnail');
    else progressText = t(postState);

  return (
    <div className="mt-2 flex flex-row-reverse">
      {postState === 'error' ? (
        t('Error')
      ) : (
        <span className="animate-pulse text-sm text-foreground text-opacity-40">
          {progressText}
        </span>
      )}
    </div>
  );
};

export default PostComposer;
