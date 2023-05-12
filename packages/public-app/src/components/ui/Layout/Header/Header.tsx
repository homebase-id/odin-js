import { Link } from 'react-router-dom';
import ProfileNav from '../../../Auth/ProfileNav/ProfileNav';
import useSiteData from '../../../../hooks/siteData/useSiteData';
import useAuth from '../../../../hooks/auth/useAuth';
import AuthorImage from '../../../Post/Common/Blocks/Author/Image';
import { OwnerName } from '../../../Post/Common/Blocks/Author/Name';
import { DarkModeToggle } from '@youfoundation/common-app';

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
        <Link className="title-font flex items-center font-medium" to={'/home'}>
          {owner?.profileImageId ? (
            <AuthorImage className="h-8 w-8 rounded-full lg:h-[3rem] lg:w-[3rem]" />
          ) : null}
          <span className={`ml-3 hidden text-xl font-normal sm:block`}>
            <OwnerName />
          </span>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center justify-center text-base">
          <DarkModeToggle className="mr-2" />
          <ProfileNav />
        </nav>
      </div>
    </header>
  );
};

export default Header;
