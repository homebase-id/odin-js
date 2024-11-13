import { useParams } from 'react-router-dom';
import { ErrorBoundary, VideoClickToLoad } from '@homebase-id/common-app';
import { ChatDrive } from '../../providers/ConversationProvider';

// /apps/chat/player/3354d418-f0c8-7400-8f50-87aa818141c9/chat_web0
const targetDrive = ChatDrive;
const VideoPlayer = () => {
  const { videoFileId, videoFileKey } = useParams();

  return (
    <>
      <ErrorBoundary>
        <VideoClickToLoad
          preload={true}
          targetDrive={targetDrive}
          fileId={videoFileId}
          fileKey={videoFileKey}
          lastModified={undefined}
          className={`absolute inset-0 h-full w-full bg-black object-contain`}
          skipChunkedPlayback={false}
        />
      </ErrorBoundary>
    </>
  );
};

export default VideoPlayer;
