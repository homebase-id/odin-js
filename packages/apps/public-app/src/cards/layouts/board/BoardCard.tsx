import type { LayoutProps } from '../../CardDesign';
import { CardGround } from '../../parts/Ground';
import { BoardProfile } from './BoardProfile';

export const BoardCard = ({ design, data }: LayoutProps) => (
  <div className="relative flex min-h-[inherit] flex-col items-center px-5 pb-10 pt-8">
    <CardGround design={design} data={data} />
    <BoardProfile design={design} data={data} size="card" />
  </div>
);
