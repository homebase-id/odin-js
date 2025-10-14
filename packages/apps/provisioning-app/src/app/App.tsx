import { lazy, ReactNode, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useMatch,
} from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Layout } from '../components/ui/Layout/Layout';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './App.css';

import InvitationCodeCheck from '../templates/InvitationCode/InvitationCodeCheck';

const ProvisionManagedDomain = lazy(() => import('../templates/Provision/ProvisionManagedDomain'));
const ProvisionOwnDomain = lazy(() => import('../templates/Provision/ProvisionOwnDomain'));

const queryClient = new QueryClient();
export const ROOT_PATH = '/sign-up';

import { config } from './config';
import { ErrorBoundary, NotFound } from '@homebase-id/common-app';
import { useConfiguration } from '../hooks/configuration/useConfiguration';
import { Loader } from '@homebase-id/common-app/icons';

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
        <meta name="description" content={`${config.brandName} - ${config.brandSlogan} `} />
        <title>Signup | {config.brandName}</title>

        <link rel="apple-touch-icon" sizes="180x180" href={`/${config.id}/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`/${config.id}/favicon-32x32.png`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`/${config.id}/favicon-16x16.png`} />
        <link rel="manifest" href={`/${config.id}/site.webmanifest`} />
        <meta name="msapplication-TileColor" content="#2b5797" />
        <meta name="theme-color" content="#ff0000" />
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<Layout />}>
            <Routes>
              <Route
                path=""
                element={
                  <Layout>
                    <Suspense>
                      <ErrorBoundary>
                        <RootRoute>
                          <Outlet />
                        </RootRoute>
                      </ErrorBoundary>
                    </Suspense>
                  </Layout>
                }
              >
                <Route path="/" element={<InvitationCodeCheck />}></Route>
                <Route path={ROOT_PATH}>
                  {/*<Route index={true} element={<DomainChoice />} />*/}
                  <Route index={true} element={<ProvisionManagedDomain />} />
                  <Route path="own-domain" element={<ProvisionOwnDomain />} />
                  <Route
                    path="*"
                    element={
                      <Layout>
                        <NotFound />
                      </Layout>
                    }
                  />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  const { data: configuration, isLoading } = useConfiguration();
  const isRoot = useMatch('/');

  if (isLoading)
    return (
      <div className="flex flex-grow flex-col">
        <Loader className="m-auto h-20 w-20" />
      </div>
    );

  if (!configuration?.invitationCodeEnabled && !!isRoot) {
    return <Navigate to={ROOT_PATH} />;
  }

  return <>{children}</>;
};

export default App;
