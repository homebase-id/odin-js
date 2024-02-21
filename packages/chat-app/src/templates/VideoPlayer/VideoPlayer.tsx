import { useParams } from 'react-router-dom';
import { OdinVideo } from '@youfoundation/ui-lib';
import { ErrorBoundary } from '@youfoundation/common-app';
import { ChatDrive } from '../../providers/ConversationProvider';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';

// /apps/chat/player/3354d418-f0c8-7400-8f50-87aa818141c9/chat_web0
const targetDrive = ChatDrive;
const VideoPlayer = () => {
  const dotYouClient = useDotYouClientContext();
  const { videoFileId, videoFileKey } = useParams();

  return (
    <>
      <ErrorBoundary>
        <OdinVideo
          dotYouClient={dotYouClient}
          targetDrive={targetDrive}
          fileId={videoFileId}
          fileKey={videoFileKey}
          lastModified={undefined}
          className={`absolute inset-0 h-full w-full bg-black object-contain`}
          skipChunkedPlayback={false}
          autoPlay={true}
        />
      </ErrorBoundary>
    </>
  );
};

export default VideoPlayer;
