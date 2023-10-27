import { Link } from 'react-router-dom';
import ProfileNav from '../../../Auth/ProfileNav/ProfileNav';

import {
  AuthorImage,
  DarkModeToggle,
  HOME_ROOT_PATH,
  OwnerName,
  useSiteData,
} from '@youfoundation/common-app';
import { useAuth } from '../../../../hooks/auth/useAuth';

const Header = () => {
  const { isOwner } = useAuth();
  const { owner } = useSiteData().data ?? {};

  return (
    <header className="body-font bg-background">
      <div
        className={`mx-auto flex flex-row flex-wrap items-center px-5 py-2 lg:container md:flex-row lg:p-5 lg:py-3 ${
          isOwner ? 'pl-16 lg:pl-5' : ''
        }`}
      >
        <Link className="title-font flex items-center font-medium" to={HOME_ROOT_PATH}>
          {owner?.profileImageId ? (
            <AuthorImage className="h-8 w-8 rounded-full lg:h-[3rem] lg:w-[3rem]" />
          ) : null}
          <span className={`ml-3 hidden text-xl font-normal sm:block`}>
            <OwnerName />
          </span>
        </Link>
        {isOwner ? null : (
          <nav className="ml-auto flex flex-wrap items-center justify-center text-base">
            <DarkModeToggle className="mr-2" />
            <ProfileNav />
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
