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

export const REACT_QUERY_CACHE_KEY = 'CHAT_REACT_QUERY_OFFLINE_CACHE';
const REACT_QUERY_INCLUDED_QUERY_KEYS = [
  'chat-message',
  'chat-messages',
  'conversations',
  'conversation-metadata',
  'chat-reaction',
  'connection-details',
  'process-inbox',
];

import { MinimalLayout, NoLayout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const ChatHome = lazy(() =>
  import('../templates/Chat/ChatHome').then((chatApp) => ({ default: chatApp.ChatHome }))
);

import '@homebase-id/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/chat';
const AUTH_PATH = ROOT_PATH + '/auth';

import { ErrorBoundary, NotFound, DotYouClientProvider } from '@homebase-id/common-app';
import VideoPlayer from '../templates/VideoPlayer/VideoPlayer';
import { OdinQueryClient } from '@homebase-id/common-app';

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
            <Route index={true} element={<ChatHome />} />
            <Route path={':conversationKey'} element={<ChatHome />} />
            <Route path={'new'} element={<ChatHome />} />
            <Route path={'new-group'} element={<ChatHome />} />
            <Route path={':conversationKey/:chatMessageKey'} element={<ChatHome />} />
            <Route path={':conversationKey/:chatMessageKey/:mediaKey'} element={<ChatHome />} />
            <Route path={'player/:videoFileId/:videoFileKey'} element={<VideoPlayer />} />
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

export { App };
