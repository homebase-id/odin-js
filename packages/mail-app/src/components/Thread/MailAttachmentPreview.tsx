import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ActionButton,
  Arrow,
  ArrowLeft,
  Download,
  ExtensionThumbnail,
  Loader,
  Times,
} from '@youfoundation/common-app';
import { useOutsideTrigger } from '@youfoundation/common-app';
import { MailDrive } from '../../providers/MailProvider';
import { useMailAttachment, useMailConversation } from '../../hooks/mail/useMailConversation';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { OdinImage } from '@youfoundation/ui-lib';

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

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => doClose());

  const getFileUrl = useMailAttachment().fetchAttachment;
  const doDownload = async () => {
    const url = await getFileUrl(messageId, payloadKey, payloadDescriptor?.contentType as string);
    if (!url) return;
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download =
      payloadDescriptor?.descriptorContent || payloadKey || url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  if (!mailMessageLoading && (!mailMessage || !payloadDescriptor)) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-auto bg-page-background bg-opacity-90 backdrop-blur-sm lg:overflow-hidden`}
    >
      <div
        className="mx-auto my-auto flex w-full max-w-3xl flex-col items-center justify-center"
        ref={wrapperRef}
      >
        {mailMessageLoading || !payloadDescriptor ? (
          <Loader className="h-20 w-20" />
        ) : (
          <>
            <ActionButton
              icon={Times}
              onClick={doClose}
              className="fixed left-2 top-2 rounded-full p-3"
              size="square"
            />
            <ActionButton
              icon={Download}
              onClick={doDownload}
              className="fixed right-2 top-2 rounded-full p-3"
              size="square"
            />

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
              <ExtensionThumbnail
                contentType={payloadDescriptor.contentType}
                className="h-32 w-32"
              />
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
