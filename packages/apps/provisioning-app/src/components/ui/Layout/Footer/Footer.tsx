import { ROOT_PATH } from '../../../../app/App';
import { Link } from 'react-router-dom';
import { t } from '../../../../helpers/i18n/dictionary';
import { ReactNode } from 'react';

import { config } from '../../../../app/config';

const Footer = () => {
  return (
    <footer className="mt-auto pb-3 pt-4">
      <section className="container mx-auto flex flex-col items-center gap-2">
        <Link
          className="flex flex-row items-center gap-2"
          to={`${ROOT_PATH}${window.location.search}`}
        >
          <img src={config.logo} className="h-5" />
          <p className="text-lg tracking-wide">{config.brandName}</p>
        </Link>
        <nav className="flex flex-row items-center gap-2 text-sm">
          <NavItem href={config.termsAndConditionsLink}>
            {t('Terms & Conditions')}
          </NavItem>
          |
          <NavItem href={config.privacyPolicyLink}>
            {t('Privacy Policy')}
          </NavItem>
        </nav>
      </section>
    </footer>
  );
};

const NavItem = (props: { href: string; children: ReactNode }) => (
  <a {...props} className={`underline-offset-2 hover:underline`} />
);

export default Footer;
