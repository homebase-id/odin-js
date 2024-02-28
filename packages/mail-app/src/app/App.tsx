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

import '@youfoundation/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '/apps/mail';
const AUTH_PATH = ROOT_PATH + '/auth';

import { ErrorBoundary, NotFound } from '@youfoundation/common-app';
import { DotYouClientProvider } from '../components/Auth/DotYouClientProvider';
import { MailThread } from '../templates/Mail/MailThread';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
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
const INCLUDED_QUERY_KEYS = ['conversation', 'conversations'];
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
                    <Outlet />
                  </Layout>
                </DotYouClientProvider>
              </RootRoute>
            }
          >
            <Route index={true} element={<MailHome />} />
            <Route path="new" element={<MailHome />} />

            <Route path="inbox" element={<MailHome />} />
            <Route path="inbox/:conversationKey" element={<MailThread />} />
            <Route path="drafts" element={<MailHome />} />
            <Route path="drafts/:conversationKey" element={<MailThread />} />
            <Route path="sent" element={<MailHome />} />
            <Route path="sent/:conversationKey" element={<MailThread />} />
            <Route path="trash" element={<MailHome />} />
            <Route path="trash/:conversationKey" element={<MailThread />} />
            <Route path="archive" element={<MailHome />} />
            <Route path="archive/:conversationKey" element={<MailThread />} />
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
