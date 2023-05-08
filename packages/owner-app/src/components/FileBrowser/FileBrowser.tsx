import {
  AttributeConfig,
  BlogConfig,
  DriveSearchResult,
  HomePageConfig,
  ProfileConfig,
  ReactionConfig,
  SystemFileType,
  TargetDrive,
} from '@youfoundation/js-lib';
import { useEffect, useState } from 'react';
import { t } from '@youfoundation/common-app';
import useFiles from '../../hooks/files/useFiles';
import Section from '../ui/Sections/Section';
import Image from '../Image/Image';
import { AclIcon, AclSummary } from '../Acl/AclEditor/AclEditor';
import { ContactConfig } from '../../provider/contact/ContactTypes';
import { Clipboard, File as FileIcon, Pager } from '@youfoundation/common-app';
import ActionButton from '../ui/Buttons/ActionButton';
import ActionLink from '../ui/Buttons/ActionLink';
import { Download } from '@youfoundation/common-app';

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-5 lg:grid-cols-5">
        {driveData?.pages?.[currentPage - 1]?.searchResults.map((file) => {
          return <File key={file.fileId} file={file} targetDrive={targetDrive} />;
        })}
      </div>
    </Section>
  );
};

const File = ({ targetDrive, file }: { targetDrive: TargetDrive; file: DriveSearchResult }) => {
  const fileType = file.fileMetadata.appData.fileType;
  const contentType = file.fileMetadata.contentType;
  const isImage = ['image/webp', 'image/jpeg'].includes(contentType);
  const contentTypeExtension = contentType.split('/')[1];

  const fetchFile = useFiles({ targetDrive }).fetchFile;
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [downloadPayloadUrl, setDownloadPayloadUrl] = useState<string>();

  return (
    <div className="relative flex flex-col rounded-lg bg-slate-100 p-5 dark:bg-slate-900">
      <span className="absolute right-2 top-2 z-10 bg-indigo-200 p-1 text-[0.7rem] uppercase dark:bg-indigo-800">
        {contentTypeExtension}
      </span>
      {downloadUrl ? (
        <ActionLink
          icon={Download}
          href={downloadUrl}
          download={`${file.fileId}.json`}
          size="square"
          type="primary"
          className="absolute left-2 top-2"
        />
      ) : (
        <ActionButton
          icon={Download}
          onClick={async () => {
            setDownloadUrl(await fetchFile(file));
          }}
          size="square"
          type="secondary"
          className="absolute left-2 top-2"
        />
      )}
      <div className="px-4 py-2 lg:px-5">
        {isImage ? (
          <div className="relative">
            <Image
              targetDrive={targetDrive}
              fileId={file.fileId}
              className="aspect-square w-full object-contain"
            />
            <div
              className="absolute inset-0 flex cursor-pointer flex-row items-center justify-center bg-slate-200 bg-opacity-50 p-2 opacity-0 hover:opacity-100"
              onClick={async () => {
                if (!downloadPayloadUrl) setDownloadPayloadUrl(await fetchFile(file, true));
              }}
            >
              {downloadPayloadUrl ? (
                <ActionLink
                  icon={Download}
                  href={downloadPayloadUrl}
                  download={`${file.fileId}.${contentTypeExtension}`}
                  size="square"
                  type="primary"
                />
              ) : (
                <ActionButton
                  icon={Download}
                  onClick={async () => setDownloadPayloadUrl(await fetchFile(file, true))}
                  size="square"
                  type="mute"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="p-2">
            <FileIcon className="mx-auto h-auto w-full max-w-[2rem] opacity-50" />
          </div>
        )}
      </div>
      <div className="mt-auto">
        <p className="flex flex-row items-center text-sm">
          <AclIcon acl={file.serverMetadata.accessControlList} className="mr-1 h-4 w-4" />
          <AclSummary acl={file.serverMetadata.accessControlList} />
        </p>
        {getLabelFromFileType(fileType)}
        <p className="mt-2 text-xs leading-tight">
          {t('Created')}:
          <span className="block">
            {new Date(file.fileMetadata.created).toLocaleDateString(undefined, dateFormat)}
          </span>
        </p>

        <CopyToClipboardInput textToCopy={file.fileId} />
      </div>
    </div>
  );
};

const getLabelFromFileType = (fileType: number) => {
  switch (fileType) {
    // Profile
    case AttributeConfig.AttributeFileType:
      return 'Profile Attribute';
    case ProfileConfig.ProfileDefinitionFileType:
      return 'Profile Definition';
    case ProfileConfig.ProfileSectionFileType:
      return 'Profile Section';

    // Home
    case HomePageConfig.LinkFileType:
      return 'Link';

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
    case ReactionConfig.EmojiFileType:
      return 'Emoji';

    // Contacts:
    case ContactConfig.ContactFileType:
      return `Contact`;

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
      <input readOnly className="w-full bg-transparent pl-6" value={textToCopy} />
      <div className="absolute bottom-0 left-0 top-0 flex flex-col justify-center">
        <ActionButton
          onClick={() => navigator.clipboard.writeText(textToCopy)}
          type="mute"
          size="square"
          className="-ml-2 opacity-60 hover:opacity-100"
          icon={Clipboard}
        />
      </div>
    </div>
  );
};
