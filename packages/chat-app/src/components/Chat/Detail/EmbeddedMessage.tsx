import { ConnectionName, t } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { ChatMessage } from '../../../providers/ChatProvider';

export const EmbeddedMessageWithId = ({
  msgId,
  className,
}: {
  msgId: string;
  className?: string;
}) => {
  const { data: msg } = useChatMessage({ messageId: msgId }).get;
  if (!msg) return null;

  return <EmbeddedMessage msg={msg} className={className} />;
};

export const EmbeddedMessage = ({
  msg,
  className,
}: {
  msg: DriveSearchResult<ChatMessage>;
  className?: string;
}) => {
  return (
    <div
      className={`w-full flex-grow rounded-lg border-l-2 border-l-primary bg-primary/10 px-4 py-2 ${
        className || ''
      }`}
    >
      <p className="font-semibold">
        {msg.fileMetadata.senderOdinId ? (
          <ConnectionName odinId={msg.fileMetadata.senderOdinId} />
        ) : (
          t('You')
        )}
      </p>

      <p className="text-foreground">
        {msg.fileMetadata.appData.content.message ? (
          msg.fileMetadata.appData.content.message
        ) : (
          <>📷 {t('Media')}</>
        )}
      </p>
    </div>
  );
};
