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

import { Layout, MinimalLayout } from '../components/ui/Layout/Layout';

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

import './App.css';

const AUTH_PATH = MAIL_ROOT_PATH + '/auth';
const AUTH_FINALIZE_PATH = MAIL_ROOT_PATH + '/auth/finalize';

import {
  ErrorBoundary,
  NotFound,
  OdinQueryClient,
  OdinClientProvider,
  MAIL_ROOT_PATH,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { useValidateAuthorization } from '../hooks/auth/useAuth';

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={MAIL_ROOT_PATH}
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

          {/* Mail: */}
          <Route
            path=""
            element={
              <Layout>
                <Suspense fallback={<></>}>
                  <Outlet />
                </Suspense>
              </Layout>
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
  const location = useLocation();

  const isAuthenticated = useOdinClientContext().isAuthenticated();

  if (!isAuthenticated) {
    if (location.pathname === AUTH_PATH || location.pathname === AUTH_FINALIZE_PATH)
      return <>{children}</>;

    console.debug('[NOT AUTHENTICATED]: Redirect to login');
    return (
      <Navigate
        to={`${AUTH_PATH}?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  }

  return <>{children}</>;
};

export default App;
