import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';
import { ChatMessage } from '../../../providers/ChatProvider';
import { Conversation } from '../../../providers/ConversationProvider';
import {
  ActionButton,
  AuthorImage,
  AuthorName,
  DialogWrapper,
  t,
  usePortal,
} from '@youfoundation/common-app';
import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';

export const ChatReactions = ({
  msg,
  conversation,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation: HomebaseFile<Conversation> | undefined;
}) => {
  const [showDetail, setShowDetail] = useState(false);

  const { data: reactions } = useChatReaction({
    conversationId: conversation?.fileMetadata.appData.uniqueId,
    messageId: msg.fileMetadata.appData.uniqueId,
  }).get;

  const uniqueEmojis = Array.from(
    new Set(reactions?.map((reaction) => reaction.fileMetadata.appData.content.message))
  ).slice(0, 5);
  const count = reactions?.length;

  if (!reactions?.length) return null;

  return (
    <>
      <div className="absolute -bottom-6 left-2 right-0 flex flex-row">
        <div
          className="flex cursor-pointer flex-row items-center gap-1 rounded-3xl bg-background px-2 py-1 shadow-sm"
          onClick={() => setShowDetail(true)}
        >
          {uniqueEmojis?.map((emoji) => <p key={emoji}>{emoji}</p>)}
          {count && uniqueEmojis && count > uniqueEmojis?.length ? (
            <p className="text-sm text-foreground/80">{count}</p>
          ) : null}
        </div>
      </div>
      {showDetail ? (
        <ChatReactionsDetail
          onClose={() => setShowDetail(false)}
          msg={msg}
          conversation={conversation}
        />
      ) : null}
    </>
  );
};

const ChatReactionsDetail = ({
  msg,
  conversation,
  onClose,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation: HomebaseFile<Conversation> | undefined;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const [activeEmoji, setActiveEmoji] = useState<string>('all');

  const { data: reactions } = useChatReaction({
    conversationId: conversation?.fileMetadata.appData.uniqueId,
    messageId: msg.fileMetadata.appData.uniqueId,
  }).get;

  const filteredEmojis = useMemo(
    () =>
      reactions?.filter((reaction) =>
        reactions?.some(
          (reactionFile) =>
            reactionFile?.fileMetadata?.appData?.content?.message ===
            reaction?.fileMetadata?.appData?.content?.message
        )
      ) || [],
    [reactions]
  );

  if (!reactions?.length || !filteredEmojis?.length) return null;

  const dialog = (
    <DialogWrapper
      title={t('Reactions')}
      onClose={onClose}
      isSidePanel={false}
      isPaddingLess={true}
    >
      <ul className="flex flex-row bg-slate-100 px-4 dark:bg-slate-700 sm:px-8">
        {filteredEmojis.length > 1 ? (
          <li className="">
            <ActionButton
              type="mute"
              className={`rounded-none border-b-primary hover:border-b-2 ${
                activeEmoji === 'all' ? 'border-b-2' : ''
              }`}
              onClick={() => setActiveEmoji('all')}
            >
              {t('All')} {reactions?.length}
            </ActionButton>
          </li>
        ) : null}
        {filteredEmojis.map((reaction) => {
          const count = reactions?.filter(
            (emoji) =>
              emoji.fileMetadata.appData.content.message ===
              reaction.fileMetadata.appData.content.message
          ).length;
          return (
            <li className="" key={reaction.fileId}>
              <ActionButton
                type="mute"
                className={`rounded-none border-b-primary hover:border-b-2 ${
                  activeEmoji === reaction.fileMetadata.appData.content.message ||
                  filteredEmojis?.length === 1
                    ? 'border-b-2'
                    : ''
                }`}
                onClick={() => setActiveEmoji(reaction.fileMetadata.appData.content.message)}
              >
                {reaction.fileMetadata.appData.content.message} {count}
              </ActionButton>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-flow-row gap-4 px-4 py-4 sm:px-8">
        {reactions
          ?.filter(
            (reaction) =>
              reaction.fileMetadata.appData.content.message === activeEmoji || activeEmoji === 'all'
          )
          .map((reaction) => {
            return (
              <div className="flex flex-row items-center text-lg" key={reaction.fileId}>
                <AuthorImage
                  odinId={reaction.fileMetadata.senderOdinId}
                  size="xs"
                  className="mr-2"
                />
                <AuthorName odinId={reaction.fileMetadata.senderOdinId} />
                <p className="ml-auto">{reaction.fileMetadata.appData.content.message}</p>
              </div>
            );
          })}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
