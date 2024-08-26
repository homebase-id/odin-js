import { Helmet } from 'react-helmet-async';
import { HomePageTheme } from '@homebase-id/js-lib/public';
import HomeClassic from './Classic/HomeClassic';
import HomeContent from './Content/HomeContent';
import HomeCover from './Cover/HomeCover';
import { ThemeCoverSettings, useSiteData } from '@homebase-id/common-app';
import HomeLinks from './Links/HomeLinks';
import { useMemo } from 'react';

const Home = () => {
  const { home, owner } = useSiteData().data ?? {};

  const body = useMemo(() => {
    const themeId = home?.templateSettings?.themeId;
    if (themeId === HomePageTheme.VerticalPosts.toString()) {
      return <HomeClassic />;
    } else if (themeId === HomePageTheme.HorizontalPosts.toString()) {
      return <HomeContent />;
    } else if (themeId === HomePageTheme.Links.toString()) {
      return <HomeLinks />;
    } else {
      return <HomeCover templateSettings={home?.templateSettings as ThemeCoverSettings} />;
    }
  }, [home]);

  if (!home) return null;

  return (
    <>
      <Helmet>
        <title>{owner?.firstName ?? 'Home'} | Homebase</title>
      </Helmet>
      {body}
    </>
  );
};

export default Home;
