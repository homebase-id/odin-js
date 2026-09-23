import type { FC } from 'react';
import './fonts.css';
import { cardVars, type LayoutId, type LayoutProps } from './CardDesign';
import { PosterCard } from './layouts/poster/PosterCard';
import { BoardCard } from './layouts/board/BoardCard';
import { CollageCard } from './layouts/collage/CollageCard';
import { DossierCard } from './layouts/dossier/DossierCard';

const CARDS: Record<LayoutId, FC<LayoutProps>> = {
  poster: PosterCard,
  board: BoardCard,
  collage: CollageCard,
  dossier: DossierCard,
};

export const HomebaseCard = ({ design, data, className }: LayoutProps & { className?: string }) => {
  const Layout = CARDS[design.layout];
  return (
    <article
      style={cardVars(design)}
      className={`relative isolate overflow-hidden ${className ?? ''}`}
    >
      <Layout design={design} data={data} />
    </article>
  );
};
