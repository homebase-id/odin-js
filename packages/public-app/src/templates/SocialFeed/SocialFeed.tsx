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

const Feed = () => {
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
      <section className="flex-grow bg-page-background">
        <div className="container mx-auto max-w-3xl gap-5 py-3 sm:py-10 lg:grid lg:max-w-6xl lg:grid-cols-4 lg:px-5">
          <div className="hidden lg:block">
            {isDesktop ? (
              <div className="sticky top-4">
                <Suspense>
                  <IdentityLink className="mb-3 overflow-hidden rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm hover:shadow-md dark:border-gray-800 hover:dark:shadow-slate-600" />
                  <FollowersView className="rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                </Suspense>
              </div>
            ) : null}
          </div>
          <div className={`lg:col-span-2`}>
            <SocialFeedMainContent />
          </div>
          <div className="hidden lg:block">
            {isDesktop ? (
              <div className="sticky top-4">
                <Suspense>
                  <ConnectionsView className="mb-3 rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                  <CirclesView className="mb-3 rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                  <FollowingView className="rounded-md border border-gray-200 border-opacity-60 bg-background shadow-sm dark:border-gray-800" />
                </Suspense>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
};

export default Feed;
