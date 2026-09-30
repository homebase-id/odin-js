import type { CardData } from '../../useCardData';
import { AudienceChip } from '../../parts/AudienceChip';
import { CardLabel } from '../../parts/Type';

// The reference sets the caption a step larger and wider on the page than on the card
const SIZES = {
  card: {
    row: 'pt-3 text-[11px]',
    label: '',
    text: '-me-[0.2em] tracking-[0.2em]',
  },
  page: {
    row: 'text-[12px] min-[1280px]:text-[13px]',
    label: '!tracking-[0.24em]',
    text: '-me-[0.24em] tracking-[0.24em]',
  },
};

// One caption in the label face: GARDENER, HOBBITON · FRIENDS. Each item carries its dot in its
// leading pad and the row is pulled back by that pad, so whichever item starts a line (the label,
// once it wraps) has its dot clipped away. The label is a step brighter than the role it follows
export const PosterCaption = ({
  data,
  size,
  className,
}: {
  data: CardData;
  size: keyof typeof SIZES;
  className?: string;
}) => {
  const sizes = SIZES[size];
  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <div className={`-ms-[2.4em] flex flex-wrap items-start gap-y-0.5 empty:hidden ${sizes.row}`}>
        {data.headline ? (
          <CardLabel className={`ps-[2.4em] !text-[length:inherit] ${sizes.label}`}>
            {data.headline}
          </CardLabel>
        ) : null}
        {/* The negative margin takes back the tracking after the last letter. The glyph box is one
            line of the label face tall (1.48em), and its stroke is in a 24-unit box: 2.6 draws ~1.5px */}
        <AudienceChip
          audience={data.audience}
          lines={2}
          className={`relative max-w-full gap-[0.7em] ps-[2.4em] font-[family-name:var(--card-label)] uppercase text-[color:color-mix(in_srgb,var(--card-ink)_88%,transparent)] before:absolute before:start-0 before:w-[2.4em] before:-translate-x-[0.12em] before:text-center before:text-[color:var(--card-muted)] before:content-['·'] rtl:before:translate-x-[0.12em]`}
          glyphClassName="h-[1.48em] w-[1.2em] [&_svg]:stroke-[2.6]"
          textClassName={sizes.text}
          joinedClassName="text-[1.2em] leading-[1.234]"
        />
      </div>
    </div>
  );
};
