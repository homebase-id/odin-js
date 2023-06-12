import { FC, ReactNode, Suspense, lazy } from 'react';
import useTheme from '../../../hooks/theme/useTheme';
import useAuth from '../../../hooks/auth/useAuth';
import { ScrollRestoration } from 'react-router-dom';

const Sidenav = lazy(() =>
  import('@youfoundation/common-app').then((commonApp) => ({ default: commonApp.Sidenav }))
);

interface LayoutProps {
  children?: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  const { colors } = useTheme();
  const { isOwner, logout } = useAuth();

  return (
    <>
      <style type="text/css">
        {`:root {
            ${Object.keys(colors.light)
              .map((key) => `--color-${key}: ${colors.light[key]};`)
              .join('')}
          }`}
        {`html.dark {
            ${Object.keys(colors.dark)
              .map((key) => `--color-${key}: ${colors.dark[key]};`)
              .join('')}
          }`}
        {`html.dark { background-color: rgba(var(--color-page-background)); }`}
      </style>
      <ScrollRestoration />
      <div className="relative flex flex-row bg-page-background text-foreground">
        {isOwner ? (
          <Suspense fallback={<></>}>
            <Sidenav logout={logout} />
          </Suspense>
        ) : null}
        <div className={`flex min-h-screen w-auto flex-grow flex-col`}>{children}</div>
      </div>
    </>
  );
};

export default Layout;
