import type { ReactNode } from 'react';
import type { CardData } from '../../useCardData';
import { CardLabel } from '../../parts/Type';

// eslint-disable-next-line react-refresh/only-export-components
export const ownerName = ({ firstName, surName, displayName, odinId }: CardData) =>
  [firstName, surName].filter(Boolean).join(' ') || displayName || odinId;

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
