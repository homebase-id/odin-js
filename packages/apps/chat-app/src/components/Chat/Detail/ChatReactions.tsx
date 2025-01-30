import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';
import { ChatMessage } from '../../../providers/ChatProvider';
import { UnifiedConversation } from '../../../providers/ConversationProvider';
import {
  ActionButton,
  AuthorImage,
  AuthorName,
  DialogWrapper,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';
import { tryJsonParse } from '@homebase-id/js-lib/helpers';

export const ChatReactions = ({
  msg,
  conversation,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation: HomebaseFile<UnifiedConversation, unknown> | undefined;
}) => {
  const [showDetail, setShowDetail] = useState(false);

  if (!msg.fileMetadata.reactionPreview?.reactions) {
    return null;
  }

  const reactions = Object.values(msg.fileMetadata.reactionPreview?.reactions).map((reaction) => ({
    emoji: tryJsonParse<{ emoji: string }>(reaction.reactionContent).emoji,
    count: parseInt(reaction.count),
  }));
  const uniqueEmojis = Array.from(new Set(reactions)).slice(0, 5);
  const count = reactions?.reduce((acc, curr) => {
    return acc + curr.count;
  }, 0);

  if (!reactions?.length) return null;

  return (
    <>
      <div className="absolute -bottom-6 left-2 right-0 flex flex-row">
        <div
          className="flex cursor-pointer flex-row items-center gap-1 rounded-3xl bg-background px-2 py-1 shadow-sm"
          onClick={() => setShowDetail(true)}
        >
          {uniqueEmojis?.map((emoji) => <p key={emoji.emoji}>{emoji.emoji}</p>)}
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

  onClose,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation: HomebaseFile<UnifiedConversation, unknown> | undefined;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const [activeEmoji, setActiveEmoji] = useState<string>('all');

  const { data: reactions } = useChatReaction({
    messageFileId: msg.fileId,
    messageGlobalTransitId: msg.fileMetadata.globalTransitId,
  }).get;

  const filteredEmojis = useMemo(() => {
    const pureEmojis = reactions?.map((reaction) => reaction.body.trim());
    return Array.from(new Set(pureEmojis));
  }, [reactions]);

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
          const count = reactions?.filter((emoji) => emoji.body === reaction).length;
          return (
            <li className="" key={reaction}>
              <ActionButton
                type="mute"
                className={`rounded-none border-b-primary hover:border-b-2 ${
                  activeEmoji === reaction || filteredEmojis?.length === 1 ? 'border-b-2' : ''
                }`}
                onClick={() => setActiveEmoji(reaction)}
              >
                {reaction} {count}
              </ActionButton>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-flow-row gap-4 px-4 py-4 sm:px-8" key={activeEmoji}>
        {reactions
          ?.filter((reaction) => reaction.body === activeEmoji || activeEmoji === 'all')
          .map((reaction) => {
            return (
              <div className="flex flex-row items-center text-lg" key={reaction.body}>
                <AuthorImage odinId={reaction.authorOdinId} size="xs" className="mr-2" />
                <AuthorName odinId={reaction.authorOdinId} />
                <p className="ml-auto">{reaction.body}</p>
              </div>
            );
          })}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
