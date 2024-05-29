import { ConnectionName, ExtensionThumbnail, t } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
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
  return <EmbeddedMessage msg={msg || undefined} className={className} />;
};

export const EmbeddedMessage = ({
  msg,
  className,
}: {
  msg: HomebaseFile<ChatMessage> | undefined;
  className?: string;
}) => {
  const hasMedia = msg && !!msg.fileMetadata.payloads?.length;

  return (
    <div
      className={`w-full flex-grow overflow-hidden rounded-lg  bg-primary/10 ${className || ''}`}
    >
      <div className="flex flex-row items-center gap-2 border-l-4 border-l-primary p-1 ">
        {msg ? (
          <>
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
          </>
        ) : (
          <p className="px-2 italic text-slate-400">{t('Message not found')}</p>
        )}
      </div>
    </div>
  );
};

export const EmbeddedMessageMedia = ({
  msg,
  className,
}: {
  msg: HomebaseFile<ChatMessage>;
  className?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const firstPayload = msg.fileMetadata.payloads[0];
  if (!firstPayload) return null;

  if (firstPayload.contentType.includes('image/')) {
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
  }
  return (
    <div className={`${className || ''} flex flex-shrink-0 items-center justify-center`}>
      <ExtensionThumbnail
        contentType={firstPayload.contentType}
        className="h-10 w-10 text-slate-500 dark:text-slate-400"
      />
    </div>
  );
};
