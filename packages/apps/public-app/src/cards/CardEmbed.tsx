import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useDotYouClientContext, useSiteData } from '@homebase-id/common-app';
import { useCardData } from './useCardData';
import { useProfileCard } from './useProfileCard';
import { HomebaseCard } from './HomebaseCard';
import { HOMEBASE_IOS_APP_ID, HomebaseCta } from './parts/HomebaseCta';
import { CardSignIn } from './parts/SignIn';
import { cardVars } from './CardDesign';
import { resolveEmbedDesign } from './resolveDesign';

// The standalone public page anyone opens directly (a shared link, an NFC tap): no
// host param, so this is never what chat-kmp's WebView or an iframe embed renders.
const CardEmbed = () => {
  const [params] = useSearchParams();
  const { data: siteData } = useSiteData();
  const data = useCardData();
  const { data: profileCard, isFetched: isProfileCardFetched } = useProfileCard();
  const isOwner = useDotYouClientContext().isOwner();
  if (!data || !siteData || !isProfileCardFetched) return null;

  const templateSettings = siteData.home?.templateSettings;
  const themeId = templateSettings?.themeId;
  // "Disable public site" - the phone embed has nothing to show either
  if (!themeId || themeId === '0') return null;

  const { design } = resolveEmbedDesign({
    param: params.get('design'),
    card: profileCard,
    themeDesign: templateSettings?.cardDesign,
  });

  return (
    <main className="min-h-dvh">
      <Helmet>
        <meta name="apple-itunes-app" content={`app-id=${HOMEBASE_IOS_APP_ID}`} />
      </Helmet>
      <HomebaseCard design={design} data={data} className="min-h-dvh" />
      {!isOwner ? (
        <aside
          style={cardVars(design)}
          className="border-t border-[color:color-mix(in_srgb,var(--card-ink)_12%,transparent)] px-4 py-4 text-center"
        >
          <CardSignIn className="rounded-full bg-[color:var(--card-ink)] px-6 py-2.5 text-sm font-semibold text-[color:var(--card-ground)] hover:bg-[color:color-mix(in_srgb,var(--card-ink)_85%,black)]" />
        </aside>
      ) : null}
      {!isOwner ? <HomebaseCta design={design} /> : null}
    </main>
  );
};

export default CardEmbed;
