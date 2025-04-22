import { useOdinClientContext } from '@homebase-id/common-app';
import { Clock } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  CommunityDeliveryStatus,
  CommunityMessage,
} from '../../../../providers/CommunityMessageProvider';

export const CommunityDeliveryIndicator = ({
  msg,
  className,
}: {
  msg: HomebaseFile<CommunityMessage>;
  className?: string;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const content = msg.fileMetadata.appData.content;
  const authorOdinId = msg.fileMetadata.senderOdinId || '';
  const messageFromMe = !authorOdinId || authorOdinId === loggedOnIdentity;

  if (!messageFromMe) return null;
  return <InnerDeliveryIndicator state={content.deliveryStatus} className={className} />;
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
