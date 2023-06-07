import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EmojiReactionSummary,
  ReactionContext,
  ReactionFile,
  ReactionVm,
  removeComment,
  removeEmojiReaction,
  saveComment,
  saveEmojiReaction,
} from '@youfoundation/js-lib/public';

import { getRichTextFromString } from '../../helpers/richTextHelper';
import { UseCommentsVal } from './comments/useComments';
import { useDotYouClient } from '../../..';

export const useReaction = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

  const saveCommentData = async (commentData: ReactionVm) => {
    return await saveComment(dotYouClient, {
      ...commentData,
      content: {
        ...commentData.content,
        bodyAsRichText: getRichTextFromString(commentData.content.body.trim()),
      },
    });
  };

  const removeCommentData = async ({
    context,
    commentFile,
  }: {
    context: ReactionContext;
    commentFile: ReactionFile;
  }) => {
    return await removeComment(dotYouClient, context, commentFile);
  };

  const saveEmojiReactionData = async (emojiData: ReactionVm) => {
    return await saveEmojiReaction(dotYouClient, emojiData);
  };

  const removeEmojiReactionData = async (commentData: ReactionVm) => {
    return await removeEmojiReaction(dotYouClient, commentData);
  };

  return {
    saveComment: useMutation(saveCommentData, {
      onMutate: async (toSaveCommentData) => {
        const { authorOdinId, channelId, target } = toSaveCommentData.context;

        const prevInfinite = queryClient.getQueryData<InfiniteData<UseCommentsVal>>([
          'comments',
          authorOdinId,
          channelId,
          target.globalTransitId,
        ]);

        let newInfinite: InfiniteData<UseCommentsVal>;
        if (prevInfinite) {
          if (toSaveCommentData.globalTransitId) {
            newInfinite = {
              ...prevInfinite,
              pages: prevInfinite.pages.map((page) => {
                return {
                  ...page,
                  comments: page.comments.map((comment) =>
                    comment.globalTransitId === toSaveCommentData.globalTransitId
                      ? toSaveCommentData
                      : comment
                  ),
                };
              }),
            };
          } else {
            const firstPage = prevInfinite.pages[0];
            const newFirtPage = {
              ...firstPage,
              comments: [toSaveCommentData, ...firstPage.comments],
            };
            const newPages = [newFirtPage, ...prevInfinite.pages.slice(1)];

            newInfinite = {
              ...prevInfinite,
              pages: newPages,
            };
          }
          queryClient.setQueryData(
            ['comments', authorOdinId, channelId, target?.globalTransitId],
            newInfinite
          );
        }
      },
      onSuccess: (savedGlobalId, savedCommentData) => {
        if (savedCommentData.globalTransitId) {
          // it was a normal update, already covered on the onMutate;
          return;
        }

        // Updated already mutated data with the new file id
        const { authorOdinId, channelId, target } = savedCommentData.context;
        const prevInfinite = queryClient.getQueryData<InfiniteData<UseCommentsVal>>([
          'comments',
          authorOdinId,
          channelId,
          target.globalTransitId,
        ]);

        if (!prevInfinite) {
          queryClient.invalidateQueries([
            'comments',
            authorOdinId,
            channelId,
            target.globalTransitId,
          ]);
          return;
        }

        const updatedCommentData = { ...savedCommentData, globalTransitId: savedGlobalId };
        const firstPage = prevInfinite.pages[0];
        const newFirstPage = {
          ...firstPage,
          comments: [
            updatedCommentData,
            ...firstPage.comments.filter((comment) => !!comment.globalTransitId),
          ],
        };
        const newPages = [newFirstPage, ...prevInfinite.pages.slice(1)];

        queryClient.setQueryData(['comments', authorOdinId, channelId, target.globalTransitId], {
          ...prevInfinite,
          pages: newPages,
        });
      },
      onSettled: (_variables, _error, _data) => {
        setTimeout(
          () => {
            // Allow server some time to process
            queryClient.invalidateQueries([
              'comments',
              _data.context.authorOdinId,
              _data.context.channelId,
              _data.context.target.globalTransitId,
            ]);
          },
          _error ? 100 : 2000
        );
      },
    }),
    removeComment: useMutation(removeCommentData, {
      onSuccess: (_variables, _data) => {
        queryClient.invalidateQueries([
          'comments',
          _data.context.authorOdinId,
          _data.context.channelId,
          _data.context.target.globalTransitId,
        ]);
      },
    }),
    saveEmoji: useMutation(saveEmojiReactionData, {
      onMutate: (toSaveEmoji) => {
        const cacheKey = [
          toSaveEmoji.context.authorOdinId,
          toSaveEmoji.context.channelId,
          toSaveEmoji.context.target.fileId,
          toSaveEmoji.context.target.globalTransitId,
        ];

        // Update summary
        const existingSummary = queryClient.getQueryData<EmojiReactionSummary>([
          'emojis-summary',
          ...cacheKey,
        ]);

        if (existingSummary) {
          let emojiExists = false;
          const newReactions = existingSummary.reactions.map((reaction) => {
            if (reaction.emoji !== toSaveEmoji.content.body) return reaction;

            emojiExists = true;
            return {
              ...reaction,
              count: reaction.count + 1,
            };
          });

          if (!emojiExists) {
            newReactions.push({
              emoji: toSaveEmoji.content.body,
              count: 1,
            });
          }

          const newExistingSummary = {
            ...existingSummary,
            reactions: newReactions,
            totalCount: existingSummary.totalCount + 1,
          };
          queryClient.setQueryData(['emojis-summary', ...cacheKey], newExistingSummary);
        }

        // Upate my emojis
        const existingMyEmojis = queryClient.getQueryData<string[]>(['my-emojis', ...cacheKey]);
        const newMyEmojis = existingMyEmojis
          ? [
              ...existingMyEmojis.filter((existing) => existing !== toSaveEmoji.content.body),
              toSaveEmoji.content.body,
            ]
          : [toSaveEmoji.content.body];
        queryClient.setQueryData(['my-emojis', ...cacheKey], newMyEmojis);
      },
      onSettled: (_variables, _error, _data) => {
        queryClient.invalidateQueries([
          'my-emojis',
          _data.context.authorOdinId,
          _data.context.channelId,
          _data.context.target.fileId,
          _data.context.target.globalTransitId,
        ]);
        queryClient.invalidateQueries([
          'emojis',
          _data.context.authorOdinId,
          _data.context.channelId,
          _data.context.target.fileId,
          _data.context.target.globalTransitId,
        ]);
        queryClient.invalidateQueries([
          'emojis-summary',
          _data.context.authorOdinId,
          _data.context.channelId,
          _data.context.target.fileId,
          _data.context.target.globalTransitId,
        ]);
      },
    }),
    removeEmoji: useMutation(removeEmojiReactionData, {
      onMutate: (toRemoveEmoji) => {
        const cacheKey = [
          toRemoveEmoji.context.authorOdinId,
          toRemoveEmoji.context.channelId,
          toRemoveEmoji.context.target.fileId,
          toRemoveEmoji.context.target.globalTransitId,
        ];

        // Update summary
        const existingSummary = queryClient.getQueryData<EmojiReactionSummary>([
          'emojis-summary',
          ...cacheKey,
        ]);

        if (existingSummary) {
          const newReactions = existingSummary.reactions.map((reaction) => {
            if (reaction.emoji === toRemoveEmoji.content.body) {
              if (reaction.count === 1) return undefined;

              return {
                ...reaction,
                count: reaction.count - 1,
              };
            }
            return reaction;
          });

          const newExistingSummary = {
            ...existingSummary,
            reactions: newReactions.filter(Boolean),
            totalCount: existingSummary.totalCount - 1,
          };
          queryClient.setQueryData(['emojis-summary', ...cacheKey], newExistingSummary);
        }

        // Upate my emojis
        const existingMyEmojis = queryClient.getQueryData<string[]>(['my-emojis', ...cacheKey]);
        const newMyEmojis = existingMyEmojis?.filter(
          (emoji) => emoji !== toRemoveEmoji.content.body
        );
        queryClient.setQueryData(['my-emojis', ...cacheKey], newMyEmojis);
      },
      onSettled: (_variables, _error, _data) => {
        queryClient.invalidateQueries([
          'my-emojis',
          _data.context.authorOdinId,
          _data.context.channelId,
          _data.context.target.fileId,
          _data.context.target.globalTransitId,
        ]);
        queryClient.invalidateQueries([
          'emojis',
          _data.context.authorOdinId,
          _data.context.channelId,
          _data.context.target.fileId,
          _data.context.target.globalTransitId,
        ]);
        queryClient.invalidateQueries([
          'emojis-summary',
          _data.context.authorOdinId,
          _data.context.channelId,
          _data.context.target.fileId,
          _data.context.target.globalTransitId,
        ]);
      },
    }),
  };
};
