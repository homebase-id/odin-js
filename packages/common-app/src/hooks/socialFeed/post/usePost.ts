import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PostFile,
  PostContent,
  getChannelDrive,
  removePost,
  savePost as savePostFile,
  getPost,
  Media,
  getPostByFileId,
  NewMediaFile,
} from '@youfoundation/js-lib/public';
import { getRichTextFromString, useDotYouClient } from '@youfoundation/common-app';
import {
  AccessControlList,
  MultiRequestCursoredResult,
  UploadResult,
  VideoContentType,
  VideoUploadResult,
  deleteFile,
  uploadVideo,
} from '@youfoundation/js-lib/core';
import { segmentVideoFile } from '@youfoundation/js-lib/helpers';
import { PostFileVm } from '@youfoundation/js-lib/transit';

export const usePost = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const savePost = async ({
    postFile,
    channelId,
    mediaFiles,
  }: {
    postFile: PostFile<PostContent>;
    channelId: string;
    mediaFiles?: NewMediaFile[];
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
        onVersionConflict
      ).then((result) => {
        if (result) resolve(result);
      });
    });
  };

  const saveFiles = async ({
    files,
    acl,
    channelId,
    onUpdate,
  }: {
    files: NewMediaFile[];
    acl: AccessControlList;
    channelId: string;
    onUpdate?: (progress: number) => void;
  }): Promise<VideoUploadResult[]> => {
    const targetDrive = getChannelDrive(channelId);
    let progress = 0;

    const uploadPromises = files.map(async (file) => {
      // if (file.file.type === 'video/mp4') {
      // if video is tiny enough (less than 10MB), don't segment just upload
      if (file.file.size < 10000000 || 'bytes' in file.file)
        return await uploadVideo(
          dotYouClient,
          targetDrive,
          acl,
          file.file,
          { isSegmented: false, mimeType: file.file.type, fileSize: file.file.size },
          {
            type: file.file.type as VideoContentType,
            thumb: 'thumbnail' in file ? file.thumbnail : undefined,
          }
        );

      onUpdate?.(++progress / files.length);

      const { data: segmentedVideoData, metadata } = await segmentVideoFile(file.file);

      return await uploadVideo(dotYouClient, targetDrive, acl, segmentedVideoData, metadata, {
        type: file.file.type as VideoContentType,
        thumb: 'thumbnail' in file ? file.thumbnail : undefined,
      });
      // } else {
      //   return await uploadImage(
      //     dotYouClient,
      //     targetDrive,
      //     acl,
      //     file.file,
      //     undefined,
      //     {},
      //     [
      //       { quality: 85, width: 600, height: 600 },
      //       { quality: 99, width: 1600, height: 1600, type: 'jpeg' },
      //     ],
      //     (update) => {
      //       progress += update;
      //       onUpdate?.(progress / files.length);
      //     }
      //   );
      // }
    });

    const imageUploadResults = await Promise.all(uploadPromises);
    return imageUploadResults.filter(Boolean) as VideoUploadResult[];
  };

  const removeFiles = async ({
    files,

    channelId,
  }: {
    files: string[];

    channelId: string;
  }) => {
    const targetDrive = getChannelDrive(channelId);

    await Promise.all(
      files.map(async (fileId) => {
        return await deleteFile(dotYouClient, targetDrive, fileId);
      })
    );
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
      if (post.content.primaryMediaFile)
        await deleteFile(dotYouClient, channelDrive, post.content.primaryMediaFile.fileId);

      const mediaPost = post as any as Media;
      if (mediaPost.mediaFiles) {
        await Promise.all(
          mediaPost.mediaFiles.map(async (file) => {
            await deleteFile(dotYouClient, channelDrive, file.fileId);
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
    // saveVideoFiles: useMutation({ mutationFn: saveFiles }),
    // removeFiles: useMutation({ mutationFn: removeFiles }),
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
