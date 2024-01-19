import { ConnectionName, t } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { ChatMessage } from '../../../providers/ChatProvider';
import { OdinImage } from '@youfoundation/ui-lib';
import { ChatDrive } from '../../../providers/ConversationProvider';
import { useDotYouClientContext } from '../../../hooks/auth/useDotYouClientContext';

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
  const hasMedia = !!msg.fileMetadata.payloads?.length;

  return (
    <div
      className={`w-full flex-grow overflow-hidden rounded-lg  bg-primary/10 ${className || ''}`}
    >
      <div className="flex flex-row items-center gap-2 border-l-4 border-l-primary p-1 ">
        <div className="px-2">
          <p className="font-semibold">
            {msg.fileMetadata.senderOdinId ? (
              <ConnectionName odinId={msg.fileMetadata.senderOdinId} />
            ) : (
              t('You')
            )}
          </p>
          <p className="text-foreground">{msg.fileMetadata.appData.content.message}</p>
        </div>
        {hasMedia ? <EmbeddedMessageMedia msg={msg} className="h-16 w-16" /> : null}
      </div>
    </div>
  );
};

export const EmbeddedMessageMedia = ({
  msg,
  className,
}: {
  msg: DriveSearchResult<ChatMessage>;
  className?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const firstPayload = msg.fileMetadata.payloads[0];
  if (!firstPayload) return null;

  return (
    <OdinImage
      dotYouClient={dotYouClient}
      fileId={msg.fileId}
      fileKey={firstPayload.key}
      lastModified={firstPayload.lastModified || msg.fileMetadata.updated}
      targetDrive={ChatDrive}
      avoidPayload={true}
      className={`${className || ''} flex-shrink-0`}
      fit="cover"
    />
  );
};
