import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PostFile,
  PostContent,
  savePost as savePostFile,
  updatePost as updatePostFile,
  getPost,
  NewMediaFile,
  MediaFile,
  Media,
  getChannelDrive,
  getPostByFileId,
  removePost,
} from '@youfoundation/js-lib/public';
import { getRichTextFromString, useDotYouClient } from '@youfoundation/common-app';
import { MultiRequestCursoredResult, UploadResult, deleteFile } from '@youfoundation/js-lib/core';
import { PostFileVm } from '@youfoundation/js-lib/transit';

export const usePost = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const savePost = async ({
    postFile,
    channelId,
    mediaFiles,
    onUpdate,
  }: {
    postFile: PostFile<PostContent>;
    channelId: string;
    mediaFiles?: NewMediaFile[];
    onUpdate?: (progress: number) => void;
  }) => {
    return new Promise<UploadResult>((resolve) => {
      const onVersionConflict = async () => {
        const serverPost = await getPost(dotYouClient, channelId, postFile.content.id);
        if (!serverPost) return;

        const newPost = { ...serverPost, content: { ...serverPost.content, ...postFile.content } };
        savePostFile(dotYouClient, newPost, channelId, mediaFiles, onVersionConflict).then(
          (result) => {
            if (result) resolve(result);
          }
        );
      };

      savePostFile(
        dotYouClient,
        {
          ...postFile,
          content: {
            ...postFile.content,
            captionAsRichText: getRichTextFromString(postFile.content.caption.trim()),
          },
        },
        channelId,
        mediaFiles,
        onVersionConflict,
        onUpdate
      ).then((result) => {
        if (result) resolve(result);
      });
    });
  };

  const updatePost = async ({
    postFile,
    channelId,
    mediaFiles,
    onUpdate,
  }: {
    postFile: PostFile<PostContent>;
    channelId: string;
    mediaFiles: MediaFile[];
    onUpdate?: (progress: number) => void;
  }) => {
    return new Promise<UploadResult>((resolve) => {
      updatePostFile(
        dotYouClient,
        {
          ...postFile,
          content: {
            ...postFile.content,
            captionAsRichText: getRichTextFromString(postFile.content.caption.trim()),
          },
        },
        channelId,
        mediaFiles
      )
        .then((result) => {
          if (result) resolve(result);
        })
        .catch((err) => console.error(err));
    });
  };

  // slug property is need to clear the cache later, but not for the actual removeData
  const removeData = async ({
    fileId,
    channelId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    slug,
  }: {
    fileId: string;
    channelId: string;
    slug: string;
  }) => {
    const post = await getPostByFileId(dotYouClient, channelId, fileId);
    const channelDrive = getChannelDrive(channelId);
    if (post) {
      if (post.content.primaryMediaFile && post.content.primaryMediaFile.fileId)
        await deleteFile(dotYouClient, channelDrive, post.content.primaryMediaFile.fileId);

      const mediaPost = post as any as Media;
      if (mediaPost.mediaFiles) {
        await Promise.all(
          mediaPost.mediaFiles.map(async (file) => {
            if (file.fileId) await deleteFile(dotYouClient, channelDrive, file.fileId);
          })
        );
      }
    }

    return await removePost(dotYouClient, fileId, channelId);
  };

  return {
    save: useMutation({
      mutationFn: savePost,
      onSuccess: (_data, variables) => {
        if (variables.postFile.content.slug) {
          queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.content.slug] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['blog'] });
        }

        // Too many invalidates, but during article creation, the slug is not known
        queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.fileId] });
        queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.content.id] });
        queryClient.invalidateQueries({
          queryKey: ['blog', variables.postFile.content.id?.replaceAll('-', '')],
        });

        queryClient.removeQueries({ queryKey: ['blogs'] });

        // Update versionTag of post in social feeds cache
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<PostFileVm<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newFeed = { ...previousFeed };
          newFeed.pages[0].results = newFeed.pages[0].results.map((post) =>
            post.content.id === variables.postFile.content.id
              ? { ...post, versionTag: _data.newVersionTag }
              : post
          );

          queryClient.setQueryData(['social-feeds'], newFeed);
        }
      },
      onMutate: async (newPost) => {
        await queryClient.cancelQueries({ queryKey: ['social-feeds'] });

        // Update section attributes
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<PostFileVm<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newFeed = {
            ...previousFeed,
            pages: previousFeed.pages.map((page, index) => {
              return {
                ...page,
                results: [
                  ...(index === 0
                    ? [
                        {
                          ...newPost.postFile,
                          odinId: window.location.hostname,
                        },
                      ]
                    : []),
                  ...page.results,
                ],
              };
            }),
          };

          queryClient.setQueryData(['social-feeds'], newFeed);
        }

        return { newPost, previousFeed };
      },
      onError: (err, _newCircle, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['social-feeds'], context?.previousFeed);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
      },
    }),

    update: useMutation({
      mutationFn: updatePost,
      onSuccess: (_data, variables) => {
        if (variables.postFile.content.slug) {
          queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.content.slug] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['blog'] });
        }

        // Too many invalidates, but during article creation, the slug is not known
        queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.fileId] });
        queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.content.id] });
        queryClient.invalidateQueries({
          queryKey: ['blog', variables.postFile.content.id?.replaceAll('-', '')],
        });

        queryClient.removeQueries({ queryKey: ['blogs'] });

        // Update versionTag of post in social feeds cache
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<PostFileVm<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newFeed = { ...previousFeed };
          newFeed.pages[0].results = newFeed.pages[0].results.map((post) =>
            post.content.id === variables.postFile.content.id
              ? { ...post, versionTag: _data.newVersionTag }
              : post
          );

          queryClient.setQueryData(['social-feeds'], newFeed);
        }
      },
      onError: (err, _newCircle, context) => {
        console.error(err);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeData,
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['social-feeds'] });

        if (variables && variables.slug) {
          queryClient.invalidateQueries({ queryKey: ['blog', variables.slug] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['blog'] });
        }
        queryClient.invalidateQueries({ queryKey: ['blogs'] });
      },
    }),
  };
};
