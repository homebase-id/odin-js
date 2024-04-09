import { useNavigate } from 'react-router-dom';
import NavPills from '../../../components/ui/Submenu/NavPills';
import ProfileHero from '../Common/ProfileHero/ProfileHero';
import About from '../Common/About/About';
import LinksHome from '../Common/Links/Links';
import HorizontalPosts from '../Common/Posts/HorizontalPosts';
import Channels from '../Common/Posts/Channels';
import Connections from '../Common/Connections/Connections';
import { useTabs } from '../../../hooks/tabs/useTabs';
import { HOME_ROOT_PATH } from '@youfoundation/common-app';

const HomeContent = () => {
  /// Tabs
  const { tabs, isTabs, activeTab } = useTabs();
  const navigate = useNavigate();
  /// End tabs

  return (
    <>
      <ProfileHero />
      <>
        {isTabs ? (
          <div className="bg-transparent">
            <div className="max-w-[100vw] sm:max-w-none">
              <div className="container mx-auto overflow-auto px-5 py-4">
                <NavPills
                  onChange={(newTab) =>
                    navigate(`${HOME_ROOT_PATH}${newTab}`, { preventScrollReset: true })
                  }
                  items={tabs.map((tab) => ({
                    ...tab,
                    isActive: tab.key === activeTab,
                    href: `${HOME_ROOT_PATH}${tab.key}`,
                  }))}
                  disallowWrap={true}
                />
              </div>
            </div>
          </div>
        ) : null}
        <div className="container mx-auto px-2 sm:px-5">
          <div className="py-10">
            {(activeTab === 'about' || !isTabs) && <About />}
            {(activeTab === 'links' || !isTabs) && <LinksHome />}
            {isTabs ? activeTab === 'posts' && <HorizontalPosts /> : <Channels className="mb-10" />}
            {(activeTab === 'connections' || !isTabs) && <Connections />}
          </div>
        </div>
      </>
    </>
  );
};

export default HomeContent;
