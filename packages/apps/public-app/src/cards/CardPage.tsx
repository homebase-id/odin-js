import type { FC } from 'react';
import './fonts.css';
import { cardVars, type LayoutId, type LayoutProps } from './CardDesign';
import { PosterPage } from './layouts/poster/PosterPage';
import { BoardPage } from './layouts/board/BoardPage';
import { CollagePage } from './layouts/collage/CollagePage';
import { DossierPage } from './layouts/dossier/DossierPage';

const PAGES: Record<LayoutId, FC<LayoutProps>> = {
  poster: PosterPage,
  board: BoardPage,
  collage: CollagePage,
  dossier: DossierPage,
};

export const CardPage = ({ design, data }: LayoutProps) => {
  const Layout = PAGES[design.layout];
  return (
    <div style={cardVars(design)} className="relative isolate min-h-screen overflow-hidden">
      <Layout design={design} data={data} />
    </div>
  );
};
