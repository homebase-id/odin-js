import { t } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { formatToTimeAgoWithRelativeDetail } from '@homebase-id/common-app';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';

export const CommunitySentTimeIndicator = ({
  msg,
  className,
  keepDetail,
}: {
  msg: HomebaseFile<CommunityMessage>;
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
