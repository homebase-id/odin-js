import { t, useDotYouClientContext } from '@homebase-id/common-app';
import { Clock } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
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
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const content = msg.fileMetadata.appData.content;
  const authorOdinId = msg.fileMetadata.senderOdinId || '';
  const messageFromMe = !authorOdinId || authorOdinId === loggedOnIdentity;

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

  if (isSent) return null;

  return (
    <div className={`flex flex-row drop-shadow-md ${className || ''}`}>
      <Clock className="h-4 w-4 pb-1" />
    </div>
  );
};
