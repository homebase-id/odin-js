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

import Layout, { MinimalLayout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const MailHome = lazy(() =>
  import('../templates/Mail/MailHome').then((mailApp) => ({ default: mailApp.MailHome }))
);
const MailThread = lazy(() =>
  import('../templates/Mail/MailThread').then((mailApp) => ({ default: mailApp.MailThread }))
);
const MailComposerPage = lazy(() =>
  import('../templates/Mail/MailComposerPage').then((mailApp) => ({
    default: mailApp.MailComposerPage,
  }))
);
const MailSettings = lazy(() =>
  import('../templates/Mail/MailSettings').then((mailApp) => ({
    default: mailApp.MailSettingsPage,
  }))
);
const DebugDataPage = lazy(() =>
  import('../templates/Mail/DebugData').then((mailApp) => ({ default: mailApp.DebugDataPage }))
);

import '@youfoundation/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/mail';
const AUTH_PATH = ROOT_PATH + '/auth';

import { ErrorBoundary, NotFound, OdinQueryClient } from '@youfoundation/common-app';
import { DotYouClientProvider } from '../components/Auth/DotYouClientProvider';

export const REACT_QUERY_CACHE_KEY = 'MAIL_REACT_QUERY_OFFLINE_CACHE';

// Explicit includes to avoid persisting media items, or large data in general
const REACT_QUERY_INCLUDED_QUERY_KEYS = [
  'mail-conversations',
  'connection-details',
  'push-notifications',
  'site-data',
  'mail-settings',

  // Small data (blobs to local file Uri)
  'image',
];

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

          {/* Mail: */}
          <Route
            path=""
            element={
              <RootRoute>
                <DotYouClientProvider>
                  <Layout>
                    <Suspense fallback={<></>}>
                      <Outlet />
                    </Suspense>
                  </Layout>
                </DotYouClientProvider>
              </RootRoute>
            }
          >
            <Route index={true} element={<MailHome />} />
            <Route path=":filter" element={<MailHome />} />
            <Route path=":filter/:conversationKey" element={<MailThread />} />
            <Route path=":filter/:conversationKey/:messageKey" element={<MailThread />} />
            <Route
              path=":filter/:conversationKey/:messageKey/:payloadKey"
              element={<MailThread />}
            />
            <Route path="new" element={<MailComposerPage />} />
            <Route path="new/:draftKey" element={<MailComposerPage />} />
            <Route path="settings" element={<MailSettings />} />
            <Route path="debug" element={<DebugDataPage />} />
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
