import type { LayoutProps } from '../../CardDesign';
import { LINKS_VARS, LinksProfile } from './LinksParts';

export const LinksCard = ({ design, data }: LayoutProps) => (
  <div
    style={LINKS_VARS}
    className="relative flex min-h-[inherit] flex-col items-center px-5 pb-10 pt-10"
  >
    {/* A short stack sits in the middle of the card instead of leaving its foot bare */}
    <div className="my-auto w-full">
      <LinksProfile design={design} data={data} size="card" />
    </div>
  </div>
);
