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

export const REACT_QUERY_CACHE_KEY = 'COMMUNITY_REACT_QUERY_OFFLINE_CACHE';
const REACT_QUERY_INCLUDED_QUERY_KEYS = ['connection-details', 'process-inbox'];

import { MinimalLayout, NoLayout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const CommunityHome = lazy(() =>
  import('../templates/Community/CommunityHome').then((communityApp) => ({
    default: communityApp.CommunityHome,
  }))
);

import '@youfoundation/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/community';
const AUTH_PATH = ROOT_PATH + '/auth';

import {
  ErrorBoundary,
  NotFound,
  DotYouClientProvider,
  OdinQueryClient,
} from '@youfoundation/common-app';
import { CommunityChannelDetail } from '../templates/Community/CommunityChannelDetail';
import { CommunityDirectDetail } from '../templates/Community/CommunityDirectDetail';
import { COMMUNITY_DEFAULT_GENERAL_ID } from '../providers/CommunityProvider';

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
              {/* TODO: Run this when on desktop? */}
              {/* <Route index={true} element={<Navigate to={COMMUNITY_DEFAULT_GENERAL_ID} />} /> */}
              <Route path={':channelKey'} element={<CommunityChannelDetail />} />
              <Route path={':channelKey/:chatMessageKey'} element={<CommunityChannelDetail />} />
              <Route path={':channelKey/thread/:threadKey'} element={<CommunityChannelDetail />} />
              <Route
                path={':channelKey/thread/:threadKey/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelDetail />}
              />
              <Route
                path={':channelKey/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelDetail />}
              />
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
