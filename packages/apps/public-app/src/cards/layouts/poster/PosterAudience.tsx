import type { CardAudience } from '../../useCardData';
import { AudienceChip } from '../../parts/AudienceChip';

// An eyebrow in the label face. The negative margin takes back the tracking after the last letter,
// so the line ends on the column edge
export const PosterAudience = ({
  audience,
  className,
}: {
  audience?: CardAudience;
  className?: string;
}) => (
  <AudienceChip
    audience={audience}
    className={`gap-2.5 font-[family-name:var(--card-label)] uppercase leading-5 text-[color:var(--card-muted)] ${className ?? ''}`}
    glyphClassName="h-[1.1em] w-[1.1em] [&_svg]:stroke-[1.5]"
    textClassName="-me-[0.2em] tracking-[0.2em]"
  />
);
