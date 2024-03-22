import { useState } from 'react';
import { createPortal } from 'react-dom';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import {
  Chevron,
  ConnectionImage,
  DialogWrapper,
  Envelope,
  ExtensionThumbnail,
  FakeAnchor,
  ImageIcon,
  OwnerImage,
  t,
  usePortal,
} from '@youfoundation/common-app';
import { MailConversation, MailDrive } from '../../providers/MailProvider';
import { AttachmentItem } from './MailAttachmentOverview';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { OdinPreviewImage } from '@youfoundation/ui-lib';
import { useNavigate, useParams } from 'react-router-dom';
import { ROOT_PATH } from '../../app/App';
import { formatDateExludingYearIfCurrent } from '@youfoundation/common-app/src/helpers/timeago/format';

export const MailAttachmentsInfo = ({
  mailThread,
  onClose,
}: {
  mailThread: HomebaseFile<MailConversation>[];
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const lastMessage = mailThread[mailThread.length - 1];
  if (!lastMessage) return null;
  const lastMessageContent = lastMessage.fileMetadata.appData.content;

  const allAttachmentsChronologically = mailThread.flatMap((conversation) =>
    conversation.fileMetadata.payloads.map((payload) => ({
      ...payload,
      fileId: conversation.fileId,
      conversationId: conversation.fileMetadata.appData.groupId as string,
      created: conversation.fileMetadata.created,
      sender:
        conversation.fileMetadata.senderOdinId || conversation.fileMetadata.appData.content.sender,
    }))
  );

  const groupedWithFileName = allAttachmentsChronologically.reduce(
    (acc, file) => {
      const fileName = file.descriptorContent || file.key;
      if (!acc[fileName]) acc[fileName] = [];
      acc[fileName].push(file);
      return acc;
    },
    {} as Record<string, typeof allAttachmentsChronologically>
  );

  const dialog = (
    <DialogWrapper
      onClose={onClose}
      keepOpenOnBlur={true}
      title={
        <>
          {t('Attachments')}
          <small className="block text-sm text-slate-400">
            &quot;{lastMessageContent.subject}&quot;
          </small>
        </>
      }
    >
      {Object.entries(groupedWithFileName).length ? (
        <div className="flex flex-col-reverse gap-2">
          {Object.entries(groupedWithFileName).map(([fileName, files]) => (
            <FileGroup files={files} fileName={fileName} key={fileName} onClose={onClose} />
          ))}
        </div>
      ) : (
        <p className="italic opacity-50">{t('No attachments found')}</p>
      )}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

interface ExtendedFile extends AttachmentItem {
  created: number;
  sender: string;
}

const FileGroup = ({
  files,
  fileName,
  onClose,
}: {
  files: ExtendedFile[];
  fileName: string;
  onClose?: () => void;
}) => {
  const navigate = useNavigate();
  const dotYouClient = useDotYouClientContext();

  const hasMultiple = files.length > 1;

  const [showAll, setShowAll] = useState(!hasMultiple);
  const firstFile = files[0];
  return (
    <>
      {hasMultiple ? (
        <button
          className="flex flex-row items-center gap-2 rounded-full border border-slate-200 bg-background px-3 py-2 transition-colors hover:bg-primary/10 hover:shadow-md dark:border-slate-700"
          onClick={() => setShowAll(!showAll)}
        >
          {firstFile.contentType.startsWith('image/') ? (
            <OdinPreviewImage
              dotYouClient={dotYouClient}
              fileId={firstFile.fileId}
              fileKey={firstFile.key}
              targetDrive={MailDrive}
              lastModified={firstFile.lastModified}
              className="h-6 w-6"
            />
          ) : (
            <ExtensionThumbnail contentType={firstFile.contentType} className="h-6 w-6" />
          )}
          {fileName}
          <div className="ml-auto flex-shrink-0 text-slate-400">{t('Multiple versions')}</div>
          <Chevron
            className={`h-4 w-4 transition-transform ${showAll ? 'rotate-90' : 'rotate-0'}`}
          />
        </button>
      ) : null}
      {showAll ? (
        <div
          className={
            hasMultiple
              ? `ml-2 flex flex-col gap-2 border-l-8 border-l-primary/30 pl-2`
              : `contents`
          }
          onClick={onClose}
        >
          {files.map((file) => (
            <AttachmentFile file={file} key={`${file.created}_${file.key}`} />
          ))}
        </div>
      ) : null}
    </>
  );
};

const bytesToSize = (bytes: number) => {
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(2)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const AttachmentFile = ({ file }: { file: ExtendedFile }) => {
  const dotYouClient = useDotYouClientContext();
  const identity = dotYouClient.getIdentity();
  const navigate = useNavigate();
  const { filter } = useParams();

  return (
    <FakeAnchor
      type="mute"
      key={file.key}
      className={`flex cursor-pointer flex-row items-center gap-2
      rounded-md border border-slate-200 bg-background px-1 py-1
      transition-colors hover:bg-primary/10 hover:shadow-md dark:border-slate-700`}
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
          className="h-12 w-12"
        />
      ) : (
        <ExtensionThumbnail contentType={file.contentType} className="h-12 w-12" />
      )}

      <div className="flex flex-col">
        {file.descriptorContent || file.key}
        <p className="text-sm text-slate-400">
          {bytesToSize(file.bytesWritten)}
          <span className="ml-1 border-l border-slate-400 pl-1">
            {formatDateExludingYearIfCurrent(new Date(file.created))}
          </span>
        </p>
      </div>
      <div className="ml-auto flex flex-row items-center gap-2">
        {identity === file.sender ? (
          <OwnerImage className="h-10 w-10" />
        ) : (
          <ConnectionImage className="h-10 w-10" odinId={file.sender} />
        )}

        <div className="">
          <div className="flex flex-row"></div>

          <div className="flex flex-row">
            <button
              className="-my-2 px-2 py-2 opacity-40 transition-opacity hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`${ROOT_PATH}/inbox/${file.conversationId}/${file.fileId}`);
              }}
            >
              <Envelope className="h-4 w-4" />
            </button>
            <button className="-my-2 px-2 py-2 opacity-40 transition-opacity hover:opacity-100">
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </FakeAnchor>
  );
};
