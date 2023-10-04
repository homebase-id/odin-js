import { Link } from 'react-router-dom';
import { ROOT_PATH } from '../../../../app/App';
import { config } from '../../../../app/config';

const Header = () => {
  return (
    <header className="body-font">
      <div className="container mx-auto flex flex-row flex-wrap items-center px-5 py-3 md:flex-row md:p-5">
        <Link
          className="flex flex-row items-center gap-2"
          to={`${ROOT_PATH}${window.location.search}`}
        >
          <img src={config.logo} className="h-10" />
          <p className="text-2xl tracking-wide">
            {config.brandName}
            <small className="block text-sm">{config.brandSlogan}</small>
          </p>
        </Link>
      </div>
    </header>
  );
};

export default Header;
