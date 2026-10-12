import type { LayoutProps } from '../../CardDesign';
import { LinksProfile } from './LinksParts';

export const LinksCard = ({ design, data }: LayoutProps) => (
  <div className="relative flex min-h-[inherit] flex-col items-center px-5 pb-10 pt-9">
    <LinksProfile design={design} data={data} size="card" />
  </div>
);
