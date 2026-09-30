import { useLayoutEffect, useRef } from 'react';
import { t } from '@homebase-id/common-app';
import { EyeOutline, Persons } from '@homebase-id/common-app/icons';
import type { CardAudience } from '../useCardData';

// Scripts that join their letters or hang them from a headline: tracking pulls them apart, and
// they have no capitals. They also sit lower in the em than Latin capitals, so each design sizes them up
const JOINED =
  /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Nko}\p{Script=Mongolian}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}]/u;
const JOINED_TEXT = '!me-0 !font-normal !normal-case !tracking-normal';

// CSS sizes a wrapped box to the room it had, not to its longest line, which leaves a tag or a strip
// of tape half bare. A name that fits is first evened out over its lines; one that is cut keeps
// every line full, so no word is dropped that had room
const hugLines = (element: HTMLElement) => {
  element.style.width = '';
  element.style.textWrap = '';
  const style = getComputedStyle(element);
  const lineHeight = parseFloat(style.lineHeight);
  if (!lineHeight || element.clientHeight < lineHeight * 1.5) return;
  const cut = element.scrollHeight > element.clientHeight + 1;
  if (!cut) element.style.textWrap = 'balance';

  const range = document.createRange();
  range.selectNodeContents(element);
  const { bottom } = element.getBoundingClientRect();
  const lines = Array.from(range.getClientRects()).filter((line) => line.top < bottom - 1);
  if (!lines.length) return;
  const start = Math.min(...lines.map((line) => line.left));
  const end = Math.max(...lines.map((line) => line.right));
  const pads = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  // A cut line needs room for its ellipsis
  const ellipsis = cut ? parseFloat(style.fontSize) : 0;
  const height = element.clientHeight;
  element.style.width = `${Math.ceil(end - start + pads + ellipsis) + 1}px`;
  // Never at the cost of a line
  if (!cut && element.scrollHeight > height + 1) element.style.width = '';
};

// Who the card is for. Each layout places it in its own flow, gives it its own shape, caps its
// width and says how many lines a long name may run to before it is cut
export const AudienceChip = ({
  audience,
  className,
  glyphClassName,
  textClassName,
  joinedClassName,
  hug,
}: {
  audience?: CardAudience;
  // For a label that draws its own ground: the ground ends where the longest line does
  hug?: boolean;
  className: string;
  // One line tall, so the glyph stays on the first line
  glyphClassName: string;
  textClassName?: string;
  joinedClassName?: string;
}) => {
  const isPublic = audience?.kind === 'public';
  // A circle card that lost its name still says it is not the public one
  const text = isPublic ? t('Public') : audience?.label?.trim() || t('Connections');

  const label = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = label.current;
    if (!element || !hug) return;
    let live = true;
    const fit = () => live && hugLines(element);
    fit();
    document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => {
      live = false;
      window.removeEventListener('resize', fit);
    };
  }, [hug, audience?.kind, text, className, textClassName, joinedClassName]);

  if (!audience) return null;
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
        ref={label}
        dir="auto"
        className={`line-clamp-2 min-w-0 [overflow-wrap:anywhere] ${textClassName ?? ''} ${
          JOINED.test(text) ? `${JOINED_TEXT} ${joinedClassName ?? ''}` : ''
        }`}
      >
        {text}
      </span>
    </span>
  );
};
