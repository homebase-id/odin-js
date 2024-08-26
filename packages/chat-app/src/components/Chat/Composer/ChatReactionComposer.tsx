import { Lol } from '@youfoundation/common-app/icons';
import {
  ReactionsBar,
  t,
  useDotYouClient,
  useMostSpace,
  useOutsideTrigger,
} from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useState, useRef } from 'react';
import { ChatMessage } from '../../../providers/ChatProvider';
import { UnifiedConversation } from '../../../providers/ConversationProvider';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';

export const ChatReactionComposer = ({
  conversation,
  msg,
}: {
  conversation: HomebaseFile<UnifiedConversation>;
  msg: HomebaseFile<ChatMessage>;
}) => {
  const identity = useDotYouClient().getIdentity();
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

  const myReactions = data?.filter((reaction) => reaction?.authorOdinId === identity);

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
            className={`xl:absolute ${
              verticalSpace === 'top' ? 'xl:bottom-8' : 'xl:top-8'
            } ${horizontalSpace === 'left' ? 'right-0' : 'left-0'} z-20`}
            emojis={['👍️', '❤️', '😂', '😮', '😥']}
            defaultValue={myReactions?.map((reaction) => reaction.body) || []}
            doLike={(emoji) => {
              addReaction({ conversation, message: msg, reaction: emoji });
              setIsReact(false);
            }}
            doUnlike={(emoji) => {
              const reactionFile = myReactions?.find((reaction) => reaction.body === emoji);
              if (reactionFile)
                removeReaction({ conversation, message: msg, reaction: reactionFile });
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
