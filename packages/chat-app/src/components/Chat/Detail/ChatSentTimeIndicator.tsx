import { t } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import { formatToTimeAgoWithRelativeDetail } from '@youfoundation/common-app/src/helpers/timeago/format';

export const ChatSentTimeIndicator = ({
  msg,
  className,
  keepDetail,
}: {
  msg: HomebaseFile<ChatMessage>;
  className?: string;
  keepDetail?: boolean;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <p className={`select-none text-sm text-foreground/70 ${className || ''}`}>{children}</p>
  );

  if (!msg.fileMetadata.created) return null;

  const date = new Date(msg.fileMetadata.created);
  if (!date) return <Wrapper>{t('Unknown')}</Wrapper>;

  return <Wrapper>{formatToTimeAgoWithRelativeDetail(date, keepDetail)}</Wrapper>;
};
