import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ActionButton,
  BoringFile,
  VideoClickToLoad,
  usePortal,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { OdinImage } from '@homebase-id/ui-lib';
import { useNavigate, useParams } from 'react-router-dom';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { getTargetDriveFromCommunityId } from '../../../../providers/CommunityDefinitionProvider';
import { Times, ArrowLeft, Arrow } from '@homebase-id/common-app/icons';

export const CommunityMediaGallery = ({
  odinId,
  communityId,
  msg,
}: {
  odinId: string;
  communityId: string;
  msg: HomebaseFile<CommunityMessage>;
}) => {
  const target = usePortal('modal-container');
  const dotYouClient = useDotYouClientContext();

  const targetDrive = getTargetDriveFromCommunityId(communityId);

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

  const allkeys = msg.fileMetadata.payloads
    ?.filter((pyld) => pyld.key !== DEFAULT_PAYLOAD_KEY)
    ?.map((p) => p.key);
  const nextKey = allkeys?.[allkeys.indexOf(mediaKey) + 1];
  const prevKey = allkeys?.[allkeys.indexOf(mediaKey) - 1];

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

  const payload = msg.fileMetadata.payloads?.find((p) => p.key === mediaKey);
  const contentType = payload?.contentType;

  const dialog = (
    <div className="fixed inset-0 z-40 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
      <div className="inset-0 bg-black lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="relative flex h-full min-h-[100dvh] flex-row items-center justify-center">
          {contentType?.startsWith('video') || contentType === 'application/vnd.apple.mpegurl' ? (
            <VideoClickToLoad
              preload={true}
              odinId={odinId}
              fileId={msg.fileId}
              fileKey={mediaKey}
              targetDrive={targetDrive}
              systemFileType={msg.fileSystemType}
              lastModified={msg.fileMetadata.updated}
              probablyEncrypted={true}
              className="h-full max-h-[100dvh] w-full object-contain"
            />
          ) : contentType?.startsWith('image') ? (
            <OdinImage
              className={`m-auto h-auto max-h-[100dvh] w-auto max-w-full object-contain`}
              odinId={odinId}
              dotYouClient={dotYouClient}
              fileId={msg.fileId}
              fileKey={mediaKey}
              targetDrive={targetDrive}
              systemFileType={msg.fileSystemType}
              alt="post"
              fit="contain"
              lastModified={msg.fileMetadata.updated}
            />
          ) : payload ? (
            <BoringFile
              odinId={odinId}
              targetDrive={targetDrive}
              systemFileType={msg.fileSystemType}
              fileId={msg.fileId}
              globalTransitId={msg.fileMetadata.globalTransitId}
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
