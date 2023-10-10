import { BlogConfig, ChannelDefinition, EmbeddedPost } from '@youfoundation/js-lib/public';
import React, { Ref, useEffect } from 'react';
import { useRef, useState } from 'react';
import {
  ActionButton,
  ActionLink,
  Arrow,
  AttachmentFile,
  ChannelsDialog,
  EmbeddedPostContent,
  EmojiSelector,
  FileOverview,
  FileSelector,
  Globe,
  ReactAccess,
  ReactAccessEditorDialog,
  VolatileInput,
  getImagesFromPasteEvent,
  getVideosFromPasteEvent,
  t,
  usePostComposer,
} from '@youfoundation/common-app';
import { useChannels } from '@youfoundation/common-app';

import { ErrorNotification } from '@youfoundation/common-app';
import { Article } from '@youfoundation/common-app';

import { Lock } from '@youfoundation/common-app';

import { ActionGroup } from '@youfoundation/common-app';
import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { SecurityGroupType } from '@youfoundation/js-lib/core';

const PostComposer = ({
  onPost,
  embeddedPost,
  className,
}: {
  onPost?: () => void;
  embeddedPost?: EmbeddedPost;
  className?: string;
}) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input

  const { savePost, postState, error } = usePostComposer();
  const selectRef = useRef<HTMLSelectElement>(null);

  const [caption, setCaption] = useState<string>('');
  const [channel, setChannel] = useState<ChannelDefinition>(BlogConfig.PublicChannel);
  const [files, setFiles] = useState<AttachmentFile[]>();

  const [reactAccess, setReactAccess] = useState<ReactAccess>(undefined);
  const [isReactAccessEditorOpen, setIsReactAccessEditorOpen] = useState(false);

  const doPost = async () => {
    await savePost(caption, files, embeddedPost, channel, reactAccess);

    // Reset UI:
    resetUi();

    // Notifiy parent:
    onPost && onPost();
  };

  const resetUi = () => {
    setCaption('');
    setChannel(BlogConfig.PublicChannel);
    setFiles(undefined);
    setStateIndex((i) => i + 1);

    if (selectRef.current) selectRef.current.value = BlogConfig.PublicChannel.channelId;
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
        const file: AttachmentFile = {
          file: {
            name: e.data.note,
            type: e.data.type,
            bytes: bytes,
            size: bytes.length,
          },
        };

        setFiles([...(files ?? []), file]);
      }
    };

    window.addEventListener('message', messageListener);

    return () => window.removeEventListener('message', messageListener);
  }, []);

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
            onSubmit={() => {
              doPost();
              return false;
            }}
            key={stateIndex}
            supportEmojiShortcut={true}
          />
        </div>
        <FileOverview files={files} setFiles={setFiles} className="mt-2" />
        {embeddedPost ? (
          <EmbeddedPostContent content={embeddedPost} className="pointer-events-none mt-4" />
        ) : null}
        {postState ? (
          <div className="flex flex-row-reverse">
            {['processing', 'encrypting', 'uploading'].includes(postState) ? (
              <span className="animate-pulse text-sm text-foreground text-opacity-40">
                {t(postState)}
              </span>
            ) : null}
            {postState === 'error' ? t('Error') : ''}
          </div>
        ) : null}

        <div className="mt-3 flex flex-row flex-wrap items-center gap-2 py-2 md:flex-nowrap">
          {!embeddedPost ? (
            <>
              <div
                className="mr-0 text-xl font-extralight leading-4 text-opacity-50"
                title="Attach a file"
              >
                <FileSelector
                  onChange={(files) => setFiles(files.map((file) => ({ file })))}
                  accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, video/mp4"
                  className="text-foreground hover:text-opacity-70"
                />
              </div>

              <ActionLink
                type="mute"
                className={`px-2 py-1 text-foreground hover:text-opacity-70`}
                size="square"
                href={`/owner/feed/new?caption=${caption}&channel=${channel.channelId}`}
                title="Convert into an article"
              >
                <Article className="h-4 w-4" />
              </ActionLink>
              <EmojiSelector
                className="text-foreground hover:text-opacity-70"
                size="square"
                onInput={(val) => setCaption((oldVal) => `${oldVal} ${val}`)}
              />
              <ActionGroup
                options={[
                  {
                    label: t('Who can react'),
                    icon: reactAccess && reactAccess === SecurityGroupType.Owner ? Lock : Globe,
                    onClick: () => setIsReactAccessEditorOpen(true),
                  },
                ]}
                type="mute"
              />
            </>
          ) : null}
          <ChannelSelector
            className="ml-auto max-w-[35%] flex-shrink"
            defaultValue={BlogConfig.PublicChannel.channelId}
            onChange={(channel) => channel && setChannel(channel)}
            ref={selectRef}
          />
          <ActionButton
            className={`w-full md:w-auto ${
              caption?.length || files?.length || !!embeddedPost
                ? ''
                : 'pointer-events-none hidden opacity-20 grayscale md:flex'
            } ${
              postState === 'processing' || postState === 'uploading'
                ? 'pointer-events-none animate-pulse'
                : ''
            }`}
            icon={Arrow}
          >
            {t('Post')}
          </ActionButton>
        </div>
      </form>
      {error ? <ErrorNotification error={error} /> : null}
      <ReactAccessEditorDialog
        isOpen={isReactAccessEditorOpen}
        onConfirm={(newReactAccess) => {
          setReactAccess(newReactAccess);
          setIsReactAccessEditorOpen(false);
        }}
        onCancel={() => setIsReactAccessEditorOpen(false)}
        title={t('Edit react access')}
        defaultValue={reactAccess}
      />
    </div>
  );
};

// eslint-disable-next-line react/display-name
export const ChannelSelector = React.forwardRef(
  (
    {
      className,
      defaultValue,
      onChange,
      disabled,
      excludeMore,
    }: {
      className?: string;
      defaultValue?: string;
      onChange: (channel: ChannelDefinition | undefined) => void;
      disabled?: boolean;
      excludeMore?: boolean;
    },
    ref: Ref<HTMLSelectElement>
  ) => {
    const { data: channels, isLoading } = useChannels({ isAuthenticated: true, isOwner: true });
    const [isChnlMgmtOpen, setIsChnlMgmtOpen] = useState(false);

    if (isLoading || !channels) {
      // return a different 'loading-select', so we can still use the defaultValue when the channels are loaded
      return (
        <select
          className={`cursor-pointer bg-transparent px-3 py-2 text-sm ${className ?? ''}`}
          defaultValue={defaultValue}
          key={'loading-select'}
        >
          <option>{t('Public Posts')}</option>
        </select>
      );
    }

    return (
      <>
        <select
          className={`cursor-pointer bg-transparent px-3 py-2 text-sm ${
            disabled ? 'pointer-events-none opacity-50' : ''
          } ${className ?? ''}`}
          defaultValue={defaultValue}
          key={'loaded-select'}
          onChange={(e) => {
            if (e.target.value === 'more') {
              setIsChnlMgmtOpen(true);
              e.target.value = BlogConfig.PublicChannel.channelId;
            } else {
              onChange(channels?.find((chnl) => chnl.channelId === e.target.value));
            }
          }}
          ref={ref}
          disabled={disabled}
        >
          {channels.map((channel) => (
            <option value={channel.channelId} key={channel.channelId}>
              {channel.name}
            </option>
          ))}
          {!excludeMore ? (
            <option value={'more'} key={'more'}>
              {t('More')}...
            </option>
          ) : null}
        </select>
        <ChannelsDialog isOpen={isChnlMgmtOpen} onCancel={() => setIsChnlMgmtOpen(false)} />
      </>
    );
  }
);

export default PostComposer;
