import {
  BlogConfig,
  ChannelDefinition,
  EmbeddedPost,
  ReactAccess,
} from '@youfoundation/js-lib/public';
import React, { Ref, useEffect, useMemo } from 'react';
import { useRef, useState } from 'react';
import { base64ToUint8Array, isTouchDevice, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import {
  AccessControlList,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
} from '@youfoundation/js-lib/core';
import { AclIcon, AclSummary, AclDialog } from '../../acl';
import { ChannelsDialog } from '../../channels';
import { VolatileInput, FileOverview, FileSelector } from '../../form';
import { t, getImagesFromPasteEvent, getVideosFromPasteEvent } from '../../helpers';
import {
  useDotYouClient,
  usePostComposer,
  useChannels,
  useCollaborativeChannels,
} from '../../hooks';
import {
  ActionGroup,
  Globe,
  Article,
  Pencil,
  ActionButton,
  Arrow,
  ErrorNotification,
  Lock,
} from '../../ui';
import { EmbeddedPostContent } from '../Blocks/Body/EmbeddedPostContent';
import { EmojiSelector } from '../Blocks/Interacts/EmojiPicker/EmojiSelector';

const FEED_ROOT_PATH = '/apps/feed';
const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;
const STORAGE_SKIP_NEXT_KEY = 'feed-skip-next-time';

export const PostComposer = ({
  onPost,
  embeddedPost,
  forcedChannel,
  className,
  excludeCustom,
}: {
  onPost?: () => void;
  embeddedPost?: EmbeddedPost;
  forcedChannel?: HomebaseFile<ChannelDefinition>;
  className?: string;
  excludeCustom?: boolean;
}) => {
  const { isOwner, getIdentity } = useDotYouClient();
  const identity = getIdentity();
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input

  const { savePost, postState, processingProgress, error } = usePostComposer();
  const selectRef = useRef<HTMLSelectElement>(null);

  const [caption, setCaption] = useState<string>('');

  const [targetChannel, setTargetChannel] = useState<{
    channel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
    overrideAcl?: AccessControlList | undefined;
    odinId?: string | undefined;
  }>({
    channel: forcedChannel || BlogConfig.PublicChannelNewDsr,
  });

  const [files, setFiles] = useState<NewMediaFile[]>();
  const [reactAccess, setReactAccess] = useState<ReactAccess | undefined>(undefined);

  const skipConfirmation = window.localStorage.getItem(STORAGE_SKIP_NEXT_KEY) === 'true';
  const isPosting = postState === 'uploading' || postState === 'encrypting';
  const doPost = async (_e?: unknown, skipNextTime?: boolean) => {
    if (skipNextTime) window.localStorage.setItem(STORAGE_SKIP_NEXT_KEY, 'true');

    if (isPosting) return;
    await savePost(caption, files, embeddedPost, targetChannel, reactAccess);
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
                  accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif, video/mp4, application/pdf"
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
                  isOwner
                    ? {
                        label: t('Create new article'),
                        href: `${FEED_ROOT_PATH}/new?caption=${caption}&channel=${targetChannel.channel.fileMetadata.appData.uniqueId}`,
                        icon: Article,
                      }
                    : undefined,

                  isOwner
                    ? {
                        label: t('List my articles'),
                        href: `${FEED_ROOT_PATH}/articles`,
                        icon: Pencil,
                      }
                    : undefined,

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
                ]}
              />
            </>
          ) : null}
          <div className="ml-auto"></div>
          {!forcedChannel ? (
            <ChannelOrAclSelector
              className="max-w-[35%] flex-shrink"
              defaultChannelValue={
                targetChannel.channel?.fileMetadata?.appData?.uniqueId || BlogConfig.PublicChannelId
              }
              defaultAcl={targetChannel.overrideAcl}
              onChange={(newTarget) => {
                setTargetChannel((current) => ({
                  ...current,
                  ...newTarget,
                  channel: newTarget.channel || current.channel,
                }));
              }}
              excludeMore={true}
              excludeCustom={excludeCustom}
              ref={selectRef}
            />
          ) : null}
          <ActionButton
            className={`w-full md:w-auto ${
              canPost ? '' : 'pointer-events-none hidden opacity-20 grayscale md:flex'
            } ${postState === 'uploading' ? 'pointer-events-none animate-pulse' : ''}`}
            icon={Arrow}
            confirmOptions={
              stringGuidsEqual(
                targetChannel.channel.fileMetadata.appData.uniqueId,
                BlogConfig.PublicChannelId
              ) && !skipConfirmation
                ? {
                    title: t('Post'),
                    buttonText: t('Post'),
                    body: t(
                      'Posting this, will make it publicly available on your identity {0}. \n\nIf you want to hide this post from anonymos users, you have to change the security settings from the dropdown first.',
                      `${identity}`
                    ),
                    type: 'info',
                    allowSkipNextTime: true,
                  }
                : undefined
            }
            onClick={doPost}
          >
            {targetChannel.channel.serverMetadata?.accessControlList && canPost ? (
              <AclIcon
                className="mr-3 h-5 w-5"
                acl={
                  targetChannel.overrideAcl ||
                  targetChannel.channel.serverMetadata?.accessControlList
                }
              />
            ) : null}
            <span className="flex flex-col">
              {t('Post')}{' '}
              {targetChannel.channel.serverMetadata?.accessControlList && canPost ? (
                <small className="flex flex-row items-center gap-1 leading-none">
                  <AclSummary
                    acl={
                      targetChannel.overrideAcl ||
                      targetChannel.channel.serverMetadata?.accessControlList
                    }
                  />{' '}
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
      excludeCollaborative,
    }: {
      className?: string;
      defaultChannelValue?: string;
      defaultAcl?: AccessControlList;
      onChange: (data: {
        odinId: string | undefined;
        channel: HomebaseFile<ChannelDefinition> | undefined;
        acl: AccessControlList | undefined;
      }) => void;
      disabled?: boolean;
      excludeMore?: boolean;
      excludeCustom?: boolean;
      excludeCollaborative?: boolean;
    },
    ref: Ref<HTMLSelectElement>
  ) => {
    const identity = useDotYouClient().getIdentity();
    const { data: channels, isLoading } = useChannels({ isAuthenticated: true, isOwner: true });
    const { data: collaborativeChannels } = useCollaborativeChannels().fetch;
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
          <option>{t('Main')}</option>
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
      } else {
        const localChannel = channels.find((chnl) =>
          stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, e.target.value)
        );
        if (localChannel) {
          onChange({
            channel: localChannel,
            acl: undefined,
            odinId: undefined,
          });
          return;
        }

        const collaborativeChannel = collaborativeChannels?.find((collaborative) =>
          collaborative.channels.find((channel) =>
            stringGuidsEqual(channel.fileMetadata.appData.uniqueId, e.target.value)
          )
        );
        if (collaborativeChannel) {
          onChange({
            channel: collaborativeChannel.channels.find((channel) =>
              stringGuidsEqual(channel.fileMetadata.appData.uniqueId, e.target.value)
            ),
            acl: undefined,
            odinId: collaborativeChannel.odinId,
          });
          return;
        }
      }
    };

    const showCollaborativeChannels = !excludeCollaborative && collaborativeChannels?.length;

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
          <optgroup label={showCollaborativeChannels ? identity || '' : t('Channels')}>
            {channels.map((channel) => (
              <option
                value={channel.fileMetadata.appData.uniqueId}
                key={channel.fileMetadata.appData.uniqueId}
              >
                {channel.fileMetadata.appData.content.name}
              </option>
            ))}

            {!excludeCustom ? (
              <option value={'custom'} key={'custom'}>
                ⚙️ {t('Custom')} ...
              </option>
            ) : null}
          </optgroup>

          {showCollaborativeChannels ? (
            <>
              {collaborativeChannels?.map((collaborative) => (
                <optgroup label={collaborative.odinId} key={collaborative.odinId}>
                  {collaborative.channels.map((channel) => (
                    <option
                      value={channel.fileMetadata.appData.uniqueId}
                      key={channel.fileMetadata.appData.uniqueId}
                    >
                      {channel.fileMetadata.appData.content.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </>
          ) : null}

          {!excludeMore ? (
            <optgroup label={t('Advanced')}>
              {!excludeMore ? (
                <option value={'more'} key={'more'}>
                  {t('More')}...
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
            console.log('custom acl', acl);
            onChange({ channel: publicChannel, acl, odinId: undefined });
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
