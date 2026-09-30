import type { CardAudience } from '../../useCardData';
import { AudienceChip } from '../../parts/AudienceChip';

// An eyebrow in the label face, led by a short rule like the poster's hairlines
export const PosterAudience = ({
  audience,
  className,
}: {
  audience?: CardAudience;
  className?: string;
}) => (
  <AudienceChip
    audience={audience}
    className={`min-w-0 font-[family-name:var(--card-label)] text-[11px] uppercase leading-5 tracking-[0.2em] text-[color:var(--card-muted)] before:me-2.5 before:inline-block before:h-px before:w-5 before:bg-current before:align-middle before:content-[''] ${className ?? ''}`}
  />
);
