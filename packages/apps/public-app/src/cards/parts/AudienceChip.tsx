import { t } from '@homebase-id/common-app';
import { Eye, Persons } from '@homebase-id/common-app/icons';
import type { CardAudience } from '../useCardData';

// Scripts that join their letters or hang them from a headline: tracking pulls them apart, and
// they have no capitals. They also sit lower in the em than Latin capitals, so each design sizes them up
const JOINED =
  /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Nko}\p{Script=Mongolian}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}]/u;
const JOINED_TEXT = '!me-0 !normal-case !tracking-normal';

const LINES = {
  1: 'truncate',
  2: 'line-clamp-2 [overflow-wrap:anywhere]',
  3: 'line-clamp-3 [overflow-wrap:anywhere]',
};

// Who the card is for. Each layout places it in its own flow, gives it its own shape and caps its width
export const AudienceChip = ({
  audience,
  className,
  glyphClassName,
  textClassName,
  joinedClassName,
  lines = 1,
}: {
  audience?: CardAudience;
  className: string;
  // With more than one line the layout makes this one line tall, so the glyph stays on the first
  glyphClassName: string;
  textClassName?: string;
  joinedClassName?: string;
  lines?: keyof typeof LINES;
}) => {
  if (!audience) return null;
  const isPublic = audience.kind === 'public';
  const text = isPublic ? t('Public') : audience.label?.trim();
  if (!text) return null;
  // Not the globe: the link rows under the label already use it
  const Glyph = isPublic ? Eye : Persons;
  // Also the way to the whole name once it is cut
  const shownTo = t('Shown to: {0}', text);
  return (
    // The glyph says what the word is about; alone, "Friends" reads as a tag on the person
    <span
      role="img"
      aria-label={shownTo}
      title={shownTo}
      data-audience={audience.kind}
      className={`flex w-fit min-w-0 ${lines === 1 ? 'items-center' : 'items-start'} ${className}`}
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
        className={`min-w-0 ${LINES[lines]} ${textClassName ?? ''} ${
          JOINED.test(text) ? `${JOINED_TEXT} ${joinedClassName ?? ''}` : ''
        }`}
      >
        {text}
      </span>
    </span>
  );
};
