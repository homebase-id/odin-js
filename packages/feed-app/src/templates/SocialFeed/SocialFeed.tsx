import { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { t } from '@youfoundation/common-app';
import SocialFeedMainContent from '../../components/SocialFeed/MainContent/SocialFeedMainContent';

const ConnectionsView = lazy(
  () => import('../../components/SocialFeed/Sidebars/ConnectionsView/ConnectionsView')
);
const IdentityLink = lazy(
  () => import('../../components/SocialFeed/Sidebars/IdentityLink/IdentityLink')
);
const CirclesView = lazy(
  () => import('../../components/SocialFeed/Sidebars/CirclesView/CirclesView')
);
const FollowersView = lazy(
  () => import('../../components/SocialFeed/Sidebars/FollowersView/FollowersView')
);
const FollowingView = lazy(
  () => import('../../components/SocialFeed/Sidebars/FollowingView/FollowingView')
);

const PostPreview = lazy(() => import('../../components/SocialFeed/MainContent/PostPreview'));

import { Feed } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';

export const SocialFeed = () => {
  const { identityKey, channelKey, postKey, attachmentKey } = useParams();

  useEffect(() => {
    if (postKey) {
      document.documentElement.classList.add('overflow-hidden');
    } else {
      document.documentElement.classList.remove('overflow-hidden');
    }
  }, [postKey]);

  const isDesktop = document.documentElement.clientWidth >= 1024;

  return (
    <>
      <Helmet>
        <title>{t('Feed')} | Odin</title>
      </Helmet>
      <PageMeta title={t('Feed')} icon={Feed} />
      {identityKey && channelKey && postKey ? (
        <div
          className={`fixed inset-0 z-50 overflow-auto bg-page-background bg-opacity-90 backdrop-blur-sm`}
        >
          <Suspense>
            <PostPreview
              postKey={postKey}
              identityKey={identityKey}
              channelKey={channelKey}
              attachmentKey={attachmentKey}
            />
          </Suspense>
        </div>
      ) : null}
      <section className="flex-grow bg-page-background md:pt-0">
        <div className="container mx-auto gap-4 pb-3 sm:pb-10 lg:grid lg:max-w-7xl lg:grid-cols-4">
          <div className={`md:col-span-3 xl:order-2 xl:col-span-2`}>
            <SocialFeedMainContent />
          </div>
          <div className="hidden flex-col gap-4 lg:flex xl:contents">
            <div className="order-1 hidden lg:block ">
              {isDesktop ? (
                <div className="sticky top-4 flex flex-col gap-4">
                  <Suspense>
                    <IdentityLink className="overflow-hidden rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm hover:shadow-md dark:border-gray-800 hover:dark:shadow-slate-600" />
                    <FollowersView className="rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                  </Suspense>
                </div>
              ) : null}
            </div>
            <div className="order-3 hidden lg:block">
              {isDesktop ? (
                <div className="sticky top-4 flex flex-col gap-4">
                  <Suspense>
                    <ConnectionsView className="rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                    <CirclesView className="rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                    <FollowingView className="rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                  </Suspense>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SocialFeed;
