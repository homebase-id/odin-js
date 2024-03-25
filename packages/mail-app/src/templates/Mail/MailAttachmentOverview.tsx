import { ExtensionThumbnail, FakeAnchor, highlightQuery } from '@youfoundation/common-app';
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
  query,
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
          key={file.key}
          query={query}
          className={`rounded-lg bg-background px-2 py-1 text-sm`}
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
      <span>{highlightQuery(file.descriptorContent || file.key, query)}</span>
      {children}
    </FakeAnchor>
  );
};
