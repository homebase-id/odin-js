import { FC } from 'react';
import { OwnerName, getVersion, useSiteData } from '@homebase-id/common-app';
import { t } from '@homebase-id/common-app';

import Socials from '../Socials/Socials';
import { Homebase } from '@homebase-id/common-app';

interface FooterProps {
  className: string;
}

const Footer: FC<FooterProps> = ({ className }) => {
  const { social } = useSiteData().data ?? {};

  return (
    <footer className={`body-font bg-background ${className}`}>
      <div className="container mx-auto flex flex-col items-center px-5 py-8 sm:flex-row">
        <p className="title-font flex h-10 items-center justify-center font-medium md:justify-start">
          <Homebase className="h-12 w-12" />
          <span className="ml-3 text-xl">
            <OwnerName />
            <small className="block text-xs font-normal">
              {t('Only using strictly necessary cookies. No tracking')}
            </small>
          </span>
        </p>
        <a
          href="/api/v1/version"
          className="mt-4 text-sm text-gray-500 sm:ml-auto sm:mt-0 sm:border-l-2 sm:border-gray-200 sm:py-2 sm:pl-4 dark:sm:border-gray-700"
        >
          © {new Date().getFullYear()} | v.
          {getVersion()}
        </a>
        <Socials
          socialHandles={social}
          className="mt-4 justify-center sm:ml-4 sm:mt-0 sm:justify-start"
        />
      </div>
    </footer>
  );
};

export default Footer;
