import type { LayoutProps } from '../../CardDesign';
import { ownerName } from '../../useCardData';
import { CardPortrait, portraitImage } from '../../parts/Portrait';
import { BreakAtDots, CardName } from '../../parts/Type';
import { CardBlocks } from '../../parts/Blocks';
import { CardSocials } from '../../parts/Socials';
import { AudienceChip } from '../../parts/AudienceChip';

// The board's centred column, drawn at two sizes: the phone card and the desktop page.
// `ring` scales the design's ring width with the portrait (4px on the card, 6px on the page).
// `nameGap` only applies below a portrait; without one the name sits at the top of the column.
const SIZES = {
  card: {
    portrait: 'h-[112px] w-[112px]',
    ring: 1,
    name: 'text-[24px]',
    nameGap: 'mt-4',
    host: 'mt-1 text-[13px]',
    audience: 'mt-2.5 text-[11px]',
    blocks: 'mt-[22px] !gap-[10px]',
    socials: 'mt-6',
  },
  page: {
    portrait: 'h-[140px] w-[140px]',
    ring: 1.5,
    name: 'text-[32px]',
    nameGap: 'mt-5',
    host: 'mt-1.5 text-[15px]',
    audience: 'mt-3 text-[12px]',
    // rows grow to the reference's 58px / 14px radius; the primitive draws 52px / 12px
    blocks: 'mt-7 !gap-3.5 [&>a]:min-h-[58px] [&>a]:rounded-[14px]',
    socials: 'mt-[26px]',
  },
} as const;

export const BoardProfile = ({
  design,
  data,
  size,
}: LayoutProps & { size: keyof typeof SIZES }) => {
  const sizes = SIZES[size];
  const [portrait] = design.portraits;
  const image = portrait ? portraitImage(portrait, data) : undefined;

  return (
    <>
      {portrait && image ? (
        <CardPortrait
          portrait={portrait.ring ? { ...portrait, ring: portrait.ring * sizes.ring } : portrait}
          image={image}
          alt={ownerName(data)}
          className={`flex-shrink-0 ${sizes.portrait}`}
        />
      ) : null}
      <CardName
        design={design}
        data={data}
        inline
        className={`max-w-full text-balance text-center font-semibold leading-tight ${
          sizes.name
        } ${portrait && image ? sizes.nameGap : ''}`}
      />
      {/* Without a name the heading already is the hostname */}
      {ownerName(data) !== data.odinId ? (
        <p className={`max-w-full text-center text-[color:var(--card-muted)] ${sizes.host}`}>
          <BreakAtDots text={data.odinId} />
        </p>
      ) : null}
      {/* A flat tag in the ground art's tint: no ledge and no icon tile, so it is not one more link row */}
      <AudienceChip
        audience={data.audience}
        className={`max-w-[min(100%,16.25rem)] flex-shrink-0 gap-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--card-ink)_12%,transparent)] px-2.5 py-0.5 font-medium leading-5 tracking-[0.02em] text-[color:var(--card-muted)] ${sizes.audience}`}
        glyphClassName="h-[1.15em] w-[1.15em]"
      />
      <CardBlocks design={design} data={data} className={`w-full text-[15px] ${sizes.blocks}`} />
      <CardSocials variant={design.socials} data={data} className={sizes.socials} />
    </>
  );
};
