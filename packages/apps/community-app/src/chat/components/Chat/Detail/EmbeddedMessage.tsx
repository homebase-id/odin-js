import {
  ConnectionName,
  ellipsisAtMaxChar,
  ExtensionThumbnail,
  getPlainTextFromRichText,
  t,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { ChatMessage } from '../../../providers/ChatProvider';
import { OdinImage } from '@homebase-id/ui-lib';
import { ChatDrive } from '../../../providers/ConversationProvider';

export const EmbeddedMessageWithId = ({
  conversationId,
  msgId,
  className,
}: {
  conversationId: string | undefined;
  msgId: string;
  className?: string;
}) => {
  const { data: msg } = useChatMessage({ conversationId, messageId: msgId }).get;
  return <EmbeddedMessage msg={msg || undefined} className={className} />;
};

//TODO(2002Bishwajeet): Revisit this component for adding support for ReplyPreview in EmbeddedMessage
export const EmbeddedMessage = ({
  msg,
  className,
}: {
  msg: HomebaseFile<ChatMessage> | undefined;
  className?: string;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const hasMedia = msg && !!msg.fileMetadata.payloads?.length;
  const plainText = msg && getPlainTextFromRichText(msg.fileMetadata.appData.content.message);
  return (
    <div className={`w-full flex-grow overflow-hidden rounded-lg bg-primary/10 ${className || ''}`}>
      <div className="flex flex-row items-center gap-2 border-l-4 border-l-primary p-1">
        {msg ? (
          <>
            <div className="px-2">
              <p className="font-semibold">
                {msg.fileMetadata.senderOdinId &&
                msg.fileMetadata.senderOdinId !== loggedOnIdentity ? (
                  <ConnectionName odinId={msg.fileMetadata.senderOdinId} />
                ) : (
                  t('You')
                )}
              </p>
              <p className="text-foreground">{ellipsisAtMaxChar(plainText, 80)}</p>
            </div>
            {hasMedia ? <EmbeddedMessageMedia msg={msg} className="h-16 w-16" /> : null}
          </>
        ) : (
          <p className="min-h-14 px-2 italic text-slate-400">{t('Message not found')}</p>
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
  const firstPayload = msg.fileMetadata.payloads?.[0];
  if (!firstPayload) return null;

  if (firstPayload.contentType.includes('image/')) {
    return (
      <OdinImage
        dotYouClient={dotYouClient}
        fileId={msg.fileId}
        fileKey={firstPayload.key}
        lastModified={firstPayload.lastModified || msg.fileMetadata.updated}
        previewThumbnail={
          firstPayload.previewThumbnail || msg.fileMetadata.appData.previewThumbnail
        }
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
