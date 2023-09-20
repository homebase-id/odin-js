import { Helmet } from 'react-helmet-async';
import { HomePageTheme } from '@youfoundation/js-lib/public';
import HomeClassic from './Classic/HomeClassic';
import HomeContent from './Content/HomeContent';
import HomeCover from './Cover/HomeCover';
import { useSiteData } from '@youfoundation/common-app';
import HomeLinks from './Links/HomeLinks';

const Home = ({ tab }: { tab?: string }) => {
  const { home, owner } = useSiteData().data ?? {};

  if (!home) {
    return <></>;
  }

  const renderBody = () => {
    if (home?.template === HomePageTheme.SocialClassic.toString()) {
      return <HomeClassic templateSettings={home.templateSettings} tab={tab} />;
    } else if (home?.template === HomePageTheme.ContentProducer.toString()) {
      return <HomeContent templateSettings={home.templateSettings} tab={tab} />;
    } else if (home?.template === HomePageTheme.Links.toString()) {
      return <HomeLinks templateSettings={home.templateSettings} />;
    } else {
      return <HomeCover leadText={home?.leadText} templateSettings={home.templateSettings} />;
    }
  };

  return (
    <>
      <Helmet>
        <title>{owner?.firstName ?? 'Home'} | Homebase</title>
      </Helmet>
      {renderBody()}
    </>
  );
};

export default Home;
