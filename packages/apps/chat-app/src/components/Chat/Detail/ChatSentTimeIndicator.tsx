import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import { formatToTimeAgoWithRelativeDetail } from '@homebase-id/common-app';
import { useMemo, useState, useEffect } from 'react';

const FIFTEEN_SECONDS = 15000;
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

  const date = useMemo(
    () =>
      (msg.fileMetadata.transitCreated && new Date(msg.fileMetadata.transitCreated)) || undefined,
    [msg.fileMetadata.transitCreated]
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

  return <Wrapper>{formatToTimeAgoWithRelativeDetail(date, keepDetail)}</Wrapper>;
};
