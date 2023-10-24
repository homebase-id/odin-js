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
} from '@youfoundation/js-lib/public';
import { getRichTextFromString, useDotYouClient, useStaticFiles } from '@youfoundation/common-app';
import {
  AccessControlList,
  ImageContentType,
  ImageUploadResult,
  MultiRequestCursoredResult,
  ThumbnailFile,
  UploadResult,
  VideoContentType,
  VideoUploadResult,
  deleteFile,
  uploadImage,
  uploadVideo,
} from '@youfoundation/js-lib/core';
import { segmentVideoFile } from '@youfoundation/js-lib/helpers';
import { PostFileVm } from '@youfoundation/js-lib/transit';

export interface FileLike {
  name: string;
  bytes: Uint8Array;
  size: number;
  type: 'image/jpeg' | 'image/png' | 'video/mp4';
}

export interface AttachmentFile {
  file: File | FileLike;
  thumbnail?: ThumbnailFile;
}

export const usePost = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const savePost = async ({
    blogFile,
    channelId,
  }: {
    blogFile: PostFile<PostContent>;
    channelId: string;
  }) => {
    return new Promise<UploadResult>((resolve) => {
      const onVersionConflict = async () => {
        const serverPost = await getPost(dotYouClient, channelId, blogFile.content.id);
        if (!serverPost) return;

        const newPost = { ...serverPost, content: { ...serverPost.content, ...blogFile.content } };
        savePostFile(dotYouClient, newPost, channelId, onVersionConflict).then((result) => {
          if (result) resolve(result);
        });
      };

      savePostFile(
        dotYouClient,
        {
          ...blogFile,
          content: {
            ...blogFile.content,
            captionAsRichText: getRichTextFromString(blogFile.content.caption.trim()),
          },
        },
        channelId,
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
  }: {
    files: AttachmentFile[];
    acl: AccessControlList;
    channelId: string;
  }): Promise<(ImageUploadResult | VideoUploadResult)[]> => {
    const targetDrive = getChannelDrive(channelId);

    const imageUploadResults = await Promise.all(
      files.map(async (file) => {
        if (file.file.type === 'video/mp4') {
          // if video is tiny enough (less than 10MB), don't segment just upload
          if (file.file.size < 10000000 || 'bytes' in file.file)
            return await uploadVideo(
              dotYouClient,
              targetDrive,
              acl,
              'bytes' in file.file ? file.file.bytes : file.file,
              { isSegmented: false, mimeType: file.file.type, fileSize: file.file.size },
              {
                type: file.file.type as VideoContentType,
                thumb: 'thumbnail' in file ? file.thumbnail : undefined,
              }
            );

          const { bytes: processedBytes, metadata } = await segmentVideoFile(file.file);

          return await uploadVideo(dotYouClient, targetDrive, acl, processedBytes, metadata, {
            type: file.file.type as VideoContentType,
            thumb: 'thumbnail' in file ? file.thumbnail : undefined,
          });
        } else {
          return await uploadImage(
            dotYouClient,
            targetDrive,
            acl,
            'bytes' in file.file ? file.file.bytes : file.file,
            undefined,
            {
              type: file.file.type as ImageContentType,
            },
            [
              { quality: 85, width: 600, height: 600 },
              { quality: 99, width: 1600, height: 1600, type: 'jpeg' },
            ]
          );
        }
      })
    );

    return imageUploadResults.filter(Boolean) as (ImageUploadResult | VideoUploadResult)[];
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
    save: useMutation(savePost, {
      onSuccess: (_data, variables) => {
        if (variables.blogFile.content.slug) {
          queryClient.invalidateQueries(['blog', variables.blogFile.content.slug]);
        } else {
          queryClient.invalidateQueries(['blog']);
        }

        // Too many invalidates, but during article creation, the slug is not known
        queryClient.invalidateQueries(['blog', variables.blogFile.fileId]);
        queryClient.invalidateQueries(['blog', variables.blogFile.content.id]);
        queryClient.invalidateQueries(['blog', variables.blogFile.content.id?.replaceAll('-', '')]);

        queryClient.removeQueries(['blogs']);

        // Update versionTag of post in social feeds cache
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<PostFileVm<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newFeed = { ...previousFeed };
          newFeed.pages[0].results = newFeed.pages[0].results.map((post) =>
            post.content.id === variables.blogFile.content.id
              ? { ...post, versionTag: _data.newVersionTag }
              : post
          );

          queryClient.setQueryData(['social-feeds'], newFeed);
        }
      },
      onMutate: async (newPost) => {
        await queryClient.cancelQueries(['social-feeds']);

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
                          ...newPost.blogFile,
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
        queryClient.invalidateQueries(['social-feeds']);
      },
    }),
    saveFiles: useMutation(saveFiles),
    removeFiles: useMutation(removeFiles),
    remove: useMutation(removeData, {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries(['social-feeds']);

        if (variables && variables.slug) {
          queryClient.invalidateQueries(['blog', variables.slug]);
        } else {
          queryClient.invalidateQueries(['blog']);
        }
        queryClient.invalidateQueries(['blogs']);
      },
    }),
  };
};
