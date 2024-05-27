import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../../../providers/ChatProvider';
import {
  ActionButton,
  Arrow,
  ArrowLeft,
  BoringFile,
  Times,
  usePortal,
} from '@youfoundation/common-app';
import { ChatDrive } from '../../../../providers/ConversationProvider';
import { OdinImage, OdinVideo } from '@youfoundation/ui-lib';
import { useNavigate, useParams } from 'react-router-dom';
import { useDotYouClientContext } from '../../../../hooks/auth/useDotYouClientContext';

export const ChatMediaGallery = ({ msg }: { msg: HomebaseFile<ChatMessage> }) => {
  const target = usePortal('modal-container');
  const dotYouClient = useDotYouClientContext();

  const navigate = useNavigate();
  const { mediaKey } = useParams();

  if (!mediaKey) return null;

  const paths = window.location.pathname.split('/');
  const onClose = () => {
    const toPaths = [...paths];
    toPaths.pop();
    toPaths.pop();
    navigate(toPaths.join('/'));
  };

  const allkeys = msg.fileMetadata.payloads.map((p) => p.key);
  const nextKey = allkeys[allkeys.indexOf(mediaKey) + 1];
  const prevKey = allkeys[allkeys.indexOf(mediaKey) - 1];

  const goNext = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();

    if (nextKey) {
      const toPaths = [...paths];
      toPaths.pop();
      navigate([...toPaths, nextKey].join('/'));
    }
  };

  const goPrev = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();

    if (prevKey) {
      const toPaths = [...paths];
      toPaths.pop();
      navigate([...toPaths, prevKey].join('/'));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();

        goPrev(e);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();

        goNext(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();

        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [msg, mediaKey]);

  // TODO: Added previewThumbnail of the grid

  const payload = msg.fileMetadata.payloads.find((p) => p.key === mediaKey);
  const contentType = payload?.contentType;
  const dialog = (
    <div className="fixed inset-0 z-40 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
      <div className="inset-0 bg-black transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="relative flex h-full min-h-[100dvh] flex-row items-center justify-center">
          {contentType?.startsWith('video') ? (
            <OdinVideo
              dotYouClient={dotYouClient}
              fileId={msg.fileId}
              fileKey={mediaKey}
              targetDrive={ChatDrive}
              lastModified={msg.fileMetadata.updated}
              probablyEncrypted={true}
              autoPlay={true}
            />
          ) : contentType?.startsWith('image') ? (
            <OdinImage
              className={`m-auto h-auto max-h-[100dvh] w-auto max-w-full object-contain`}
              dotYouClient={dotYouClient}
              fileId={msg.fileId}
              fileKey={mediaKey}
              targetDrive={ChatDrive}
              alt="post"
              fit="contain"
              lastModified={msg.fileMetadata.updated}
            />
          ) : payload ? (
            <BoringFile
              odinId={undefined}
              targetDrive={ChatDrive}
              fileId={msg.fileId}
              file={payload}
              canDownload={true}
              className="h-full w-full"
            />
          ) : null}

          {onClose ? (
            <button
              onClick={onClose}
              className={`absolute left-4 top-4 rounded-full border border-primary/50 bg-background p-3 text-foreground hover:brightness-90 hover:filter dark:border-primary/50`}
            >
              <Times className="h-5 w-5" />
            </button>
          ) : null}

          {prevKey ? (
            <ActionButton
              icon={ArrowLeft}
              onClick={(e) => goPrev(e.nativeEvent)}
              className="absolute left-2 top-[calc(50%-1.25rem)] rounded-full p-3"
              size="square"
              type="secondary"
            />
          ) : null}
          {nextKey ? (
            <ActionButton
              icon={Arrow}
              onClick={(e) => goNext(e.nativeEvent)}
              className="absolute right-2 top-[calc(50%-1.25rem)] rounded-full p-3"
              size="square"
              type="secondary"
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};
