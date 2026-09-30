import { t } from '@homebase-id/common-app';
import type { CardAudience } from '../useCardData';

// Letter-spacing pulls a joined script apart
const JOINED = /\p{Script=Arabic}|\p{Script=Syriac}|\p{Script=Nko}|\p{Script=Mongolian}/u;

// Who the card is for. Each layout places it in its own flow, gives it its own shape and caps its width
export const AudienceChip = ({
  audience,
  className,
}: {
  audience?: CardAudience;
  className: string;
}) => {
  if (!audience) return null;
  const text = audience.kind === 'public' ? t('Public') : audience.label?.trim();
  if (!text) return null;
  return (
    // dir: a circle name in another script keeps its own direction and truncates at its own end
    <span
      dir="auto"
      title={text}
      className={`block w-fit truncate ${className} ${JOINED.test(text) ? '!tracking-normal' : ''}`}
    >
      {text}
    </span>
  );
};
