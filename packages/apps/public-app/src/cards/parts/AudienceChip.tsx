import { t } from '@homebase-id/common-app';
import { EyeOutline, Persons } from '@homebase-id/common-app/icons';
import type { CardAudience } from '../useCardData';

// Scripts that join their letters or hang them from a headline: tracking pulls them apart, and
// they have no capitals. They also sit lower in the em than Latin capitals, so each design sizes them up
const JOINED =
  /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Nko}\p{Script=Mongolian}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}]/u;
const JOINED_TEXT = '!me-0 !font-normal !normal-case !tracking-normal';

// Who the card is for. Each layout places it in its own flow, gives it its own shape and caps its
// width; in all of them a long name runs to a second line and is cut there
export const AudienceChip = ({
  audience,
  className,
  glyphClassName,
  textClassName,
  joinedClassName,
}: {
  audience?: CardAudience;
  className: string;
  // One line tall, so the glyph stays on the first line
  glyphClassName: string;
  textClassName?: string;
  joinedClassName?: string;
}) => {
  if (!audience) return null;
  const isPublic = audience.kind === 'public';
  const text = isPublic ? t('Public') : audience.label?.trim();
  if (!text) return null;
  // Not the globe: the link rows under the label already use it
  const Glyph = isPublic ? EyeOutline : Persons;
  // Also the way to the whole name once it is cut
  const shownTo = t('Shown to: {0}', text);
  return (
    // The glyph says what the word is about; alone, "Friends" reads as a tag on the person
    <span
      role="img"
      aria-label={shownTo}
      title={shownTo}
      data-audience={audience.kind}
      className={`flex w-fit min-w-0 items-start ${className}`}
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
        className={`line-clamp-2 min-w-0 [overflow-wrap:anywhere] [text-wrap:pretty] ${textClassName ?? ''} ${
          JOINED.test(text) ? `${JOINED_TEXT} ${joinedClassName ?? ''}` : ''
        }`}
      >
        {text}
      </span>
    </span>
  );
};
