import { AttributeConfig, ProfileConfig } from '@youfoundation/js-lib/profile';
import { useEffect, useMemo, useState } from 'react';
import { AclIcon, AclSummary, ExtensionThumbnail, Trash, t } from '@youfoundation/common-app';
import { useFile, useFiles } from '../../hooks/files/useFiles';
import Section from '../ui/Sections/Section';
import { Clipboard, Pager } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { Download, Image } from '@youfoundation/common-app';
import {
  DeletedHomebaseFile,
  HomebaseFile,
  SecurityGroupType,
  SystemFileType,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { BlogConfig, ReactionConfig } from '@youfoundation/js-lib/public';
import { ContactConfig } from '@youfoundation/js-lib/network';
import { formatDateExludingYearIfCurrent } from '@youfoundation/common-app/src/helpers/timeago/format';

const FileBrowser = ({
  targetDrive,
  systemFileType,
}: {
  targetDrive: TargetDrive;
  systemFileType?: SystemFileType;
}) => {
  const {
    data: driveData,
    hasNextPage: hasNextPageOnServer,
    fetchNextPage,
    isFetchedAfterMount,
  } = useFiles({ targetDrive, systemFileType }).fetch;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isFetchedAfterMount) {
      return;
    }

    if (driveData?.pages[currentPage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [currentPage, isFetchedAfterMount]);

  const hasNextPage = driveData?.pages[currentPage] || hasNextPageOnServer;

  if (
    isFetchedAfterMount &&
    (!driveData?.pages?.length || !driveData?.pages?.[0].searchResults?.length)
  ) {
    return null;
  }

  const currentPageData = driveData?.pages?.[currentPage - 1];
  return (
    <Section
      title={`${t('Files')}${systemFileType ? ` (${systemFileType})` : ''}:`}
      actions={
        <Pager
          currentPage={currentPage}
          setPage={setCurrentPage}
          totalPages={hasNextPage ? currentPage + 1 : currentPage}
        />
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {currentPageData?.searchResults.map((file) => (
          <File key={file.fileId} file={file} targetDrive={targetDrive} />
        ))}
      </div>
    </Section>
  );
};

export const bytesToSize = (bytes: number) => {
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(2)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const File = ({
  targetDrive,
  file,
}: {
  targetDrive: TargetDrive;
  file: HomebaseFile | DeletedHomebaseFile;
}) => {
  const fileType = file.fileMetadata.appData.fileType;
  const firstPayload = file.fileMetadata.payloads?.[0];
  const contentType = firstPayload?.contentType || 'application/json';
  const isImage = ['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/gif'].includes(
    contentType
  );
  const contentTypeExtension = (contentType || 'application/json').split('/')[1];
  const totalSize = useMemo(
    () => file.fileMetadata.payloads?.reduce((acc, payload) => acc + payload.bytesWritten, 0),
    [file]
  );

  const fetchFile = useFile({ targetDrive }).fetchFile;
  const { mutate: deleteFile } = useFile({
    targetDrive,
    systemFileType: file.fileSystemType,
  }).deleteFile;

  const doDownload = (url: string) => {
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  return (
    <div className="relative flex flex-col rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="absolute right-2 top-2 z-10 bg-indigo-200 p-1 text-[0.7rem] uppercase dark:bg-indigo-800">
        {totalSize ? <>{bytesToSize(totalSize || 0)} | </> : null}
        {contentTypeExtension}
      </span>

      <ActionButton
        icon={Download}
        onClick={async () => {
          doDownload((await fetchFile(file)) || '');
        }}
        size="square"
        type="secondary"
        className="absolute left-2 top-2 z-10"
      />

      <ActionButton
        icon={Trash}
        onClick={() => deleteFile(file.fileId)}
        size="square"
        type="mute"
        className="absolute right-2 top-8 z-10"
        confirmOptions={{
          title: t('Delete file'),
          buttonText: t('Delete'),
          trickQuestion: {
            question: t(
              'Are you sure you want to delete this file? This action cannot be undone (type "yes" to confirm)'
            ),
            answer: 'yes',
          },
        }}
      />

      <div className="px-4 py-2 lg:px-5">
        {isImage ? (
          <div className="relative">
            <div className="flex aspect-square overflow-hidden">
              <Image
                targetDrive={targetDrive}
                fileId={file.fileId}
                fileKey={firstPayload.key}
                lastModified={file.fileMetadata.updated}
                fit="contain"
                position="center"
                className="m-auto"
              />
            </div>
            <div
              className="absolute inset-0 flex cursor-pointer flex-row items-center justify-center bg-slate-200 bg-opacity-50 p-2 opacity-0 hover:opacity-100"
              onClick={async () => doDownload((await fetchFile(file, firstPayload.key)) || '')}
            >
              <ActionButton
                icon={Download}
                onClick={async () => doDownload((await fetchFile(file, firstPayload.key)) || '')}
                size="square"
                type="mute"
              />
            </div>
          </div>
        ) : (
          <div className="flex aspect-square overflow-hidden p-2">
            <ExtensionThumbnail
              contentType={firstPayload?.contentType || 'application/json'}
              className="m-auto h-auto w-full max-w-[2rem] opacity-50"
            />
          </div>
        )}
      </div>
      <div className="mt-auto">
        {getLabelFromFileType(fileType)}

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

        <CopyToClipboardInput textToCopy={file.fileId} />
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
      </div>
    </div>
  );
};

const CHAT_MESSAGE_FILE_TYPE = 7878;
const CHAT_CONVERSATION_FILE_TYPE = 8888;

const MAIL_DRAFT_CONVERSATION_FILE_TYPE = 9001;
const MAIL_CONVERSATION_FILE_TYPE = 9000;
const getLabelFromFileType = (fileType: number) => {
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

    // Assets
    case 0:
      return 'Asset';

    default:
      return `Unknown: ${fileType}`;
  }
};

export default FileBrowser;

const CopyToClipboardInput = ({ textToCopy }: { textToCopy: string }) => {
  return (
    <div className="relative w-full">
      <input readOnly className="w-full bg-transparent pl-6 text-sm" value={textToCopy} />
      <div className="absolute bottom-0 left-0 top-0 flex flex-col justify-center">
        <ActionButton
          onClick={() => navigator.clipboard.writeText(textToCopy)}
          type="mute"
          size="none"
          className="opacity-60 hover:opacity-100"
        >
          <Clipboard className="h-4 w-4" />
        </ActionButton>
      </div>
    </div>
  );
};
