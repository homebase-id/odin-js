import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PostContent,
  savePost as savePostFile,
  getPost,
  removePost,
  GetTargetDriveFromChannelId,
  BlogConfig,
  ChannelDefinition,
} from '@homebase-id/js-lib/public';
import {
  NewMediaFile,
  MediaFile,
  getPayloadBytes,
  SecurityGroupType,
  UpdateResult,
} from '@homebase-id/js-lib/core';
import { HomebaseFile, NewHomebaseFile, UploadResult } from '@homebase-id/js-lib/core';
import { useDotYouClient } from '../../auth/useDotYouClient';
import { getRichTextFromString } from '../../../helpers/richTextHelper';
import { TransitUploadResult } from '@homebase-id/js-lib/peer';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { invalidateDrafts } from '../drafts/useDrafts';
import { invalidatePosts } from './usePostsInfinite';
import { invalidateSocialFeeds, updateCacheSocialFeeds } from '../useSocialFeed';
import { invalidatePost } from './usePost';
import { formatGuidId } from '@homebase-id/js-lib/helpers';

export const useManagePost = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();
  const loggedInIdentity = dotYouClient.getLoggedInIdentity();

  const savePost = async ({
    postFile,
    odinId,
    channelId,
    mediaFiles,
    linkPreviews,
    onUpdate,
  }: {
    postFile: NewHomebaseFile<PostContent> | HomebaseFile<PostContent>;
    odinId?: string;
    channelId: string;
    mediaFiles?: (NewMediaFile | MediaFile)[];
    linkPreviews?: LinkPreview[];
    onUpdate?: (progress: number) => void;
  }) => {
    return new Promise<TransitUploadResult | UploadResult | UpdateResult>((resolve, reject) => {
      const onVersionConflict = odinId
        ? undefined
        : async () => {
            const serverPost = await getPost<PostContent>(
              dotYouClient,
              channelId,
              postFile.fileMetadata.appData.content.id
            );
            if (!serverPost) return;

            const newPost: HomebaseFile<PostContent> = {
              ...serverPost,
              fileMetadata: {
                ...serverPost.fileMetadata,
                appData: {
                  ...serverPost.fileMetadata.appData,
                  content: {
                    ...serverPost.fileMetadata.appData.content,
                    ...postFile.fileMetadata.appData.content,
                  },
                },
              },
            };
            savePostFile(
              dotYouClient,
              newPost,
              odinId,
              channelId,
              mediaFiles,
              linkPreviews,
              onVersionConflict
            ).then((result) => {
              if (result) resolve(result);
            });
          };

      postFile.fileMetadata.appData.content.captionAsRichText = getRichTextFromString(
        postFile.fileMetadata.appData.content.caption.trim()
      );

      savePostFile(
        dotYouClient,
        postFile,
        odinId,
        channelId,
        mediaFiles,
        linkPreviews,
        onVersionConflict,
        onUpdate
      )
        .then((result) => {
          if (result) resolve(result);
        })
        .catch((err) => reject(err));
    });
  };

  const duplicatePost = async ({
    toDuplicatePostFile,
    channelId,
    newPostId,
    odinId,
    targetChannel,
  }: {
    toDuplicatePostFile: HomebaseFile<PostContent>;
    channelId: string;
    newPostId: string;
    odinId?: string;
    targetChannel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
  }) => {
    const currentTargetDrive = GetTargetDriveFromChannelId(channelId);

    // Fetch payloads from the original post
    const mediaFiles: NewMediaFile[] = (
      await Promise.all(
        toDuplicatePostFile.fileMetadata.payloads.map(async (payload) => {
          const bytes = await getPayloadBytes(
            dotYouClient,
            currentTargetDrive,
            toDuplicatePostFile.fileId,
            payload.key
          );
          if (!bytes) return;
          return {
            file: new Blob([bytes.bytes], { type: payload.contentType }),
            key: payload.key,
            thumbnail: payload.previewThumbnail,
          };
        })
      )
    ).filter(Boolean) as NewMediaFile[];

    // Save everything to a new post
    const postFile: NewHomebaseFile<PostContent> = {
      ...toDuplicatePostFile,
      fileId: undefined, // Clear FileId
      fileMetadata: {
        ...toDuplicatePostFile.fileMetadata,
        appData: {
          ...toDuplicatePostFile.fileMetadata.appData,
          fileType: BlogConfig.DraftPostFileType,
          uniqueId: undefined, // Clear UniqueId
          content: {
            ...toDuplicatePostFile.fileMetadata.appData.content,
            id: newPostId,
            channelId: targetChannel.fileMetadata.appData.uniqueId as string,
          },
        },
      },
      serverMetadata: targetChannel.serverMetadata || {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      },
    };

    return savePostFile(
      dotYouClient,
      postFile,
      odinId,
      targetChannel.fileMetadata.appData.uniqueId as string,
      mediaFiles
    );
  };

  // slug property is need to clear the cache later, but not for the actual removeData
  const removeData = async ({
    postFile,
    channelId,
  }: {
    postFile: HomebaseFile<PostContent>;
    channelId: string;
  }) => {
    if (postFile) return await removePost(dotYouClient, postFile, channelId);
  };

  return {
    save: useMutation({
      mutationFn: savePost,
      onSuccess: (_data, variables) => {
        if (variables.postFile.fileMetadata.appData.content.slug) {
          invalidatePost(
            queryClient,
            variables.odinId || dotYouClient.getHostIdentity(),
            variables.channelId,
            variables.postFile.fileMetadata.appData.content.slug
          );
        } else {
          invalidatePost(queryClient);
        }

        invalidatePost(
          queryClient,
          variables.odinId || dotYouClient.getHostIdentity(),
          variables.channelId,
          variables.postFile.fileId
        );
        invalidatePost(
          queryClient,
          variables.odinId || dotYouClient.getHostIdentity(),
          variables.channelId,
          variables.postFile.fileMetadata.appData.content.id
        );
        invalidatePost(
          queryClient,
          variables.odinId || dotYouClient.getHostIdentity(),
          variables.channelId,
          formatGuidId(variables.postFile.fileMetadata.appData.content.id)
        );

        invalidatePosts(queryClient, variables.postFile.fileMetadata.appData.content.channelId);
        invalidatePosts(queryClient, '');

        // Update versionTag of post in social feeds cache
        updateCacheSocialFeeds(queryClient, (data) => ({
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            results: page.results.map((post) =>
              post.fileMetadata.appData.content.id ===
              variables.postFile.fileMetadata.appData.content.id
                ? {
                    ...post,
                    fileMetadata: {
                      ...post.fileMetadata,
                      versionTag:
                        (_data as UploadResult).newVersionTag || post.fileMetadata.versionTag,
                    },
                  }
                : post
            ),
          })),
        }));
      },
      onMutate: async (newPost) => {
        const newPostFile: HomebaseFile<PostContent> = {
          ...newPost.postFile,
          fileMetadata: {
            ...newPost.postFile.fileMetadata,
            senderOdinId: newPost.odinId,
            originalAuthor: loggedInIdentity,
            appData: {
              ...newPost.postFile.fileMetadata.appData,
              content: {
                ...newPost.postFile.fileMetadata.appData.content,
                primaryMediaFile: newPost.mediaFiles?.[0]
                  ? {
                      fileKey: newPost.mediaFiles?.[0].key,
                      type: (newPost.mediaFiles?.[0] as MediaFile)?.contentType,
                    }
                  : undefined,
              },
            },
          },
        } as HomebaseFile<PostContent>;

        const previousFeed = updateCacheSocialFeeds(queryClient, (data) => ({
          ...data,
          pages: data.pages.map((page, index) => ({
            ...page,
            results: [...(index === 0 ? [newPostFile] : []), ...page.results],
          })),
        }));

        return { newPost, previousFeed };
      },
      onError: (err, _newCircle, context) => {
        console.error(err);

        // Revert local caches to what they were,
        updateCacheSocialFeeds(queryClient, () => context?.previousFeed);
      },
      onSettled: () => {
        // Invalidate with a small delay to allow the server to update
        setTimeout(() => {
          invalidateSocialFeeds(queryClient);
        }, 1000);
      },
    }),

    update: useMutation({
      mutationFn: savePost,
      onSuccess: (_data, variables) => {
        if (variables.postFile.fileMetadata.appData.content.slug) {
          invalidatePost(
            queryClient,
            dotYouClient.getHostIdentity(),
            variables.channelId,
            variables.postFile.fileMetadata.appData.content.slug
          );
        } else {
          invalidatePost(queryClient, dotYouClient.getHostIdentity(), variables.channelId);
        }

        // Too many invalidates, but during article creation, the slug is not known
        invalidatePost(
          queryClient,
          dotYouClient.getHostIdentity(),
          variables.channelId,
          variables.postFile.fileId
        );
        invalidatePost(
          queryClient,
          dotYouClient.getHostIdentity(),
          variables.channelId,
          variables.postFile.fileMetadata.appData.content.slug
        );
        invalidatePost(
          queryClient,
          dotYouClient.getHostIdentity(),
          variables.channelId,
          formatGuidId(variables.postFile.fileMetadata.appData.content.id)
        );

        invalidatePosts(queryClient, variables.postFile.fileMetadata.appData.content.channelId);
        invalidatePosts(queryClient, '');

        updateCacheSocialFeeds(queryClient, (data) => ({
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            results: page.results.map((post) =>
              post.fileMetadata.appData.content.id ===
              variables.postFile.fileMetadata.appData.content.id
                ? {
                    ...post,
                    fileMetadata: {
                      ...post.fileMetadata,
                      versionTag:
                        (_data as UploadResult).newVersionTag || post.fileMetadata.versionTag,
                    },
                  }
                : post
            ),
          })),
        }));
      },
      onError: (err) => {
        console.error(err);
      },
      onSettled: () => {
        invalidateSocialFeeds(queryClient);
      },
    }),

    remove: useMutation({
      mutationFn: removeData,
      onSuccess: (_data, variables) => {
        invalidateSocialFeeds(queryClient);

        if (variables && variables.postFile.fileMetadata.appData.content.slug) {
          invalidatePost(
            queryClient,
            dotYouClient.getHostIdentity(),
            variables.channelId,
            variables.postFile.fileMetadata.appData.content.slug
          );
        } else {
          invalidatePost(queryClient, dotYouClient.getHostIdentity(), variables.channelId);
        }

        invalidatePosts(queryClient, variables.postFile.fileMetadata.appData.content.channelId);
        invalidatePosts(queryClient, '');
        invalidateDrafts(queryClient);
      },
    }),

    duplicate: useMutation({
      mutationFn: duplicatePost,
      // No optimistic mutation as it directly navigates after success; And as such would lose the cache
    }),
  };
};
