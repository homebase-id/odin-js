import { AttributeConfig, ProfileConfig } from '@homebase-id/js-lib/profile';
import { useEffect, useMemo, useState } from 'react';
import {
  AclIcon,
  AclSummary,
  ExtensionThumbnail,
  HybridLink,
  bytesToSize,
  Image,
  ActionButton,
  t,
  useDotYouClientContext,
} from '@homebase-id/common-app';

import { Exclamation, Trash, Download } from '@homebase-id/common-app/icons';
import {
  DeletedHomebaseFile,
  HomebaseFile,
  PayloadDescriptor,
  SecurityGroupType,
  TargetDrive,
  decryptJsonContent,
  decryptKeyHeader,
} from '@homebase-id/js-lib/core';
import { BlogConfig, ReactionConfig } from '@homebase-id/js-lib/public';
import { ContactConfig } from '@homebase-id/js-lib/network';
import { formatDateExludingYearIfCurrent } from '@homebase-id/common-app';
import { useFile } from '../../../hooks/files/useFiles';
import { drivesEqual } from '@homebase-id/js-lib/helpers';
import {
  SHAMIR_DEALER_SHARD_CONFIG_FILE_TYPE,
  SHAMIR_PLAYER_COLLECTED_SHARD_REQUEST_FILE_TYPE,
  SHAMIR_PLAYER_ENCRYPTED_SHARD_FILE_TYPE,
} from '../../../provider/auth/ShamirProvider';

export const FileCard = ({
  targetDrive,
  file,
  isRow,
}: {
  targetDrive: TargetDrive;
  file: HomebaseFile | DeletedHomebaseFile;
  isRow?: boolean;
}) => {
  const firstPayload = file.fileMetadata.payloads?.[0];
  const canDownload = !file.fileMetadata.dataSource?.payloadsAreRemote;

  const contentType = firstPayload?.contentType || 'application/json';
  const isImage = [
    'image/webp',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml',
    'image/gif',
    'image/heic',
  ].includes(contentType);
  const driveRoot = `/owner/drives/${targetDrive.alias}_${targetDrive.type}`;

  return (
    <div
      className={`relative flex ${isRow ? 'flex-row flex-wrap items-center gap-4' : 'flex-col gap-2'} rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950`}
    >
      <div className={isRow ? 'order-1 flex flex-row items-center gap-2' : 'contents'}>
        <FileExtLabel
          file={file}
          defaultPayload={firstPayload}
          className={`${isRow ? '' : 'absolute right-2 top-2'} z-10 bg-indigo-200 p-1 text-[0.7rem] uppercase dark:bg-indigo-800`}
        />
        <FileDownload
          file={file}
          targetDrive={targetDrive}
          className={`${isRow ? '' : 'absolute left-2 top-2'} z-10`}
        />
        <FileDelete
          file={file}
          targetDrive={targetDrive}
          className={`${isRow ? '' : 'absolute right-2 top-8'} z-10`}
        />
      </div>

      <div className={`${isRow ? 'w-32' : 'px-4 py-2 lg:px-5'} `}>
        <div className="relative">
          {isImage && !drivesEqual(targetDrive, BlogConfig.FeedDrive) ? (
            <div className="flex aspect-square overflow-hidden">
              <Image
                targetDrive={targetDrive}
                fileId={file.fileId}
                fileKey={firstPayload?.key}
                lastModified={file.fileMetadata.updated}
                fit="contain"
                position="center"
                className="m-auto"
                systemFileType={file.fileSystemType}
              />
            </div>
          ) : (
            <div className="flex aspect-square overflow-hidden p-2">
              <ExtensionThumbnail
                contentType={firstPayload?.contentType || 'application/json'}
                className="m-auto h-auto w-full max-w-[2rem] opacity-50"
              />
            </div>
          )}
          {/* TODO: We should see if we can support remote payloads downloading  */}
          {firstPayload && canDownload ? (
            <div className="absolute inset-0 flex cursor-pointer flex-row items-center justify-center bg-slate-200 bg-opacity-50 opacity-0 hover:opacity-100">
              <FileDownload file={file} targetDrive={targetDrive} payloadKey={firstPayload.key} />
            </div>
          ) : null}
        </div>
      </div>
      <div className={isRow ? 'w-24' : ''}>
        <FileTypeLabel file={file} />
        <FileAcl file={file} />
      </div>

      <FileTimestamps file={file} className={isRow ? 'flex w-40 flex-row gap-2' : ''} />
      <FileIds
        file={file}
        isRow={isRow}
        className={isRow ? 'mr-auto w-80' : 'w-full'}
        driveRoot={driveRoot}
      />
      <FileState file={file} className={isRow ? 'absolute right-2 top-2' : ''} />
    </div>
  );
};

const FileExtLabel = ({
  file,
  defaultPayload,
  className,
}: {
  file: HomebaseFile<string> | DeletedHomebaseFile<string>;
  defaultPayload?: PayloadDescriptor;
  className?: string;
}) => {
  const contentType = defaultPayload?.contentType;
  const contentTypeExtension = (contentType || 'application/json').split('/')[1];
  const totalSize = useMemo(
    () => file.fileMetadata.payloads?.reduce((acc, payload) => acc + payload.bytesWritten, 0),
    [file]
  );

  return (
    <span className={className}>
      {totalSize ? <>{bytesToSize(totalSize || 0)} | </> : null}
      {contentTypeExtension}
    </span>
  );
};

const FileDownload = ({
  file,
  payloadKey,
  targetDrive,
  className,
}: {
  file: HomebaseFile<string> | DeletedHomebaseFile<string>;
  payloadKey?: string;
  targetDrive: TargetDrive;
  className?: string;
}) => {
  const fetchFile = useFile({ targetDrive }).fetchFile;
  const doDownload = (url: string) => {
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  return (
    <ActionButton
      icon={Download}
      onClick={async () => {
        doDownload((await fetchFile(file, payloadKey)) || '');
      }}
      size="square"
      type="secondary"
      className={className}
    />
  );
};

const FileDelete = ({
  file,
  targetDrive,
  className,
}: {
  file: HomebaseFile<string> | DeletedHomebaseFile<string>;
  targetDrive: TargetDrive;
  className?: string;
}) => {
  const { mutate: deleteFile } = useFile({
    targetDrive,
    systemFileType: file.fileSystemType,
  }).deleteFile;
  return (
    <ActionButton
      icon={Trash}
      onClick={() => deleteFile(file.fileId)}
      size="square"
      type="mute"
      className={className}
      confirmOptions={{
        title: t('Delete file'),
        body: t('Are you sure you want to delete this file? This action cannot be undone.'),
        buttonText: t('Delete'),
      }}
    />
  );
};

const CHAT_MESSAGE_FILE_TYPE = 7878;
const CHAT_CONVERSATION_FILE_TYPE = 8888;

const MAIL_DRAFT_CONVERSATION_FILE_TYPE = 9001;
const MAIL_CONVERSATION_FILE_TYPE = 9000;

const COMMUNITY_FILE_TYPE = 7010;
const COMMUNITY_MESSAGE_FILE_TYPE = 7020;
const COMMUNITY_CHANNEL_FILE_TYPE = 7015;
const FileTypeLabel = ({ file }: { file: HomebaseFile<string> | DeletedHomebaseFile<string> }) => {
  const fileType = file.fileMetadata.appData.fileType;

  switch (fileType) {
    // Profile
    case AttributeConfig.AttributeFileType:
      return 'Profile Attribute';
    case ProfileConfig.ProfileDefinitionFileType:
      return 'Profile Definition';
    case ProfileConfig.ProfileSectionFileType:
      return 'Profile Section';

    // Posts
    case BlogConfig.PostFileType:
      return 'Post';
    case BlogConfig.DraftPostFileType:
      return 'Draft post';
    case BlogConfig.ChannelDefinitionFileType:
      return 'Channel Definition';
    case BlogConfig.RemoteChannelDefinitionFileType:
      return 'Channel Link';

    // Reactions
    case ReactionConfig.CommentFileType:
      return 'Comment';

    // Contacts:
    case ContactConfig.ContactFileType:
      return `Contact`;

    // Chat:
    case CHAT_MESSAGE_FILE_TYPE:
      return 'Chat Message';
    case CHAT_CONVERSATION_FILE_TYPE:
      return 'Chat Conversation';

    // Mail:
    case MAIL_CONVERSATION_FILE_TYPE:
      return 'Mail Conversation';
    case MAIL_DRAFT_CONVERSATION_FILE_TYPE:
      return 'Draft Mail Conversation';

    // Community:
    case COMMUNITY_CHANNEL_FILE_TYPE:
      return 'Community Channel';
    case COMMUNITY_FILE_TYPE:
      return 'Community Defintion';
    case COMMUNITY_MESSAGE_FILE_TYPE:
      return 'Community Message';

    // Shamir password recovery
    case SHAMIR_DEALER_SHARD_CONFIG_FILE_TYPE:
      return 'Password Recovery Dealer Shard Config';
    case SHAMIR_PLAYER_ENCRYPTED_SHARD_FILE_TYPE:
      return 'Password Recovery Player Encrypted Shard';

    case SHAMIR_PLAYER_COLLECTED_SHARD_REQUEST_FILE_TYPE:
      return 'Password Recovery Collected Shard Request File';

    // Assets
    case 0:
      return 'Asset';

    default:
      return `Unknown: ${fileType}`;
  }
};

const FileTimestamps = ({
  file,
  className,
}: {
  file: HomebaseFile<string> | DeletedHomebaseFile<string>;
  className?: string;
}) => {
  return (
    <div className={className}>
      <p className="mt-2 text-xs leading-tight">
        {t('Created')}:
        <span className="block">
          {formatDateExludingYearIfCurrent(new Date(file.fileMetadata.created))}
        </span>
      </p>
      <p className="mt-2 text-xs leading-tight">
        {t('Modified')}:
        <span className="block">
          {formatDateExludingYearIfCurrent(new Date(file.fileMetadata.updated))}
        </span>
      </p>
    </div>
  );
};

const FileIds = ({
  file,
  className,
  isRow,
  driveRoot,
}: {
  file: HomebaseFile<string> | DeletedHomebaseFile<string>;
  className?: string;
  isRow?: boolean;
  driveRoot?: string;
}) => {
  const IdWrapper = (label: string, id: string) => {
    return (
      <HybridLink
        className={`relative flex ${isRow ? 'flex-row items-center gap-2' : 'flex-col'} group justify-between`}
        href={`${driveRoot}/${file.fileSystemType.toLowerCase() === 'comment' ? 'comment/' : ''}${id}`}
      >
        <span className="flex-shrink-0 text-sm">{label}:</span>
        <p className="ml-auto bg-transparent font-mono text-xs text-slate-400 group-hover:underline">
          {id}
        </p>
      </HybridLink>
    );
  };

  return (
    <div className={`${className || ''}`}>
      {IdWrapper(t('File'), file.fileId)}
      {file.fileMetadata.globalTransitId
        ? IdWrapper(t('Global'), file.fileMetadata.globalTransitId)
        : null}
      {file.fileMetadata.appData.uniqueId
        ? IdWrapper(t('Unique'), file.fileMetadata.appData.uniqueId)
        : null}
    </div>
  );
};

const FileState = ({
  file,
  className,
}: {
  file: HomebaseFile<string> | DeletedHomebaseFile<string>;
  className?: string;
}) => {
  const [isBroken, setIsBroken] = useState(false);
  const dotYouClient = useDotYouClientContext();
  useEffect(() => {
    (async () => {
      try {
        const keyheader = file.fileMetadata.isEncrypted
          ? await decryptKeyHeader(dotYouClient, file.sharedSecretEncryptedKeyHeader)
          : undefined;
        const parsedContent = await decryptJsonContent(file.fileMetadata, keyheader);

        setIsBroken(
          file.fileMetadata?.appData.content?.length &&
            file.fileMetadata.isEncrypted &&
            typeof parsedContent === 'object'
            ? Object.keys(parsedContent).length === 0
            : false
        );
      } catch (e) {
        console.warn('[FileCard] Failed to decrypt file', e);
        setIsBroken(true);
      }
    })();
  });

  if (!isBroken) return null;
  return (
    <div className={`${className} flex flex-row items-center gap-1`}>
      <Exclamation className="h-4 w-4 text-red-600" />
      <p className="text-red-500">{t('Broken content')}</p>
    </div>
  );
};

const FileAcl = ({ file }: { file: HomebaseFile<string> | DeletedHomebaseFile<string> }) => {
  return (
    <p className="flex flex-row items-center text-sm">
      <AclIcon
        acl={
          file.serverMetadata?.accessControlList || {
            requiredSecurityGroup: SecurityGroupType.Owner,
          }
        }
        className="mr-1 h-4 w-4 opacity-60"
      />
      <AclSummary
        acl={
          file.serverMetadata?.accessControlList || {
            requiredSecurityGroup: SecurityGroupType.Owner,
          }
        }
      />
    </p>
  );
};
