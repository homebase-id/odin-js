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
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';
import { useStaticFiles } from '@youfoundation/common-app';

const usePost = () => {
  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publishBlog;
  const dotYouClient = useAuth().getDotYouClient();

  const savePost = async ({
    blogFile,
    channelId,
  }: {
    blogFile: PostFile<PostContent>;
    channelId: string;
  }) => {
    return await savePostFile(dotYouClient, blogFile, channelId);
  };

  const saveFiles = async ({
    files,
    acl,
    channelId,
  }: {
    files: File[];
    acl: AccessControlList;
    channelId: string;
  }) => {
    const targetDrive = getChannelDrive(channelId);

    const imageUploadResults = await Promise.all(
      files.map(async (file) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return await uploadImage(dotYouClient, targetDrive, acl, bytes, undefined, {
          type: file.type as ImageContentType,
        });
      })
    );

    return imageUploadResults.filter(Boolean) as ImageUploadResult[];
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
