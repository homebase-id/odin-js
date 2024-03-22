import { ExtensionThumbnail, FakeAnchor } from '@youfoundation/common-app';
import { PayloadDescriptor } from '@youfoundation/js-lib/core';
import { OdinPreviewImage } from '@youfoundation/ui-lib';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { MailDrive } from '../../providers/MailProvider';
import { ROOT_PATH } from '../../app/App';
import { useNavigate, useParams } from 'react-router-dom';

export interface AttachmentItem extends PayloadDescriptor {
  conversationId: string;
  fileId: string;
}

export const MailAttachmentOverview = ({
  files,
  maxVisible = 2,
  className,
}: {
  files: AttachmentItem[];
  maxVisible?: number | null;
  className?: string;
}) => {
  if (!files || !files.length) return null;

  const slicedFiles = maxVisible && files.length > maxVisible ? files.slice(0, maxVisible) : files;
  const countExcludedFromView = files.length - slicedFiles.length;

  return (
    <div className={`flex flex-row flex-wrap items-center gap-2 ${className || ''}`}>
      {slicedFiles.map((file) => (
        <AttachmentFile
          file={file}
          key={file.key}
          className={`rounded-full border border-slate-200 bg-background px-3 py-1 dark:border-slate-700`}
        />
      ))}
      {countExcludedFromView ? (
        <p className="flex aspect-square h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-background text-sm dark:border-slate-700">
          +{countExcludedFromView}
        </p>
      ) : null}
    </div>
  );
};

export const AttachmentFile = ({
  file,
  className,
  children,
}: {
  file: AttachmentItem;
  className?: string;
  children?: React.ReactNode;
}) => {
  const dotYouClient = useDotYouClientContext();
  const navigate = useNavigate();
  const { filter } = useParams();

  return (
    <FakeAnchor
      type="mute"
      key={file.key}
      className={`flex cursor-pointer flex-row items-center gap-2 bg-background transition-colors hover:bg-primary/10 hover:shadow-md ${className || ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(
          `${ROOT_PATH}/${filter || 'inbox'}/${file.conversationId}/${file.fileId}/${file.key}${window.location.search}`
        );
        navigate({
          pathname: `${ROOT_PATH}/${filter || 'inbox'}/${file.conversationId}/${file.fileId}/${file.key}`,
          search: window.location.search,
        });
      }}
    >
      {file.contentType.startsWith('image/') ? (
        <OdinPreviewImage
          dotYouClient={dotYouClient}
          fileId={file.fileId}
          fileKey={file.key}
          targetDrive={MailDrive}
          lastModified={file.lastModified}
          className="h-6 w-6"
        />
      ) : (
        <ExtensionThumbnail contentType={file.contentType} className="h-6 w-6" />
      )}
      {file.descriptorContent || file.key}
      {children}
    </FakeAnchor>
  );
};
