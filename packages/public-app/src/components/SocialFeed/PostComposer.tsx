import {
  AccessControlList,
  BlogConfig,
  ChannelDefinition,
  SecurityGroupType,
} from '@youfoundation/js-lib';
import React, { Ref } from 'react';
import { useRef, useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import useChannels from '../../hooks/blog/useChannels';
import ChannelsDialog from '../Dialog/ChannelsDialog/ChannelsDialog';
import ErrorNotification from '../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionLink from '../ui/Buttons/ActionLink';
import Button from '../ui/Buttons/ActionButton';
import { Article } from '@youfoundation/common-app';
import { FileOverview } from '../Form/Files/FileOverview';
import { FileSelector } from '../Form/Files/FileSelector';
import { getImagesFromPasteEvent, getVideosFromPasteEvent } from '../../helpers/pasteHelper';
import ActionButton from '../ui/Buttons/ActionButton';
import { Lock } from '@youfoundation/common-app';
import { OpenLock } from '@youfoundation/common-app';
import ReactAccessEditorDialog from '../Dialog/ReactAccessEditorDialog/ReactAccessEditorDialog';
import VolatileInput from '../Form/VolatileInput';
import Alert from '../ui/Alerts/Alert/Alert';
import usePostComposer, { ReactAccess } from '../../hooks/socialFeed/post/usePostComposer';

const PostComposer = ({ onPost, className }: { onPost?: () => void; className?: string }) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input

  const { savePost, postState, error } = usePostComposer();
  const selectRef = useRef<HTMLSelectElement>(null);

  const [caption, setCaption] = useState<string>('');
  const [channel, setChannel] = useState<ChannelDefinition>(BlogConfig.PublicChannel);
  const [files, setFiles] = useState<File[]>();
  const [isPublicFiles, setIsPublicFiles] = useState<boolean>(false);

  const [reactAccess, setReactAccess] = useState<ReactAccess>(undefined);
  const [isReactAccessEditorOpen, setIsReactAccessEditorOpen] = useState(false);

  const doPost = async () => {
    await savePost(caption, channel, files, reactAccess, isPublicFiles);

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

  return (
    <div
      className={`mb-3 w-full rounded-md border-gray-200 border-opacity-60 p-4 dark:border-gray-800 lg:border ${
        className ?? ''
      }`}
    >
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
            placeholder={t("What's up?")}
            onPaste={(e) => {
              const mediaFiles = [...getImagesFromPasteEvent(e), ...getVideosFromPasteEvent(e)];

              if (mediaFiles.length) {
                setFiles([...(files ?? []), ...mediaFiles]);
                e.preventDefault();
              }
            }}
            onSubmit={() => {
              doPost();
              return false;
            }}
            key={stateIndex}
          />
        </div>
        <FileOverview files={files} setFiles={setFiles} className="mt-2" />
        <AttachmentAlerts
          files={files}
          acl={channel.acl}
          setIsPublic={setIsPublicFiles}
          isPublic={isPublicFiles}
        />

        {postState ? (
          <div className="flex flex-row-reverse">
            {postState === 'processing' ? (
              <span className="animate-pulse text-sm text-foreground text-opacity-40">
                {t('Processing')}
              </span>
            ) : null}
            {postState === 'uploading' ? (
              <span className="animate-pulse text-sm text-foreground text-opacity-40">
                {t('Uploading')}
              </span>
            ) : null}
            {postState === 'error' ? t('Error') : ''}
          </div>
        ) : null}

        <div className="-m-2 mt-3 flex flex-row flex-wrap items-center md:flex-nowrap">
          <div
            className="m-2 mr-0 text-xl font-extralight leading-4 text-opacity-50"
            title="Attach a file"
          >
            <FileSelector
              onChange={(files) => setFiles(files)}
              accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, video/mp4"
            />
          </div>

          <ActionLink
            type="mute"
            className={`m-2 mx-0 cursor-pointer`}
            size="small"
            href="/home/feed/new"
            title="Convert into an article"
          >
            <Article className="h-4 w-4" />
          </ActionLink>
          <ActionButton
            type="mute"
            className={`m-2 ml-0 cursor-pointer`}
            size="small"
            title="Who can react"
            onClick={(e) => {
              e.preventDefault();
              setIsReactAccessEditorOpen(true);
            }}
          >
            {reactAccess && reactAccess === SecurityGroupType.Owner ? (
              <Lock className="h-4 w-4" />
            ) : (
              <OpenLock className="h-4 w-4" />
            )}
          </ActionButton>
          <ChannelSelector
            className="m-2 ml-auto"
            defaultValue={BlogConfig.PublicChannel.channelId}
            onChange={(channel) => channel && setChannel(channel)}
            ref={selectRef}
          />
          <Button
            className={`m-2 w-full md:w-auto ${
              caption?.length || files?.length
                ? ''
                : 'pointer-events-none hidden opacity-20 grayscale md:flex'
            } ${
              postState === 'processing' || postState === 'uploading'
                ? 'pointer-events-none animate-pulse'
                : ''
            }`}
            icon={'send'}
          >
            {t('Post')}
          </Button>
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
    }: {
      className?: string;
      defaultValue?: string;
      onChange: (channel: ChannelDefinition | undefined) => void;
    },
    ref: Ref<HTMLSelectElement>
  ) => {
    const { data: channels, isLoading } = useChannels();
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
          className={`cursor-pointer bg-transparent px-3 py-2 text-sm ${className ?? ''}`}
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
        >
          {channels.map((channel) => (
            <option value={channel.channelId} key={channel.channelId}>
              {channel.name}
            </option>
          ))}
          <option value={'more'} key={'more'}>
            {t('More')}...
          </option>
        </select>
        <ChannelsDialog isOpen={isChnlMgmtOpen} onCancel={() => setIsChnlMgmtOpen(false)} />
      </>
    );
  }
);

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

const AttachmentAlerts = ({
  files,
  acl,
  isPublic,
  setIsPublic,
}: {
  files?: File[];
  acl?: AccessControlList;
  isPublic: boolean;
  setIsPublic: (isPublic: boolean) => void;
}) => {
  const shouldSecureAttachments =
    acl?.requiredSecurityGroup !== SecurityGroupType.Anonymous &&
    acl?.requiredSecurityGroup !== SecurityGroupType.Authenticated;

  if (!shouldSecureAttachments) return null;

  const isTooLargeAttachments = files?.some((file) => file.size > MEGABYTE * 50);

  if (!isTooLargeAttachments) return null;

  if (isPublic)
    return (
      <Alert type="info" isCompact={true} className="my-2 text-sm">
        {t('the attachments will be publicly available, even if the post is not')}{' '}
        <ActionButton
          type="secondary"
          onClick={(e) => {
            e.preventDefault();
            setIsPublic(false);
          }}
          className="ml-2"
          size="small"
        >
          {t('Cancel')}
        </ActionButton>
      </Alert>
    );

  return (
    <Alert type="warning" isCompact={true} className="my-2 text-sm">
      {t(
        'The attachments are rather large, make the files publicly available for an optimal viewing experience '
      )}{' '}
      <ActionButton
        type="secondary"
        onClick={(e) => {
          e.preventDefault();
          setIsPublic(true);
        }}
        className="ml-2"
        size="small"
      >
        {t('Update')}
      </ActionButton>
    </Alert>
  );
};

export default PostComposer;
