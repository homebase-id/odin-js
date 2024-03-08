import { ExtensionThumbnail } from '@youfoundation/common-app';
import { PayloadDescriptor } from '@youfoundation/js-lib/core';
import { OdinPreviewImage } from '@youfoundation/ui-lib';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { MailDrive } from '../../providers/MailProvider';

interface AttachmentItem extends PayloadDescriptor {
  fileId: string;
}

export const MailAttachmentOverview = ({
  files,
  maxVisible = 2,
  className,
}: {
  files: AttachmentItem[];
  maxVisible?: number;
  className?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  if (!files) return null;

  const slicedFiles = files.length > maxVisible ? files.slice(0, maxVisible) : files;
  const countExcludedFromView = files.length - slicedFiles.length;

  return (
    <div className={`flex flex-row items-center gap-2 ${className || ''}`}>
      {files.map((file) => {
        return (
          <div
            key={file.key}
            className="flex cursor-pointer flex-row items-center gap-2 rounded-full border border-slate-200 bg-background px-3 py-2 dark:border-slate-700"
            // onClick
          >
            {file.contentType.startsWith('image/') ? (
              <OdinPreviewImage
                dotYouClient={dotYouClient}
                fileId={file.fileId}
                fileKey={file.key}
                targetDrive={MailDrive}
                lastModified={file.lastModified}
                className="h-4 w-4"
              />
            ) : (
              <ExtensionThumbnail contentType={file.contentType} />
            )}
            {file.key}
          </div>
        );
      })}
      {countExcludedFromView ? (
        <p className="flex aspect-square h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-background text-sm dark:border-slate-700">
          +{countExcludedFromView}
        </p>
      ) : null}
    </div>
  );
};
