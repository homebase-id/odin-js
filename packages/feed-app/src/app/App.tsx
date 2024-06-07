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
import { QueryClient } from '@tanstack/react-query';
import {
  PersistQueryClientOptions,
  PersistQueryClientProvider,
  removeOldestQuery,
} from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import Layout, { MinimalLayout } from '../components/ui/Layout/Layout';

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

import '@youfoundation/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/feed';
const AUTH_PATH = ROOT_PATH + '/auth';

import { ErrorBoundary, NotFound } from '@youfoundation/common-app';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

export const REACT_QUERY_CACHE_KEY = 'FEED_REACT_QUERY_OFFLINE_CACHE';
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  retry: removeOldestQuery,
  key: REACT_QUERY_CACHE_KEY,
});

// Explicit includes to avoid persisting media items, or large data in general
const INCLUDED_QUERY_KEYS = ['collaborative-channels'];
const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  buster: '202403',
  maxAge: Infinity,
  persister: localStoragePersister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      if (
        query.state.status === 'pending' ||
        query.state.status === 'error' ||
        (query.state.data &&
          typeof query.state.data === 'object' &&
          !Array.isArray(query.state.data) &&
          Object.keys(query.state.data).length === 0)
      )
        return false;
      const { queryKey } = query;
      return INCLUDED_QUERY_KEYS.some((key) => queryKey.includes(key));
    },
  },
};

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
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RouterProvider router={router} fallbackElement={<></>} />
      </PersistQueryClientProvider>
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
