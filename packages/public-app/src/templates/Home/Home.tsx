import { Helmet } from 'react-helmet-async';
import { HomePageTheme } from '@youfoundation/js-lib/public';
import HomeClassic from './Classic/HomeClassic';
import HomeContent from './Content/HomeContent';
import HomeCover from './Cover/HomeCover';
import {
  ThemeCoverSettings,
  ThemeLinksSettings,
  ThemeWithTabsSettings,
  useSiteData,
} from '@youfoundation/common-app';
import HomeLinks from './Links/HomeLinks';
import { useMemo } from 'react';

const Home = ({ tab }: { tab?: string }) => {
  const { home, owner } = useSiteData().data ?? {};

  if (!home) return null;

  const body = useMemo(() => {
    const themeId = home?.templateSettings?.themeId;
    if (themeId === HomePageTheme.VerticalPosts.toString()) {
      return (
        <HomeClassic templateSettings={home.templateSettings as ThemeWithTabsSettings} tab={tab} />
      );
    } else if (themeId === HomePageTheme.HorizontalPosts.toString()) {
      return (
        <HomeContent templateSettings={home.templateSettings as ThemeWithTabsSettings} tab={tab} />
      );
    } else if (themeId === HomePageTheme.Links.toString()) {
      return <HomeLinks templateSettings={home.templateSettings as ThemeLinksSettings} />;
    } else {
      return <HomeCover templateSettings={home.templateSettings as ThemeCoverSettings} />;
    }
  }, [home, tab]);

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
