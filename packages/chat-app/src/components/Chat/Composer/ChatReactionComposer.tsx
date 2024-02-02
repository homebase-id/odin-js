import {
  Lol,
  ReactionsBar,
  t,
  useDotYouClient,
  useOutsideTrigger,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { useState, useRef } from 'react';
import { ChatMessage } from '../../../providers/ChatProvider';
import { Conversation } from '../../../providers/ConversationProvider';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';

export const ChatReactionComposer = ({
  conversation,
  msg,
}: {
  conversation: DriveSearchResult<Conversation>;
  msg: DriveSearchResult<ChatMessage>;
}) => {
  const identity = useDotYouClient().getIdentity();

  const [isReact, setIsReact] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsReact(false));

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
      className={`relative mx-1 my-auto cursor-pointer opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
        isReact ? 'opacity-100' : ''
      }`}
      ref={wrapperRef}
    >
      <div className={`${isReact ? 'absolute' : 'contents'} -left-2 -top-12 bottom-0 w-[10rem]`}>
        {isReact ? (
          <ReactionsBar
            className={`absolute left-0 top-0 z-20`}
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
      </div>
      <button
        className={`cursor-pointer text-slate-400 hover:text-black dark:text-slate-600 dark:hover:text-white ${
          isReact ? 'text-black dark:text-white' : ''
        }`}
        onClick={() => setIsReact(!isReact)}
      >
        <Lol className="inline-block h-6 w-6" />
        <span className="sr-only">{t('Like')}</span>
      </button>
    </div>
  );
};
