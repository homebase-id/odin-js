import { useSearchParams } from 'react-router-dom';
import { useSiteData } from '@homebase-id/common-app';
import { CARD_PRESETS, presetFromParam } from './presets';
import { useCardData } from './useCardData';
import { HomebaseCard } from './HomebaseCard';

// Bare card for chat-kmp's WebView: no header, no footer
const CardEmbed = () => {
  const [params] = useSearchParams();
  const { data: siteData } = useSiteData();
  const data = useCardData();
  if (!data || !siteData) return null;

  const themeId = siteData.home?.templateSettings?.themeId;
  // "Disable public site" - the phone embed has nothing to show either
  if (!themeId || themeId === '0') return null;

  const layout = presetFromParam(params.get('design')) ?? 'board';
  return (
    <main className="min-h-dvh">
      <HomebaseCard design={CARD_PRESETS[layout]} data={data} className="min-h-dvh" />
    </main>
  );
};

export default CardEmbed;
