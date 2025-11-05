import { HomebaseFile } from '@homebase-id/js-lib/core';
import { t } from '@homebase-id/common-app';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';

export const CommunityMessageEdited = ({
  msg,
  className,
}: {
  msg: HomebaseFile<CommunityMessage>;
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

  return <Wrapper>{t('· Edited')}</Wrapper>;
};
