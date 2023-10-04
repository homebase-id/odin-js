import { FC, ReactNode } from 'react';
import Header from './Header/Header';
import Footer from './Footer/Footer';

interface LayoutProps {
  children?: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <div
        className={`flex min-h-screen flex-col bg-background text-foreground`}
      >
        <Header />
        {children}
        <Footer />
      </div>
    </>
  );
};

export default Layout;
