import { FC, ReactNode } from 'react';
import { useDarkMode } from '@homebase-id/common-app';
import Header from './Header/Header';
import Footer from './Footer/Footer';

interface LayoutProps {
  children?: ReactNode;
}

const SharedStyleTag = () => (
  <style type="text/css">
    {`:root {
    --color-background: 255 255 255;
    --color-foreground: 11 11 11;
  }`}
    {`html.dark {
    --color-background: 0 0 0;
    --color-foreground: 250 250 250;
  }`}
    {`html.dark { background-color: rgba(var(--color-background)); }`}
  </style>
);

export const Layout: FC<LayoutProps> = ({ children }) => {
  // Layout wraps every route, so this one call themes the whole flow
  useDarkMode();

  return (
    <>
      <SharedStyleTag />
      <div className={`flex min-h-screen flex-col bg-background text-foreground`}>
        <Header />
        {children}
        <Footer />
      </div>
    </>
  );
};
