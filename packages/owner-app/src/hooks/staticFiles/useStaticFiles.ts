import { useMutation } from '@tanstack/react-query';
import {
  ApiType,
  DotYouClient,
  publishProfile,
  publishBlog,
  publishProfileImage,
  publishProfileCard,
} from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';

const useStaticFiles = () => {
  const { getSharedSecret } = useAuth();

  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

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

export default useStaticFiles;
