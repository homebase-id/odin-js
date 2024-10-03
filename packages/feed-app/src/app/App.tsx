import { lazy, ReactNode, Suspense } from 'react';
import {
  Route,
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Layout, MinimalLayout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const SocialFeed = lazy(() => import('../templates/SocialFeed/SocialFeed'));
const ArticleComposerPage = lazy(() => import('../templates/SocialFeed/ArticleComposerPage'));
const ArticleDuplicatePage = lazy(() => import('../templates/SocialFeed/ArticleDuplicatePage'));
const ArticlesPage = lazy(() => import('../templates/SocialFeed/ArticlesPage'));
const ChannelsPage = lazy(() => import('../templates/SocialFeed/ChannelsPage'));
const IncomingCollaborativeChannelPage = lazy(
  () => import('../templates/SocialFeed/IncomingCollaborativeChannelPage')
);

import '@homebase-id/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/feed';
const AUTH_PATH = ROOT_PATH + '/auth';

import { ErrorBoundary, NotFound, OdinQueryClient } from '@homebase-id/common-app';

export const REACT_QUERY_CACHE_KEY = 'FEED_REACT_QUERY_OFFLINE_CACHE';
const INCLUDED_QUERY_KEYS = ['common-image', 'collaborative-channels'];

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={ROOT_PATH}
          element={
            <ErrorBoundary>
              <Suspense fallback={<></>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          }
        >
          <Route path="auth" element={<Auth />}></Route>
          <Route path="auth/finalize" element={<FinalizeAuth />}></Route>

          {/* Feed: */}
          <Route
            path=""
            element={
              <RootRoute>
                <Layout>
                  <Outlet />
                </Layout>
              </RootRoute>
            }
          >
            <Route index={true} element={<SocialFeed />} />
            <Route path="preview/:identityKey/:channelKey/:postKey" element={<SocialFeed />} />
            <Route
              path="preview/:identityKey/:channelKey/:postKey/:attachmentKey"
              element={<SocialFeed />}
            />
            <Route path="new" element={<ArticleComposerPage />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="edit/:channelKey/:postKey" element={<ArticleComposerPage />} />
            {/* <Route path="edit/:odinKey/:channelKey/:postKey" element={<ArticleComposerPage />} /> */}
            <Route path="duplicate/:channelKey/:postKey" element={<ArticleDuplicatePage />} />

            <Route
              path="channels/incoming-collaborative"
              element={<IncomingCollaborativeChannelPage />}
            />
          </Route>

          <Route
            path="*"
            element={
              <MinimalLayout>
                <Suspense fallback={<></>}>
                  <NotFound />
                </Suspense>
              </MinimalLayout>
            }
          />
        </Route>
      </>
    )
  );

  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
      </Helmet>
      <OdinQueryClient
        cacheKey={REACT_QUERY_CACHE_KEY}
        cachedQueryKeys={INCLUDED_QUERY_KEYS}
        type="indexeddb"
      >
        <RouterProvider router={router} fallbackElement={<></>} />
      </OdinQueryClient>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (window.location.pathname === AUTH_PATH) return <>{children}</>;

    // It can happen that the RootRoute renders when we already are rendering Login, which would cause and endless url of returnUrls; So return early if it is the login already
    if (window.location.pathname === AUTH_PATH) return <></>;

    console.debug('[NOT AUTHENTICATED]: Redirect to login');
    return (
      <Navigate
        to={`${AUTH_PATH}?returnUrl=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`}
      />
    );
  }

  return <>{children}</>;
};

export default App;
