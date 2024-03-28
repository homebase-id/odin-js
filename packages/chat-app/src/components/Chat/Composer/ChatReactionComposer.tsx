import {
  Lol,
  ReactionsBar,
  t,
  useDotYouClient,
  useMostSpace,
  useOutsideTrigger,
} from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useState, useRef } from 'react';
import { ChatMessage } from '../../../providers/ChatProvider';
import { Conversation } from '../../../providers/ConversationProvider';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';

export const ChatReactionComposer = ({
  conversation,
  msg,
}: {
  conversation: HomebaseFile<Conversation>;
  msg: HomebaseFile<ChatMessage>;
}) => {
  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;
  const messageFromMe = !authorOdinId || authorOdinId === identity;

  const [isReact, setIsReact] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsReact(false));

  const buttonRef = useRef<HTMLButtonElement>(null);
  const { verticalSpace } = useMostSpace(buttonRef, isReact);

  const { mutate: addReaction } = useChatReaction().add;
  const { mutate: removeReaction } = useChatReaction().remove;
  const { data } = useChatReaction({
    conversationId: conversation.fileMetadata.appData.uniqueId,
    messageId: msg.fileMetadata.appData.uniqueId,
  }).get;

  const myReactions = data?.filter(
    (reaction) =>
      reaction?.fileMetadata.senderOdinId === identity || !reaction?.fileMetadata.senderOdinId
  );

  return (
    <div
      className={`mx-1 my-auto cursor-pointer opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:relative ${
        isReact ? 'opacity-100' : ''
      }`}
      ref={wrapperRef}
    >
      {isReact ? (
        <ReactionsBar
          className={`absolute ${
            verticalSpace === 'top' ? 'md:bottom-8' : 'md:top-8'
          } ${messageFromMe ? 'right-0' : 'left-0'} z-20`}
          emojis={['👍️', '❤️', '😂', '😮', '😥']}
          defaultValue={
            myReactions?.map((reaction) => reaction.fileMetadata.appData.content.message) || []
          }
          doLike={(emoji) => {
            addReaction({ conversation, message: msg, reaction: emoji });
            setIsReact(false);
          }}
          doUnlike={(emoji) => {
            const dsr = myReactions?.find(
              (reaction) => reaction.fileMetadata.appData.content.message === emoji
            );
            if (dsr) removeReaction({ conversation, message: msg, reaction: dsr });
            setIsReact(false);
          }}
        />
      ) : null}
      <button
        className={`cursor-pointer text-slate-400 hover:text-black dark:text-slate-600 dark:hover:text-white ${
          isReact ? 'text-black dark:text-white' : ''
        }`}
        onClick={() => setIsReact(!isReact)}
        ref={buttonRef}
      >
        <Lol className="inline-block h-6 w-6" />
        <span className="sr-only">{t('Like')}</span>
      </button>
    </div>
  );
};
