import { t } from '@homebase-id/common-app';
import type { LayoutProps } from '../../CardDesign';
import { LinksIdentity, LinksList, hasLinks, linksVars } from './LinksParts';
import { LinksPosts } from './LinksPage';

// With no links, the posts themselves fill the card instead of one lone tile pointing at them
export const LinksCard = ({ design, data }: LayoutProps) => {
  const postsInstead = !hasLinks(data) && data.posts.length > 0;
  return (
    <div
      style={linksVars(design)}
      className="relative flex min-h-[inherit] flex-col gap-6 overflow-hidden px-5 pb-10 pt-12"
    >
      <LinksIdentity design={design} data={data} size="card" />
      <LinksList design={design} data={data} skipMoments={postsInstead} emptyNote={!postsInstead} />
      {postsInstead ? (
        <LinksPosts data={data} heading={t('Moments')} limit={3} className="mt-2" />
      ) : null}
    </div>
  );
};
