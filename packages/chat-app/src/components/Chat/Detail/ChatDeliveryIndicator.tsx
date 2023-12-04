import { useDotYouClient, SubtleCheck } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ChatMessage, ChatDeliveryStatus } from '../../../providers/ChatProvider';

export const ChatDeliveryIndicator = ({
  msg,
  className,
}: {
  msg: DriveSearchResult<ChatMessage>;
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
  const isDelivered = state && state >= ChatDeliveryStatus.Delivered;
  const isRead = state === ChatDeliveryStatus.Read;

  return (
    <div
      className={`${isDelivered ? '-ml-2' : ''} flex flex-row drop-shadow-md ${
        isRead ? 'text-blue-600 ' : 'text-foreground/50'
      } ${className || ''}`}
    >
      {isDelivered ? <SubtleCheck className="relative -right-2 z-10 h-4 w-4" /> : null}
      <SubtleCheck className="h-4 w-4" />
    </div>
  );
};
