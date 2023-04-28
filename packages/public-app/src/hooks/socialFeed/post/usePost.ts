import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AccessControlList,
  deleteFile,
  ImageUploadResult,
  uploadImage,
  PostFile,
  PostContent,
  MultiRequestCursoredResult,
  getChannelDrive,
  removePost,
  savePost as savePostFile,
  PostFileVm,
  ImageContentType,
  uploadVideo,
  VideoContentType,
  VideoUploadResult,
} from '@youfoundation/js-lib';
import { getRichTextFromString } from '../../../helpers/richTextHelper';
import useAuth from '../../auth/useAuth';
import useStaticFiles from '../../staticFiles/useStaticFiles';

const usePost = () => {
  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publishBlog;

  const savePost = async ({
    blogFile,
    channelId,
  }: {
    blogFile: PostFile<PostContent>;
    channelId: string;
  }) => {
    return await savePostFile(
      dotYouClient,
      {
        ...blogFile,
        content: {
          ...blogFile.content,
          captionAsRichText: getRichTextFromString(blogFile.content.caption.trim()),
        },
      },
      channelId
    );
  };

  const saveFiles = async ({
    files,
    acl,
    channelId,
  }: {
    files: File[];
    acl: AccessControlList;
    channelId: string;
  }): Promise<(ImageUploadResult | VideoUploadResult)[]> => {
    const targetDrive = getChannelDrive(channelId);

    const imageUploadResults = await Promise.all(
      files.map(async (file) => {
        if (file.type === 'video/mp4') {
          // if video is tiny enough (less than 10MB), don't segment just upload
          if (file.size < 10000000)
            return await uploadVideo(
              dotYouClient,
              targetDrive,
              acl,
              file,
              { isSegmented: false, mimeType: file.type, fileSize: file.size },
              {
                type: file.type as VideoContentType,
              }
            );

          // Segment video file
          const segmentVideoFile = (await import('@youfoundation/js-lib')).segmentVideoFile;
          const { bytes: processedBytes, metadata } = await segmentVideoFile(file);

          return await uploadVideo(dotYouClient, targetDrive, acl, processedBytes, metadata, {
            type: file.type as VideoContentType,
          });
        } else {
          return await uploadImage(dotYouClient, targetDrive, acl, file, undefined, {
            type: file.type as ImageContentType,
          });
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

        if (!variables.blogFile.isDraft) {
          publishStaticFiles();
        }
      },
      onMutate: async (newPost) => {
        await queryClient.cancelQueries(['social-feeds']);

        // Update section attributes
        const previousFeed:
          | InfiniteData<MultiRequestCursoredResult<PostFileVm<PostContent>[]>>
          | undefined = queryClient.getQueryData(['social-feeds']);

        if (previousFeed) {
          const newFeed = { ...previousFeed };
          newFeed.pages[0].results = [
            {
              ...newPost.blogFile,
              odinId: window.location.hostname,
            },
            ...newFeed.pages[0].results,
          ];

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
        if (variables && variables.slug) {
          queryClient.invalidateQueries(['blog', variables.slug]);
        } else {
          queryClient.invalidateQueries(['blog']);
        }
        queryClient.removeQueries(['blogs']);

        publishStaticFiles();
      },
    }),
  };
};

export default usePost;
