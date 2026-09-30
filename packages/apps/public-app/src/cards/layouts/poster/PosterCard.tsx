import type { LayoutProps } from '../../CardDesign';
import { CardGround } from '../../parts/Ground';
import { CardLabel, CardName } from '../../parts/Type';
import { CardBlocks } from '../../parts/Blocks';
import { CardSocials } from '../../parts/Socials';
import { PosterAudience } from './PosterAudience';

// The reference card is 260px wide; this is it at ~1.3x, the scale the dossier card uses.
// Bare rows touch: a hairline above each and under the last, 19px labels, 49px tall
const ROWS = '!gap-0 [&>a]:py-2.5 [&>a]:text-[19px] [&>a]:leading-7 [&>a:last-child]:border-b';

// CardGround's scrim is tied to the card height; this one follows the content,
// so a long list of links never lifts the name onto bare photo
const CONTENT_SCRIM =
  'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--card-ground) 55%, transparent) 80px)';

export const PosterCard = ({ design, data }: LayoutProps) => (
  <div className="relative flex min-h-[inherit] flex-col justify-end px-6 pb-6 pt-[45%]">
    <CardGround design={design} data={data} />
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -bottom-6 -top-20 -z-10"
        style={{ background: CONTENT_SCRIM }}
      />
      <CardName
        design={design}
        data={data}
        className="text-[50px] font-light leading-none tracking-[-0.02em]"
      />
      {data.headline ? <CardLabel className="pt-3">{data.headline}</CardLabel> : null}
      <CardBlocks design={design} data={data} className={`mt-5 ${ROWS}`} />
      {/* The colophon line: on the ground, below the photo, whatever the photo is */}
      <div className="mt-5 flex items-center gap-5 empty:hidden">
        <CardSocials
          variant={design.socials}
          data={data}
          className="min-w-0 flex-1 !gap-4 [&_svg]:h-[18px] [&_svg]:w-[18px]"
        />
        <PosterAudience audience={data.audience} className="ms-auto max-w-[55%]" />
      </div>
    </div>
  </div>
);
