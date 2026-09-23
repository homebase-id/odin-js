import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useDotYouClientContext, useSiteData } from '@homebase-id/common-app';
import { CARD_PRESETS, presetFromParam } from './presets';
import { useCardData } from './useCardData';
import { HomebaseCard } from './HomebaseCard';
import { HOMEBASE_IOS_APP_ID, HomebaseCta } from './parts/HomebaseCta';

// The standalone public page anyone opens directly (a shared link, an NFC tap): no
// host param, so this is never what chat-kmp's WebView or an iframe embed renders.
const CardEmbed = () => {
  const [params] = useSearchParams();
  const { data: siteData } = useSiteData();
  const data = useCardData();
  const isOwner = useDotYouClientContext().isOwner();
  if (!data || !siteData) return null;

  const templateSettings = siteData.home?.templateSettings;
  const themeId = templateSettings?.themeId;
  // "Disable public site" - the phone embed has nothing to show either
  if (!themeId || themeId === '0') return null;

  const layout =
    presetFromParam(params.get('design')) ??
    presetFromParam(templateSettings?.cardDesign) ??
    'board';
  const design = CARD_PRESETS[layout];
  return (
    <main className="min-h-dvh">
      <Helmet>
        <meta name="apple-itunes-app" content={`app-id=${HOMEBASE_IOS_APP_ID}`} />
      </Helmet>
      <HomebaseCard design={design} data={data} className="min-h-dvh" />
      {!isOwner ? <HomebaseCta design={design} /> : null}
    </main>
  );
};

export default CardEmbed;
