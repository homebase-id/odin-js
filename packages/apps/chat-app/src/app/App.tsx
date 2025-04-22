import { lazy, ReactNode, Suspense } from 'react';
import {
  Route,
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useLocation,
} from 'react-router-dom';

import { Helmet, HelmetProvider } from 'react-helmet-async';

import { MinimalLayout, Layout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const ChatHome = lazy(() =>
  import('../templates/Chat/ChatHome').then((chatApp) => ({ default: chatApp.ChatHome }))
);
const ChatCreateAndOrRedirect = lazy(() =>
  import('../templates/Chat/ChatCreateAndOrRedirect').then((chatApp) => ({
    default: chatApp.ChatCreateAndOrRedirect,
  }))
);

import './App.css';

const AUTH_PATH = CHAT_ROOT_PATH + '/auth';
const AUTH_FINALIZE_PATH = CHAT_ROOT_PATH + '/auth/finalize';

import {
  ErrorBoundary,
  NotFound,
  OdinClientProvider,
  CHAT_ROOT_PATH,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { OdinQueryClient } from '@homebase-id/common-app';
import { useValidateAuthorization } from '../hooks/auth/useAuth';

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={CHAT_ROOT_PATH}
          element={
            <ErrorBoundary>
              <RootRoute>
                <Suspense fallback={<></>}>
                  <Outlet />
                </Suspense>
              </RootRoute>
            </ErrorBoundary>
          }
        >
          <Route path="auth" element={<Auth />}></Route>
          <Route path="auth/finalize" element={<FinalizeAuth />}></Route>

          {/* Chat: */}
          <Route
            path=""
            element={
              <Layout>
                <Outlet />
              </Layout>
            }
          >
            <Route index={true} element={<ChatHome />} />
            <Route path={':conversationKey'} element={<ChatHome />} />
            <Route path={':conversationKey/info'} element={<ChatHome />} />
            <Route path={':conversationKey/edit'} element={<ChatHome />} />
            <Route path={'new'} element={<ChatHome />} />
            <Route path={'open/:odinId'} element={<ChatCreateAndOrRedirect />} />
            <Route path={'new-group'} element={<ChatHome />} />
            <Route path={':conversationKey/:chatMessageKey'} element={<ChatHome />} />
            <Route path={':conversationKey/:chatMessageKey/:mediaKey'} element={<ChatHome />} />
            <Route path={'starred'} element={<ChatHome />} />
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
    ),
    {
      future: {
        v7_relativeSplatPath: true,
      },
    }
  );

  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
      </Helmet>
      <OdinQueryClient app="app" type="indexeddb">
        <OdinClientProvider>
          <RouterProvider
            router={router}
            fallbackElement={<></>}
            future={{
              v7_startTransition: true,
            }}
          />
        </OdinClientProvider>
      </OdinQueryClient>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  useValidateAuthorization();

  const isAuthenticated = useOdinClientContext().isAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    if (location.pathname === AUTH_PATH || location.pathname === AUTH_FINALIZE_PATH) {
      return <>{children}</>;
    }

    console.debug('[NOT AUTHENTICATED]: Redirect to login');
    return (
      <Navigate
        to={`${AUTH_PATH}?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  }

  return <>{children}</>;
};

export { App };
