import { Helmet } from 'react-helmet-async';
import { HomePageTheme } from '@youfoundation/js-lib';
import useSiteData from '../../hooks/siteData/useSiteData';
import HomeClassic from './Classic/HomeClassic';
import HomeContent from './Content/HomeContent';
import HomeCover from './Cover/HomeCover';

const Home = ({ tab }: { tab?: string }) => {
  const { home, owner } = useSiteData().data ?? {};

  if (!home) {
    return <></>;
  }

  const renderBody = () => {
    if (home?.template === HomePageTheme.SocialClassic.toString()) {
      return (
        <HomeClassic leadText={home.leadText} templateSettings={home.templateSettings} tab={tab} />
      );
    } else if (home?.template === HomePageTheme.ContentProducer.toString()) {
      return (
        <HomeContent leadText={home.leadText} templateSettings={home.templateSettings} tab={tab} />
      );
    } else {
      return <HomeCover leadText={home?.leadText} templateSettings={home.templateSettings} />;
    }
  };

  return (
    <>
      <Helmet>
        <title>{owner?.firstName ?? 'Home'} | Odin</title>
      </Helmet>
      {renderBody()}
    </>
  );
};

export default Home;
