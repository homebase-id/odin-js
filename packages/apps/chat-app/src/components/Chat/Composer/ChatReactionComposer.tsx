import { Lol } from '@homebase-id/common-app/icons';
import {
  ReactionsBar,
  t,
  useOdinClientContext,
  useMostSpace,
  useOutsideTrigger,
} from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useState, useRef } from 'react';
import { ChatMessage } from '../../../providers/ChatProvider';
import { ConversationMetadata, UnifiedConversation } from '../../../providers/ConversationProvider';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';

export const ChatReactionComposer = ({
  conversation,
  msg,
}: {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  msg: HomebaseFile<ChatMessage>;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const [isReact, setIsReact] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsReact(false));

  const buttonRef = useRef<HTMLButtonElement>(null);
  const { verticalSpace, horizontalSpace } = useMostSpace(buttonRef, isReact);

  const { mutate: addReaction } = useChatReaction().add;
  const { mutate: removeReaction } = useChatReaction().remove;

  const hasReactions =
    msg.fileMetadata.reactionPreview?.reactions &&
    Object.keys(msg.fileMetadata.reactionPreview?.reactions).length;

  const { data } = useChatReaction({
    messageFileId: hasReactions ? msg.fileId : undefined,
    messageGlobalTransitId: msg.fileMetadata.globalTransitId,
  }).get;

  const myReactions = data?.filter((reaction) => reaction?.authorOdinId === loggedOnIdentity);

  return (
    <div
      className={`mx-1 my-auto cursor-pointer opacity-0 transition-opacity duration-300 group-hover:opacity-100 xl:relative ${
        isReact ? 'opacity-100' : ''
      }`}
      ref={wrapperRef}
    >
      {isReact ? (
        <div
          className="absolute inset-0 flex items-center justify-center xl:contents"
          onClick={() => setIsReact(false)}
        >
          <ReactionsBar
            className={`rounded-lg bg-background px-1 py-2 text-foreground shadow-md dark:bg-slate-900 xl:absolute ${
              verticalSpace === 'top' ? 'xl:bottom-8' : 'xl:top-8'
            } ${horizontalSpace === 'left' ? 'right-0' : 'left-0'} z-20`}
            emojis={['👍️', '❤️', '😂', '😮', '😥']}
            defaultValue={myReactions?.map((reaction) => reaction.body) || []}
            doLike={(emoji) => {
              addReaction({ conversation, message: msg, reaction: emoji });
              setIsReact(false);
            }}
            doUnlike={(emoji) => {
              const reaction = myReactions?.find((reaction) => reaction.body === emoji);
              if (reaction) removeReaction({ conversation, message: msg, reaction: reaction });
              setIsReact(false);
            }}
          />
        </div>
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
