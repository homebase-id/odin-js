import { FC, ReactNode } from 'react';
import { useDarkMode } from '@homebase-id/common-app';
import Header from './Header/Header';
import Footer from './Footer/Footer';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  // Layout wraps every route, so this one call themes the whole flow
  useDarkMode();

  return (
    <>
      <div className={`flex min-h-screen flex-col text-foreground`}>
        <Header />
        {children}
        <Footer />
      </div>
    </>
  );
};
