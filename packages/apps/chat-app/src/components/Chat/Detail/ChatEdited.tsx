import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import { t } from '@homebase-id/common-app';
import { useMemo, useState, useEffect } from 'react';

const FIFTEEN_SECONDS = 15000;
export const ChatEdited = ({
  msg,
  className,
}: {
  msg: HomebaseFile<ChatMessage>;
  className?: string;
  keepDetail?: boolean;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <p className={`select-none text-sm text-foreground/70 ${className || ''}`}>{children}</p>
  );

  // Check if the message was edited
  const isEdited = msg.fileMetadata.appData.content.isEdited;

  // Only show if the message was actually edited
  if (!isEdited) return null;

  const editDate = useMemo(() => {
    // Use updated timestamp if available, otherwise fall back to created
    const timestamp = msg.fileMetadata.updated || msg.fileMetadata.created;
    return timestamp ? new Date(timestamp) : undefined;
  }, [msg.fileMetadata.updated, msg.fileMetadata.created]);

  const [forceRender, setForceRender] = useState<number>(0);
  useEffect(() => {
    if (!editDate) return;

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (editDate < oneHourAgo) return;
    const timer = setTimeout(() => setForceRender((prev) => prev + 1), FIFTEEN_SECONDS);

    return () => clearTimeout(timer);
  }, [editDate, forceRender]);

  if (!editDate) return null;

  return <Wrapper>{t('edited')}</Wrapper>;
};
