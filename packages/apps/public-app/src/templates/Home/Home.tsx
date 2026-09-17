import { Helmet } from 'react-helmet-async';
import { HomePageTheme } from '@homebase-id/js-lib/public';
import HomeClassic from './Classic/HomeClassic';
import HomeContent from './Content/HomeContent';
import HomeCover from './Cover/HomeCover';
import { ThemeCoverSettings, useSiteData } from '@homebase-id/common-app';
import HomeLinks from './Links/HomeLinks';
import { lazy, useMemo } from 'react';
import Header from '../../components/ui/Layout/Header/Header';
import Footer from '../../components/ui/Layout/Footer/Footer';
import { cardPresetForTheme } from '../../cards/presets';

const CardHome = lazy(() => import('../../cards/CardHome'));

const Home = () => {
  const { home, owner } = useSiteData().data ?? {};
  const themeId = home?.templateSettings?.themeId;
  const cardLayout = cardPresetForTheme(themeId);

  const body = useMemo(() => {
    if (themeId === HomePageTheme.VerticalPosts.toString()) return <HomeClassic />;
    if (themeId === HomePageTheme.HorizontalPosts.toString()) return <HomeContent />;
    if (themeId === HomePageTheme.Links.toString()) return <HomeLinks />;
    return <HomeCover templateSettings={home?.templateSettings as ThemeCoverSettings} />;
  }, [home, themeId]);

  if (!home)
    return (
      <>
        <Header />
        <Footer className="mt-auto" />
      </>
    );

  return (
    <>
      <Helmet>
        <title>{owner?.firstName ?? 'Home'} | Homebase</title>
      </Helmet>
      {cardLayout ? (
        <CardHome layout={cardLayout} />
      ) : (
        <>
          <Header />
          {body}
          <Footer className="mt-auto" />
        </>
      )}
    </>
  );
};

export default Home;
