import {
  ExtensionThumbnail,
  FakeAnchor,
  highlightQuery,
  MAIL_ROOT_PATH,
} from '@homebase-id/common-app';
import { PayloadDescriptor } from '@homebase-id/js-lib/core';
import { OdinPreviewImage } from '@homebase-id/ui-lib';
import { useOdinClientContext } from '@homebase-id/common-app';
import { MailDrive } from '../../providers/MailProvider';
import { useNavigate, useParams } from 'react-router-dom';

export interface AttachmentItem extends PayloadDescriptor {
  conversationId: string;
  fileId: string;
}

export const MailAttachmentOverview = ({
  files,
  query,
  maxVisible = 2,
  className,
}: {
  files: AttachmentItem[];
  query?: string | null;
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
          key={`${file.fileId}+${file.key}`}
          query={query}
          className={`rounded-lg border bg-background px-2 py-1 text-sm`}
        />
      ))}
      {countExcludedFromView ? (
        <p className="flex aspect-square h-9 w-9 items-center justify-center rounded-lg bg-background text-sm">
          +{countExcludedFromView}
        </p>
      ) : null}
    </div>
  );
};

export const AttachmentFile = ({
  file,
  className,
  query,
  children,
}: {
  file: AttachmentItem;
  className?: string;
  query?: string | null;
  children?: React.ReactNode;
}) => {
  const odinClient = useOdinClientContext();
  const navigate = useNavigate();
  const { filter } = useParams();

  const fileName =
    (file.contentType !== 'application/vnd.apple.mpegurl' && file.descriptorContent) || file.key;

  return (
    <FakeAnchor
      type="mute"
      key={file.key}
      className={`flex cursor-pointer flex-row items-center gap-2 bg-background transition-colors hover:bg-primary/10 hover:shadow-md ${className || ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        navigate({
          pathname: `${MAIL_ROOT_PATH}/${filter || 'inbox'}/${file.conversationId}/${file.fileId}/${file.key}`,
          search: window.location.search,
        });
      }}
    >
      {file.contentType.startsWith('image/') ? (
        <OdinPreviewImage
          odinClient={odinClient}
          fileId={file.fileId}
          fileKey={file.key}
          targetDrive={MailDrive}
          lastModified={file.lastModified}
          className="h-6 w-6"
        />
      ) : (
        <ExtensionThumbnail contentType={file.contentType} className="h-6 w-6" />
      )}
      <span>{highlightQuery(fileName, query)}</span>
      {children}
    </FakeAnchor>
  );
};
