import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RawReactionContent,
  ReactionContext,
  removeComment,
  removeEmojiReaction,
  saveComment,
  saveEmojiReaction,
  EmojiReactionSummary,
} from '@homebase-id/js-lib/public';

import { getRichTextFromString } from '../../helpers/richTextHelper';
import { UseCommentsVal } from './comments/useComments';

import { CommentReaction, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useReaction = () => {
  const queryClient = useQueryClient();
  const odinClient = useOdinClientContext();

  const saveCommentData = async ({
    context,
    commentData,
  }: {
    context: ReactionContext;
    commentData:
      | Omit<HomebaseFile<CommentReaction>, 'serverMetadata'>
      | Omit<NewHomebaseFile<RawReactionContent>, 'serverMetadata'>;
  }) => {
    return await saveComment(odinClient, context, {
      ...commentData,
      fileMetadata: {
        ...commentData.fileMetadata,
        appData: {
          ...commentData.fileMetadata.appData,
          content: {
            ...commentData.fileMetadata.appData.content,
            bodyAsRichText: getRichTextFromString(
              commentData.fileMetadata.appData.content.body.trim()
            ),
          },
        },
      },
    });
  };

  const removeCommentData = async ({
    context,
    commentFile,
  }: {
    context: ReactionContext;
    commentFile: HomebaseFile<CommentReaction>;
  }) => {
    return await removeComment(odinClient, context, commentFile);
  };

  const saveEmojiReactionData = async ({
    emojiData,
    context,
  }: {
    emojiData: RawReactionContent;
    context: ReactionContext;
  }) => {
    return await saveEmojiReaction(odinClient, emojiData, context);
  };

  const removeEmojiReactionData = async ({
    emojiData,
    context,
  }: {
    emojiData: RawReactionContent;
    context: ReactionContext;
  }) => {
    return await removeEmojiReaction(odinClient, emojiData, context);
  };

  return {
    saveComment: useMutation({
      mutationFn: saveCommentData,
      onMutate: async (toSaveCommentData) => {
        const { odinId, channelId, target } = toSaveCommentData.context;

        const prevInfinite = queryClient.getQueryData<InfiniteData<UseCommentsVal>>([
          'comments',
          odinId,
          channelId,
          target.globalTransitId,
        ]);

        let newInfinite: InfiniteData<UseCommentsVal>;
        if (prevInfinite) {
          if (
            (toSaveCommentData.commentData as HomebaseFile<CommentReaction>).fileMetadata
              .globalTransitId
          ) {
            newInfinite = {
              ...prevInfinite,
              pages: prevInfinite.pages.map((page) => {
                return {
                  ...page,
                  comments: page.comments.map((comment) =>
                    comment.fileMetadata.globalTransitId ===
                    (toSaveCommentData.commentData as HomebaseFile<CommentReaction>).fileMetadata
                      .globalTransitId
                      ? toSaveCommentData.commentData
                      : comment
                  ) as HomebaseFile<CommentReaction>[],
                };
              }),
            };
          } else {
            const firstPage = prevInfinite.pages[0];
            const newFirtPage = {
              ...firstPage,
              comments: [
                toSaveCommentData.commentData,
                ...firstPage.comments,
              ] as HomebaseFile<CommentReaction>[],
            };
            const newPages = [newFirtPage, ...prevInfinite.pages.slice(1)];

            newInfinite = {
              ...prevInfinite,
              pages: newPages,
            };
          }
          queryClient.setQueryData(
            ['comments', odinId, channelId, target?.globalTransitId],
            newInfinite
          );
        }
      },
      onSuccess: (savedGlobalId, savedCommentData) => {
        if (
          (savedCommentData.commentData as HomebaseFile<CommentReaction>).fileMetadata
            .globalTransitId
        ) {
          // it was a normal update, already covered on the onMutate;
          return;
        }

        // Updated already mutated data with the new file id
        const { odinId, channelId, target } = savedCommentData.context;
        const prevInfinite = queryClient.getQueryData<InfiniteData<UseCommentsVal>>([
          'comments',
          odinId,
          channelId,
          target.globalTransitId,
        ]);

        if (!prevInfinite) {
          queryClient.invalidateQueries({
            queryKey: ['comments', odinId, channelId, target.globalTransitId],
          });
          return;
        }

        const updatedCommentData = { ...savedCommentData, globalTransitId: savedGlobalId };
        const firstPage = prevInfinite.pages[0];
        const newFirstPage = {
          ...firstPage,
          comments: [
            updatedCommentData.commentData,
            ...firstPage.comments.filter((comment) => !!comment.fileMetadata.globalTransitId),
          ],
        };
        const newPages = [newFirstPage, ...prevInfinite.pages.slice(1)];

        queryClient.setQueryData(['comments', odinId, channelId, target.globalTransitId], {
          ...prevInfinite,
          pages: newPages,
        });
      },
      onSettled: (_variables, _error, _data) => {
        setTimeout(
          () => {
            // Allow server some time to process
            queryClient.invalidateQueries({
              queryKey: [
                'comments',
                _data.context.odinId,
                _data.context.channelId,
                _data.context.target.globalTransitId,
              ],
            });
          },
          _error ? 100 : 2000
        );
      },
    }),
    removeComment: useMutation({
      mutationFn: removeCommentData,
      onSuccess: (_variables, _data) => {
        queryClient.invalidateQueries({
          queryKey: [
            'comments',
            _data.context.odinId,
            _data.context.channelId,
            _data.context.target.globalTransitId,
          ],
        });
      },
    }),
    saveEmoji: useMutation({
      mutationFn: saveEmojiReactionData,
      onMutate: (toSaveEmoji) => {
        const cacheKey = [
          toSaveEmoji.context.odinId,
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
            if (reaction.emoji !== toSaveEmoji.emojiData.body) return reaction;

            emojiExists = true;
            return {
              ...reaction,
              count: reaction.count + 1,
            };
          });

          if (!emojiExists) {
            newReactions.push({
              emoji: toSaveEmoji.emojiData.body,
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
              ...existingMyEmojis.filter((existing) => existing !== toSaveEmoji.emojiData.body),
              toSaveEmoji.emojiData.body,
            ]
          : [toSaveEmoji.emojiData.body];
        queryClient.setQueryData(['my-emojis', ...cacheKey], newMyEmojis);
      },
      onSettled: (_variables, _error, _data) => {
        queryClient.invalidateQueries({
          queryKey: [
            'my-emojis',
            _data.context.odinId,
            _data.context.channelId,
            _data.context.target.fileId,
            _data.context.target.globalTransitId,
          ],
        });
        queryClient.invalidateQueries({
          queryKey: [
            'emojis',
            _data.context.odinId,
            _data.context.channelId,
            _data.context.target.fileId,
            _data.context.target.globalTransitId,
          ],
        });
        queryClient.invalidateQueries({
          queryKey: [
            'emojis-summary',
            _data.context.odinId,
            _data.context.channelId,
            _data.context.target.fileId,
            _data.context.target.globalTransitId,
          ],
        });
      },
    }),
    removeEmoji: useMutation({
      mutationFn: removeEmojiReactionData,
      onMutate: (toRemoveEmoji) => {
        const cacheKey = [
          toRemoveEmoji.context.odinId,
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
            if (reaction.emoji === toRemoveEmoji.emojiData.body) {
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
          (emoji) => emoji !== toRemoveEmoji.emojiData.body
        );
        queryClient.setQueryData(['my-emojis', ...cacheKey], newMyEmojis);
      },
      onSettled: (_variables, _error, _data) => {
        queryClient.invalidateQueries({
          queryKey: [
            'my-emojis',
            _data.context.odinId,
            _data.context.channelId,
            _data.context.target.fileId,
            _data.context.target.globalTransitId,
          ],
        });
        queryClient.invalidateQueries({
          queryKey: [
            'emojis',
            _data.context.odinId,
            _data.context.channelId,
            _data.context.target.fileId,
            _data.context.target.globalTransitId,
          ],
        });
        queryClient.invalidateQueries({
          queryKey: [
            'emojis-summary',
            _data.context.odinId,
            _data.context.channelId,
            _data.context.target.fileId,
            _data.context.target.globalTransitId,
          ],
        });
      },
    }),
  };
};
