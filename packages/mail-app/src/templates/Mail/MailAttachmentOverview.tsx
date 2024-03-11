import { ExtensionThumbnail } from '@youfoundation/common-app';
import { PayloadDescriptor } from '@youfoundation/js-lib/core';
import { OdinPreviewImage } from '@youfoundation/ui-lib';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { MailDrive } from '../../providers/MailProvider';
import { useMailAttachment } from '../../hooks/mail/useMailConversation';

export interface AttachmentItem extends PayloadDescriptor {
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
  if (!files) return null;

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
  const getFileUrl = useMailAttachment().fetchAttachment;

  const doDownload = async (file: AttachmentItem) => {
    const url = await getFileUrl(file.fileId, file.key, file.contentType);
    if (!url) return;
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = file.descriptorContent || file.key || url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  return (
    <div
      key={file.key}
      className={`flex cursor-pointer flex-row items-center gap-2 bg-background transition-colors hover:bg-primary/10 hover:shadow-md ${className || ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        doDownload(file);
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
    </div>
  );
};
