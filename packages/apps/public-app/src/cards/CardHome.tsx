import { CARD_PRESETS } from './presets';
import type { LayoutId } from './CardDesign';
import { useCardData } from './useCardData';
import { useMinWidth } from './useMinWidth';
import { HomebaseCard } from './HomebaseCard';
import { CardPage } from './CardPage';

const CardHome = ({ layout }: { layout: LayoutId }) => {
  const data = useCardData();
  const isDesktop = useMinWidth(768);
  if (!data) return null;

  const design = CARD_PRESETS[layout];
  return isDesktop ? (
    <CardPage design={design} data={data} />
  ) : (
    <HomebaseCard design={design} data={data} className="min-h-dvh" />
  );
};

export default CardHome;
