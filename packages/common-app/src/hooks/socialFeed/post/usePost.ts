import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PostContent,
  savePost as savePostFile,
  getPost,
  removePost,
} from '@youfoundation/js-lib/public';
import { NewMediaFile, MediaFile } from '@youfoundation/js-lib/core';
import {
  HomebaseFile,
  MultiRequestCursoredResult,
  NewHomebaseFile,
  UploadResult,
} from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../../auth/useDotYouClient';
import { getRichTextFromString } from '../../../helpers/richTextHelper';

export const usePost = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const savePost = async ({
    postFile,
    odinId,
    channelId,
    mediaFiles,
    onUpdate,
  }: {
    postFile: NewHomebaseFile<PostContent> | HomebaseFile<PostContent>;
    odinId?: string;
    channelId: string;
    mediaFiles?: (NewMediaFile | MediaFile)[];
    onUpdate?: (progress: number) => void;
  }) => {
    console.log('savePost', odinId);

    return new Promise<UploadResult>((resolve, reject) => {
      const onVersionConflict = async () => {
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
        savePostFile(dotYouClient, newPost, odinId, channelId, mediaFiles, onVersionConflict).then(
          (result) => {
            if (result) resolve(result);
          }
        );
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
        onVersionConflict,
        onUpdate
      )
        .then((result) => {
          if (result) resolve(result);
        })
        .catch((err) => reject(err));
    });
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
          queryClient.invalidateQueries({
            queryKey: ['blog', variables.postFile.fileMetadata.appData.content.slug],
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['blog'] });
        }

        // Too many invalidates, but during article creation, the slug is not known
        queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.fileId] });
        queryClient.invalidateQueries({
          queryKey: ['blog', variables.postFile.fileMetadata.appData.content.id],
        });
        queryClient.invalidateQueries({
          queryKey: [
            'blog',
            variables.postFile.fileMetadata.appData.content.id?.replaceAll('-', ''),
          ],
        });

        queryClient.invalidateQueries({
          queryKey: ['blogs', variables.postFile.fileMetadata.appData.content.channelId || '', ''],
        });
        queryClient.invalidateQueries({
          queryKey: ['blogs', '', ''],
        });

        // Update versionTag of post in social feeds cache
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<HomebaseFile<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newFeed = { ...previousFeed };
          newFeed.pages[0].results = newFeed.pages[0].results.map((post) =>
            post.fileMetadata.appData.content.id ===
            variables.postFile.fileMetadata.appData.content.id
              ? {
                  ...post,
                  fileMetadata: {
                    ...post.fileMetadata,
                    versionTag: _data.newVersionTag,
                  },
                }
              : post
          );

          queryClient.setQueryData(['social-feeds'], newFeed);
        }
      },
      onMutate: async (newPost) => {
        await queryClient.cancelQueries({ queryKey: ['social-feeds'] });

        // Update section attributes
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<HomebaseFile<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newPostFile: HomebaseFile<PostContent> = {
            ...newPost.postFile,
            fileMetadata: {
              ...newPost.postFile.fileMetadata,
              appData: {
                ...newPost.postFile.fileMetadata.appData,
                content: {
                  ...newPost.postFile.fileMetadata.appData.content,

                  primaryMediaFile: {
                    fileKey: newPost.mediaFiles?.[0].key,
                    type: (newPost.mediaFiles?.[0] as MediaFile)?.contentType,
                  },
                },
              },
            },
          } as HomebaseFile<PostContent>;

          const newFeed: InfiniteData<MultiRequestCursoredResult<HomebaseFile<PostContent>[]>> = {
            ...previousFeed,
            pages: previousFeed.pages.map((page, index) => {
              return {
                ...page,
                results: [...(index === 0 ? [newPostFile] : []), ...page.results],
              };
            }),
          };

          queryClient.setQueryData(['social-feeds'], newFeed);
        }

        return { newPost, previousFeed };
      },
      onError: (err, _newCircle, context) => {
        console.error(err);

        // Revert local caches to what they were,

        queryClient.setQueryData(['social-feeds'], context?.previousFeed);
      },
      onSettled: () => {
        // Invalidate with a small delay to allow the server to update
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
        }, 1000);
      },
    }),

    update: useMutation({
      mutationFn: savePost,
      onSuccess: (_data, variables) => {
        if (variables.postFile.fileMetadata.appData.content.slug) {
          queryClient.invalidateQueries({
            queryKey: ['blog', variables.postFile.fileMetadata.appData.content.slug],
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['blog'] });
        }

        // Too many invalidates, but during article creation, the slug is not known
        queryClient.invalidateQueries({ queryKey: ['blog', variables.postFile.fileId] });
        queryClient.invalidateQueries({
          queryKey: ['blog', variables.postFile.fileMetadata.appData.content.id],
        });
        queryClient.invalidateQueries({
          queryKey: [
            'blog',
            variables.postFile.fileMetadata.appData.content.id?.replaceAll('-', ''),
          ],
        });

        queryClient.invalidateQueries({
          queryKey: ['blogs', variables.postFile.fileMetadata.appData.content.channelId || '', ''],
        });
        queryClient.invalidateQueries({
          queryKey: ['blogs', '', ''],
        });

        // Update versionTag of post in social feeds cache
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<HomebaseFile<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newFeed = { ...previousFeed };
          newFeed.pages[0].results = newFeed.pages[0].results.map((post) =>
            post.fileMetadata.appData.content.id ===
            variables.postFile.fileMetadata.appData.content.id
              ? {
                  ...post,
                  fileMetadata: {
                    ...post.fileMetadata,
                    versionTag: _data.newVersionTag,
                  },
                }
              : post
          );

          queryClient.setQueryData(['social-feeds'], newFeed);
        }
      },
      onError: (err) => {
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

        if (variables && variables.postFile.fileMetadata.appData.content.slug) {
          queryClient.invalidateQueries({
            queryKey: ['blog', variables.postFile.fileMetadata.appData.content.slug],
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['blog'] });
        }

        queryClient.invalidateQueries({
          queryKey: ['blogs', variables.postFile.fileMetadata.appData.content.channelId || '', ''],
        });
        queryClient.invalidateQueries({
          queryKey: ['blogs', '', ''],
        });
      },
    }),
  };
};
