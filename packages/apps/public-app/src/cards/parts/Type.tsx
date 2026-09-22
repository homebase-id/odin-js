import { Fragment, useLayoutEffect, useRef, type ReactNode } from 'react';
import type { LayoutProps } from '../CardDesign';

// A hostname wraps after a dot, never inside a label
export const BreakAtDots = ({ text }: { text: string }) => (
  <>
    {text.split('.').map((part, i, parts) => (
      <Fragment key={i}>
        {part}
        {i < parts.length - 1 ? (
          <>
            .<wbr />
          </>
        ) : null}
      </Fragment>
    ))}
  </>
);

// Measures again after each step: a WebView's text zoom also scales the px size set here
const fitWidestWord = (element: HTMLElement) => {
  element.style.fontSize = '';
  let size = parseFloat(getComputedStyle(element).fontSize);
  for (let i = 0; i < 3; i++) {
    element.style.width = 'min-content';
    element.style.maxWidth = 'none';
    const widest = element.offsetWidth;
    element.style.width = '';
    element.style.maxWidth = '';
    const room = element.clientWidth;
    if (!room || widest <= room) return;
    size *= room / widest;
    element.style.fontSize = `${size}px`;
  }
};

export const CardName = ({
  design,
  data,
  className,
  inline,
}: LayoutProps & { className?: string; inline?: boolean }) => {
  const first = data.firstName || data.displayName || data.odinId;
  const last = data.firstName ? data.surName : undefined;
  const { displayCase } = design.type;

  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const element = heading.current;
    if (!element) return;
    let live = true;
    const fit = () => live && fitWidestWord(element);
    fit();
    document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => {
      live = false;
      window.removeEventListener('resize', fit);
    };
  }, [first, last, className, inline, displayCase]);

  return (
    <h1
      ref={heading}
      className={`font-[family-name:var(--card-display)] ${displayCase === 'upper' ? 'uppercase' : ''} ${
        className ?? ''
      }`}
    >
      <span className={inline ? '' : 'block'}>
        <BreakAtDots text={first} />
      </span>
      {last ? (
        <>
          {inline ? ' ' : null}
          <span
            className={`${inline ? '' : 'block'} ${displayCase === 'italic-2nd-line' ? 'italic' : ''}`}
          >
            {last}
          </span>
        </>
      ) : null}
    </h1>
  );
};

export const CardLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p
    className={`font-[family-name:var(--card-label)] text-[11px] uppercase tracking-[0.2em] text-[color:var(--card-muted)] ${
      className ?? ''
    }`}
  >
    {children}
  </p>
);
