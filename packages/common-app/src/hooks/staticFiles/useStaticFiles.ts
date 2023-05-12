import { useMutation } from '@tanstack/react-query';
import {
  publishProfile,
  publishBlog,
  publishProfileImage,
  publishProfileCard,
} from '@youfoundation/js-lib';
import { useDotYouClient } from '../../..';

export const useStaticFiles = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const publishData = async () => {
    console.debug('[STARTED] Static file publish');

    await Promise.all([
      await publishProfile(dotYouClient),
      await publishProfileImage(dotYouClient),
      await publishProfileCard(dotYouClient),
    ]);

    console.debug('[COMPLETEDED] Static file publish');
  };

  const publishBlogData = async () => {
    console.debug('[STARTED] Static file blog publish');

    await Promise.all([await publishBlog(dotYouClient)]);

    console.debug('[COMPLETEDED] Static file blog publish');
  };

  return {
    publish: useMutation(publishData, {
      onError: (ex) => {
        console.error(ex);
      },
    }),
    publishBlog: useMutation(publishBlogData, {
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
