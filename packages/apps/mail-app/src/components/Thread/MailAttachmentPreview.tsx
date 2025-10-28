import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { MailDrive } from '../../providers/MailProvider';
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import {
  ActionButton,
  BoringFile,
  bytesToSize,
  useDotYouClientContext,
  useFile,
} from '@homebase-id/common-app';
import { OdinImage } from '@homebase-id/ui-lib';
import { formatDateExludingYearIfCurrent } from '@homebase-id/common-app';
import { Times, Download, Loader, ArrowLeft, Arrow } from '@homebase-id/common-app/icons';

export const MailAttachmentPreview = ({
  messageId,
  payloadKey,
}: {
  messageId: string;
  payloadKey: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const { data: mailMessage, isLoading: mailMessageLoading } = useMailConversation({
    messageFileId: messageId,
  }).getMessage;
  const allPayloads = useMemo(() => mailMessage?.fileMetadata.payloads || [], [mailMessage]);
  const payloadDescriptor = allPayloads.find((p) => p.key === payloadKey);

  const rootUrl = window.location.pathname.split('/').slice(0, -1).join('/');
  const currIndex = allPayloads.findIndex((p) => p.key === payloadKey) || 0;
  const doSlide = (dir: 1 | -1) => {
    const dirtyIndex = currIndex + dir;
    let newIndex = dirtyIndex;
    if (allPayloads && dirtyIndex >= allPayloads.length) {
      newIndex = allPayloads.length - 1;

      return;
    }
    if (dirtyIndex < 0) {
      newIndex = 0;

      return;
    }

    navigate({
      pathname: `${rootUrl}/${allPayloads[newIndex].key}`,
      search: window.location.search,
    });
  };

  const navigate = useNavigate();
  const doClose = () =>
    navigate(
      {
        pathname: window.location.pathname.split('/').slice(0, -2).join('/'),
        search: window.location.search,
      },
      {
        preventScrollReset: true,
      }
    );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();

        doSlide(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();

        doSlide(1);
      } else if (e.key === 'Escape') {
        e.preventDefault();

        doClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mailMessage, doSlide]);

  const fileName =
    (payloadDescriptor?.contentType !== 'application/vnd.apple.mpegurl' &&
      payloadDescriptor?.descriptorContent) ||
    payloadDescriptor?.key;
  const getFileUrl = useFile({ targetDrive: MailDrive }).fetchFile;
  const doDownload = async () => {
    const url = await getFileUrl(undefined, undefined, messageId, payloadKey);
    if (!url) return;
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  if (!mailMessageLoading && (!mailMessage || !payloadDescriptor)) return null;

  return (
    <div
      onClick={doClose}
      className={`fixed inset-0 z-50 flex flex-col overflow-auto bg-slate-900 bg-opacity-90 backdrop-blur-sm lg:overflow-hidden`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-row flex-wrap bg-slate-950 px-3 py-3 text-white"
      >
        {payloadDescriptor ? (
          <>
            <div className="flex flex-row items-center gap-2">
              <ActionButton
                icon={Times}
                onClick={doClose}
                className="rounded-full p-3"
                size="square"
                type="secondary"
              />

              <p>
                {fileName}
                <span className="ml-3 border-l border-slate-400 pl-3">
                  {formatDateExludingYearIfCurrent(new Date(payloadDescriptor.lastModified))}
                </span>
              </p>
            </div>
            <div className="ml-auto flex flex-row items-center gap-2">
              <p className="text-sm text-slate-400">
                {bytesToSize(payloadDescriptor.bytesWritten)}
              </p>

              <ActionButton
                icon={Download}
                onClick={doDownload}
                className="rounded-full p-3"
                size="square"
                type="secondary"
              />
            </div>
          </>
        ) : null}
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto my-auto flex w-full max-w-3xl flex-col items-center justify-center"
      >
        {mailMessageLoading || !payloadDescriptor ? (
          <Loader className="h-20 w-20" />
        ) : (
          <>
            {payloadDescriptor.contentType.startsWith('image/') ? (
              <OdinImage
                dotYouClient={dotYouClient}
                fileId={messageId}
                fileKey={payloadKey}
                targetDrive={MailDrive}
                lastModified={payloadDescriptor.lastModified}
                className="rounded object-cover object-center"
              />
            ) : (
              <BoringFile
                targetDrive={MailDrive}
                systemFileType={mailMessage?.fileSystemType}
                fileId={messageId}
                globalTransitId={mailMessage?.fileMetadata.globalTransitId}
                file={payloadDescriptor}
                canDownload={true}
                isPreview={true}
                className="h-full min-h-[inherit] w-full"
              />

              // <div className="flex flex-col items-center justify-center gap-2">
              //   <ExtensionThumbnail
              //     contentType={payloadDescriptor.contentType}
              //     className="h-32 w-32 text-white"
              //   />
              //   <div className="max-w-xs text-white">
              //     <p className="text-sm">
              //       {payloadDescriptor.descriptorContent} (
              //       {bytesToSize(payloadDescriptor.bytesWritten)})
              //     </p>
              //   </div>
              // </div>
            )}

            {currIndex !== 0 ? (
              <ActionButton
                icon={ArrowLeft}
                onClick={() => doSlide(-1)}
                className="absolute left-2 top-[calc(50%-1.25rem)] rounded-full p-3"
                size="square"
                type="secondary"
              />
            ) : null}
            {allPayloads && currIndex !== allPayloads.length - 1 ? (
              <ActionButton
                icon={Arrow}
                onClick={() => doSlide(1)}
                className="absolute right-2 top-[calc(50%-1.25rem)] rounded-full p-3"
                size="square"
                type="secondary"
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
