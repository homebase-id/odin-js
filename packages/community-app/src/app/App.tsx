import { lazy, ReactNode, Suspense } from 'react';
import {
  Route,
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useParams,
} from 'react-router-dom';

import { Helmet, HelmetProvider } from 'react-helmet-async';

export const REACT_QUERY_CACHE_KEY = 'COMMUNITY_REACT_QUERY_OFFLINE_CACHE';
const REACT_QUERY_INCLUDED_QUERY_KEYS = [
  'connection-details',
  'process-inbox',
  'communities',
  'community-channels',
  'community-messages',
  'channels-with-recent-message',
];

import { MinimalLayout, NoLayout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const CommunityHome = lazy(() =>
  import('../templates/Community/CommunityHome').then((communityApp) => ({
    default: communityApp.CommunityHome,
  }))
);

import '@homebase-id/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/community';
const AUTH_PATH = ROOT_PATH + '/auth';

import {
  ErrorBoundary,
  NotFound,
  DotYouClientProvider,
  OdinQueryClient,
} from '@homebase-id/common-app';

const CommunityChannelDetail = lazy(() =>
  import('../templates/Community/CommunityChannelDetail').then((communityApp) => ({
    default: communityApp.CommunityChannelDetail,
  }))
);
const CommunityDirectDetail = lazy(() =>
  import('../templates/Community/CommunityDirectDetail').then((communityApp) => ({
    default: communityApp.CommunityDirectDetail,
  }))
);

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

          {/* Chat: */}
          <Route
            path=""
            element={
              <RootRoute>
                <DotYouClientProvider>
                  <NoLayout>
                    <Outlet />
                  </NoLayout>
                </DotYouClientProvider>
              </RootRoute>
            }
          >
            <Route index={true} element={<CommunityHome />} />
            <Route path={'new'} element={<CommunityHome />} />
            <Route
              path={':communityKey'}
              element={
                <CommunityHome>
                  <Outlet />
                </CommunityHome>
              }
            >
              <Route index={true} element={<CommunityRootRoute />} />

              {/* Items for 'all' */}
              <Route path={'all'} element={<CommunityChannelDetail />} />
              <Route path={'all/:chatMessageKey'} element={<CommunityChannelDetail />} />
              <Route path={'all/:chatMessageKey/:mediaKey'} element={<CommunityChannelDetail />} />
              {/* Items for 'all' within a thread */}
              <Route path={'all/:threadKey/thread'} element={<CommunityChannelDetail />} />
              <Route
                path={'all/:threadKey/thread/:chatMessageKey'}
                element={<CommunityChannelDetail />}
              />
              <Route
                path={'all/:threadKey/thread/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelDetail />}
              />

              {/* Items for 'channel' */}
              <Route path={':channelKey'} element={<CommunityChannelDetail />} />
              <Route path={':channelKey/:chatMessageKey'} element={<CommunityChannelDetail />} />
              <Route
                path={':channelKey/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelDetail />}
              />

              {/* Items for 'channel' within a thread*/}
              <Route path={':channelKey/:threadKey/thread'} element={<CommunityChannelDetail />} />
              <Route
                path={':channelKey/:threadKey/thread/:chatMessageKey'}
                element={<CommunityChannelDetail />}
              />
              <Route
                path={':channelKey/:threadKey/thread/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelDetail />}
              />

              {/* Items for 'direct'*/}
              <Route path={'direct/:dmKey'} element={<CommunityDirectDetail />} />
              <Route path={'direct/:dmKey/:chatMessageKey'} element={<CommunityDirectDetail />} />
              <Route
                path={'direct/:dmKey/:chatMessageKey/:mediaKey'}
                element={<CommunityDirectDetail />}
              />
            </Route>
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
        cachedQueryKeys={REACT_QUERY_INCLUDED_QUERY_KEYS}
        type="indexeddb"
      >
        <RouterProvider router={router} fallbackElement={<></>} />
      </OdinQueryClient>
    </HelmetProvider>
  );
}

const CommunityRootRoute = () => {
  const { communityKey } = useParams();
  return window.innerWidth > 1024 ? <Navigate to={`${ROOT_PATH}/${communityKey}/all`} /> : null;
};

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
