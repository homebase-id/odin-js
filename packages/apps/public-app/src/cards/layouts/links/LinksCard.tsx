import type { LayoutProps } from '../../CardDesign';
import { LINKS_VARS, LinksIdentity, LinksList } from './LinksParts';

export const LinksCard = ({ design, data }: LayoutProps) => (
  <div
    style={LINKS_VARS}
    className="relative flex min-h-[inherit] flex-col gap-8 overflow-hidden px-5 pb-10 pt-12"
  >
    <LinksIdentity design={design} data={data} size="card" />
    <LinksList design={design} data={data} />
  </div>
);
