import { useDotYouClient, t } from '@youfoundation/common-app';
import { Clock, SubtleCheck, Times } from '@youfoundation/common-app/icons';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import {
  CommunityDeliveryStatus,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';

export const CommunityDeliveryIndicator = ({
  msg,
  className,
}: {
  msg: HomebaseFile<CommunityMessage>;
  className?: string;
}) => {
  const identity = useDotYouClient().getIdentity();
  const content = msg.fileMetadata.appData.content;
  const authorOdinId =
    msg.fileMetadata.senderOdinId || msg.fileMetadata.appData.content.authorOdinId || '';
  const messageFromMe = !authorOdinId || authorOdinId === identity;

  if (!messageFromMe) return null;
  return <InnerDeliveryIndicator state={content.deliveryStatus} className={className} />;
};

export const FailedDeliveryDetails = ({
  msg,
  recipient,
  className,
}: {
  msg: HomebaseFile<CommunityMessage>;
  recipient: string;
  className?: string;
}) => {
  const deliveryDetails = msg.serverMetadata?.transferHistory?.recipients[recipient];
  if (!deliveryDetails) return null;
  if (deliveryDetails.latestSuccessfullyDeliveredVersionTag) return null;

  return (
    <p className={`text-red-500 ${className || ''}`}>{t(deliveryDetails.latestTransferStatus)}</p>
  );
};

export const InnerDeliveryIndicator = ({
  state,
  className,
}: {
  state?: CommunityDeliveryStatus;
  className?: string;
}) => {
  const isSent = state && state >= CommunityDeliveryStatus.Sent;
  const isDelivered = state && state >= CommunityDeliveryStatus.Delivered;
  const isFailed = state === CommunityDeliveryStatus.Failed;
  const isRead = state === CommunityDeliveryStatus.Read;

  return (
    <div
      className={`${isDelivered ? '-ml-2' : ''} flex flex-row drop-shadow-md ${
        isRead ? 'text-blue-600 ' : 'text-foreground/50'
      } ${className || ''}`}
    >
      {isFailed ? (
        <>
          <Times className="h-6 w-6 text-red-500" />
        </>
      ) : (
        <>
          {isDelivered ? <SubtleCheck className="relative -right-2 z-10 h-4 w-4" /> : null}
          {isSent ? <SubtleCheck className="h-4 w-4" /> : <Clock className="h-4 w-4 pb-1" />}
        </>
      )}
    </div>
  );
};
