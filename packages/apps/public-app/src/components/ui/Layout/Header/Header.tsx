import { Link, useMatch } from 'react-router-dom';
import ProfileNav from '../../../Auth/ProfileNav/ProfileNav';

import {
  DarkModeToggle,
  HOME_ROOT_PATH,
  OwnerImage,
  OwnerName,
  useChannel,
  useDotYouClientContext,
  usePost,
  useSiteData,
} from '@homebase-id/common-app';

const Header = () => {
  const { owner } = useSiteData().data ?? {};
  const postMatch = useMatch(`${HOME_ROOT_PATH}posts/:channelKey/:postKey`);
  const { isLoading: channelLoading } = useChannel({
    channelKey: postMatch?.params.channelKey,
  }).fetch;
  const { data: post, isLoading: postLoading } = usePost(postMatch?.params);

  // An article's reader has a bar of its own, with the site's login in it; until a post's page knows
  // whether it is an article, no bar, rather than the site's flashing before the reader's
  if (postMatch && (channelLoading || postLoading)) return null;
  if (post?.fileMetadata.appData.content.type === 'Article') return null;

  return (
    <header className="body-font bg-background">
      <div
        className={`mx-auto flex flex-row flex-wrap items-center px-5 py-2 lg:container md:flex-row lg:p-5 lg:py-3`}
      >
        <Link className="title-font flex items-center font-medium" to={HOME_ROOT_PATH}>
          {owner?.profileImageFileKey ? (
            <OwnerImage className="h-8 w-8 rounded-full lg:h-[3rem] lg:w-[3rem]" />
          ) : null}
          <span className={`ml-3 hidden text-xl font-normal sm:block`}>
            <OwnerName />
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
};

/** Dark mode and login, for visitors; the owner has the sidenav */
export const SiteNav = () =>
  useDotYouClientContext().isOwner() ? null : (
    <nav className="ml-auto flex flex-wrap items-center justify-center text-base">
      <DarkModeToggle className="mr-2" />
      <ProfileNav />
    </nav>
  );

export default Header;
