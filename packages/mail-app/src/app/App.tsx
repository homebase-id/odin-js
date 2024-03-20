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
const DebugDataPage = lazy(() =>
  import('../templates/Mail/DebugData').then((mailApp) => ({ default: mailApp.DebugDataPage }))
);

import '@youfoundation/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/mail';
const AUTH_PATH = ROOT_PATH + '/auth';

import { ErrorBoundary, NotFound } from '@youfoundation/common-app';
import { DotYouClientProvider } from '../components/Auth/DotYouClientProvider';
import { createExperimentalPersiter } from './createExperimentalPersister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours,
      persister: createExperimentalPersiter(),
    },
  },
});

export const REACT_QUERY_CACHE_KEY = 'MAIL_REACT_QUERY_OFFLINE_CACHE';
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  retry: removeOldestQuery,
  key: REACT_QUERY_CACHE_KEY,
});

// Explicit includes to avoid persisting media items, or large data in general
const INCLUDED_QUERY_KEYS = ['connectionDetails', 'push-notifications', 'siteData'];
const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  maxAge: Infinity,
  persister: localStoragePersister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
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
    return <Navigate to={`${ROOT_PATH}/auth`} />;
  }

  return <>{children}</>;
};

export default App;
