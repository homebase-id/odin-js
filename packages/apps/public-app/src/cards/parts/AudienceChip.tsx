import { t } from '@homebase-id/common-app';
import { Globe, Persons } from '@homebase-id/common-app/icons';
import type { CardAudience } from '../useCardData';

// The label faces carry no glyphs for a joined script: its fallback face is stretched and thin,
// and letter-spacing pulls the joins apart
const JOINED = /\p{Script=Arabic}|\p{Script=Syriac}|\p{Script=Nko}|\p{Script=Mongolian}/u;
const JOINED_TEXT = '!me-0 !font-sans !font-medium !normal-case !tracking-normal';

// Who the card is for. Each layout places it in its own flow, gives it its own shape and caps its width
export const AudienceChip = ({
  audience,
  className,
  glyphClassName,
  textClassName,
}: {
  audience?: CardAudience;
  className: string;
  glyphClassName: string;
  textClassName?: string;
}) => {
  if (!audience) return null;
  const isPublic = audience.kind === 'public';
  const text = isPublic ? t('Public') : audience.label?.trim();
  if (!text) return null;
  const Glyph = isPublic ? Globe : Persons;
  const shownTo = t('Shown to: {0}', text);
  return (
    // The glyph says what the word is about; alone, "Friends" reads as a tag on the person
    <span
      role="img"
      aria-label={shownTo}
      title={shownTo}
      data-audience={audience.kind}
      className={`flex w-fit min-w-0 items-center ${className}`}
    >
      <span
        aria-hidden
        className={`flex flex-shrink-0 items-center justify-center ${glyphClassName}`}
      >
        <Glyph className="h-full w-full" />
      </span>
      {/* dir: a circle name in another script keeps its own direction and truncates at its own end */}
      <span
        dir="auto"
        className={`min-w-0 truncate ${textClassName ?? ''} ${JOINED.test(text) ? JOINED_TEXT : ''}`}
      >
        {text}
      </span>
    </span>
  );
};
