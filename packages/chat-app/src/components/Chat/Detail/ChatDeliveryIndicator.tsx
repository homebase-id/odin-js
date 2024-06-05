import { useDotYouClient, SubtleCheck, Clock, Times } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { ChatMessage, ChatDeliveryStatus } from '../../../providers/ChatProvider';

export const ChatDeliveryIndicator = ({
  msg,
  className,
}: {
  msg: HomebaseFile<ChatMessage>;
  className?: string;
}) => {
  const identity = useDotYouClient().getIdentity();
  const content = msg.fileMetadata.appData.content;
  const authorOdinId = msg.fileMetadata.senderOdinId;
  const messageFromMe = !authorOdinId || authorOdinId === identity;

  if (!messageFromMe) return null;
  return <InnerDeliveryIndicator state={content.deliveryStatus} className={className} />;
};

export const InnerDeliveryIndicator = ({
  state,
  className,
}: {
  state?: ChatDeliveryStatus;
  className?: string;
}) => {
  const isSent = state && state >= ChatDeliveryStatus.Sent;
  const isDelivered = state && state >= ChatDeliveryStatus.Delivered;
  const isFailed = state === ChatDeliveryStatus.Failed;
  const isRead = state === ChatDeliveryStatus.Read;

  return (
    <div
      className={`${isDelivered ? '-ml-2' : ''} flex flex-row drop-shadow-md ${
        isRead ? 'text-blue-600 ' : 'text-foreground/50'
      } ${className || ''}`}
    >
      {isFailed ? (
        <Times className="h-6 w-6 pb-1 text-red-500" />
      ) : (
        <>
          {isDelivered ? <SubtleCheck className="relative -right-2 z-10 h-5 w-5" /> : null}
          {isSent ? <SubtleCheck className="h-5 w-5" /> : <Clock className="h-5 w-5 pb-1" />}
        </>
      )}
    </div>
  );
};
