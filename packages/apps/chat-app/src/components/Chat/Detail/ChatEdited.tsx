import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import { t } from '@homebase-id/common-app';

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

  return <Wrapper>{t('edited')}</Wrapper>;
};
