import type { ReactNode } from 'react';
import type { CardData } from '../../useCardData';
import { CardLabel } from '../../parts/Type';
import { AudienceChip } from '../../parts/AudienceChip';

export const hairline = 'border-[color:var(--card-surface)]';

// CardLabel renders a <p>; the wrapper gives it heading semantics without invalid nesting
export const SectionLabel = ({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) => (
  <div role="heading" aria-level={2} id={id} className={className}>
    <CardLabel>{children}</CardLabel>
  </div>
);

// The headline doubles as the location line ("HOMEBASE / AARHUS")
export const LocationLine = ({ data, className }: { data: CardData; className?: string }) => (
  <CardLabel className={className}>
    Homebase{data.headline ? ` / ${data.headline}` : null}
  </CardLabel>
);

// File metadata in the label face and its grey; the accent stays with the ELSEWHERE rows, which are
// links. `stamp` rules it off where it has no header line to sit on
export const DossierAudience = ({
  data,
  stamp,
  lines,
  className,
}: {
  data: CardData;
  stamp?: boolean;
  lines?: string;
  className?: string;
}) => (
  <AudienceChip
    audience={data.audience}
    className={`font-[family-name:var(--card-label)] uppercase leading-4 text-[color:var(--card-muted)] ${
      stamp
        ? 'gap-2 border border-[color:color-mix(in_srgb,var(--card-muted)_60%,transparent)] px-2 py-[3px]'
        : ''
    } ${className ?? ''}`}
    hug
    glyphClassName="h-4 w-[1.1em]"
    textClassName={`-me-[0.16em] tracking-[0.16em] ${
      stamp ? '!block truncate ![overflow-wrap:normal]' : (lines ?? '')
    }`}
    joinedClassName="text-[1.05em]"
  />
);
