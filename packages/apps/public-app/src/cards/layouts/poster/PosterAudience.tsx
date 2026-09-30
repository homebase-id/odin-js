import type { CardAudience } from '../../useCardData';
import { AudienceChip } from '../../parts/AudienceChip';

// A caption in the label face. The negative margin takes back the tracking after the last letter,
// so the line ends on the column edge. The glyph's stroke is in its 24-unit box: 2.6 draws ~1.5px
export const PosterAudience = ({
  audience,
  className,
  textClassName = '-me-[0.2em] tracking-[0.2em]',
}: {
  audience?: CardAudience;
  className?: string;
  textClassName?: string;
}) => (
  <AudienceChip
    audience={audience}
    className={`gap-[0.7em] font-[family-name:var(--card-label)] uppercase leading-5 text-[color:var(--card-muted)] ${className ?? ''}`}
    glyphClassName="h-[1.2em] w-[1.2em] [&_svg]:stroke-[2.6]"
    textClassName={textClassName}
    joinedClassName="!text-[13px] !font-normal"
  />
);
