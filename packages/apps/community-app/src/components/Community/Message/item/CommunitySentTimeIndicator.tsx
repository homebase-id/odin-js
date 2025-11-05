import { formatDateExludingYearIfCurrent } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { formatToTimeAgoWithRelativeDetail } from '@homebase-id/common-app';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { useEffect, useMemo, useState } from 'react';

const FIFTEEN_SECONDS = 15000;
export const CommunitySentTimeIndicator = ({
  msg,
  className,
  keepDetail,
}: {
  msg: HomebaseFile<CommunityMessage>;
  className?: string;
  keepDetail?: boolean;
}) => {
  const Wrapper = ({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) => (
    <p
      className={`select-none text-sm text-foreground/70 ${className || ''}`}
      data-tooltip={tooltip}
    >
      {children}
    </p>
  );

  const date = useMemo(
    () =>
      (msg.fileMetadata.transitCreated && new Date(msg.fileMetadata.transitCreated)) || undefined,
    [msg.fileMetadata.created]
  );

  const [forceRender, setForceRender] = useState<number>(0);
  useEffect(() => {
    if (!date) return;

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (date < oneHourAgo) return;
    const timer = setTimeout(() => setForceRender((prev) => prev + 1), FIFTEEN_SECONDS);

    return () => clearTimeout(timer);
  }, [date, forceRender]);

  if (!date) return null;

  return (
    <Wrapper tooltip={formatDateExludingYearIfCurrent(date)}>
      {formatToTimeAgoWithRelativeDetail(date, keepDetail)}
    </Wrapper>
  );
};
