import { useSearchParams } from 'react-router-dom';
import { useSiteData } from '@homebase-id/common-app';
import { CARD_PRESETS, cardPresetForTheme, presetFromParam } from './presets';
import { useCardData } from './useCardData';
import { HomebaseCard } from './HomebaseCard';

// Bare card for chat-kmp's WebView: no header, no footer
const CardEmbed = () => {
  const [params] = useSearchParams();
  const { data: siteData } = useSiteData();
  const data = useCardData();
  if (!data || !siteData) return null;

  const layout =
    presetFromParam(params.get('design')) ??
    cardPresetForTheme(siteData.home?.templateSettings?.themeId) ??
    'board';
  return <HomebaseCard design={CARD_PRESETS[layout]} data={data} className="min-h-dvh" />;
};

export default CardEmbed;
