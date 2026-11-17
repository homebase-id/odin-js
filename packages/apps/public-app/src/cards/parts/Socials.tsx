import { CARD_FOCUS, type SocialsVariant } from '../CardDesign';
import type { CardData } from '../useCardData';

const hostName = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '').split('.')[0];
  } catch {
    return '';
  }
};

const GlyphList = ({
  variant,
  socials,
  className,
}: {
  variant: SocialsVariant;
  socials: CardData['socials'];
  className?: string;
}) => (
  <ul
    data-socials={variant}
    className={`flex items-center ${
      variant === 'bar'
        ? 'w-fit flex-wrap gap-1 rounded-[1.25rem] bg-[color:color-mix(in_srgb,var(--card-accent)_14%,transparent)] p-1 text-[color:var(--card-accent)]'
        : 'flex-wrap gap-3'
    } ${className ?? ''}`}
  >
    {socials.map((s) => {
      const Icon = s.icon;
      return (
        <li key={s.link}>
          <a
            href={s.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.type || hostName(s.link) || s.link}
            className={
              variant === 'bar'
                ? `flex h-9 w-9 items-center justify-center rounded-full hover:bg-[color:color-mix(in_srgb,var(--card-accent)_18%,transparent)] ${CARD_FOCUS}`
                : `-m-1.5 block p-1.5 opacity-80 hover:opacity-100 ${CARD_FOCUS}`
            }
          >
            <Icon className={variant === 'bar' ? 'h-5 w-5' : 'h-4 w-4'} />
          </a>
        </li>
      );
    })}
  </ul>
);

export const CardSocials = ({
  variant,
  data,
  className,
  boxOnly,
}: {
  variant: SocialsVariant;
  data: CardData;
  className?: string;
  // wordmark: draw the box only; the caller lays out the rest
  boxOnly?: boolean;
}) => {
  const { socials } = data;
  if (!socials.length) return null;

  if (variant === 'handles') {
    const handles = socials
      .map((s) => (typeof s.children === 'string' ? `@${s.children}` : null))
      .filter(Boolean)
      .join(' · ');
    return handles ? (
      <p className={`text-xs text-[color:var(--card-muted)] ${className ?? ''}`}>{handles}</p>
    ) : null;
  }

  if (variant === 'wordmark') {
    const tile = (s: CardData['socials'][number], large: boolean, cls?: string) => {
      const Icon = s.icon;
      return (
        <a
          href={s.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center rounded-2xl bg-[var(--card-surface)] text-[color:var(--card-surface-ink)] shadow-[0_6px_16px_-10px_rgba(0,0,0,0.4)] ${CARD_FOCUS} ${
            large ? 'gap-3 px-4 py-3' : 'gap-2 px-3 py-2 text-sm'
          } ${cls ?? ''}`}
        >
          <Icon className={`text-[color:var(--card-accent)] ${large ? 'h-7 w-7' : 'h-5 w-5'}`} />
          <span className="leading-tight">
            <span className="block font-semibold capitalize">{hostName(s.link)}</span>
            {large && typeof s.children === 'string' ? (
              <span className="block text-sm text-[color:var(--card-muted)]">@{s.children}</span>
            ) : null}
          </span>
        </a>
      );
    };
    // The caller draws the first account's large box itself (collage page)
    if (boxOnly) return tile(socials[0], true, className);
    // A wrapping row of compact tiles, so every network stays inside a fixed-height card
    return (
      <ul
        data-socials="wordmark"
        className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}
      >
        {socials.map((s) => (
          <li key={s.link}>{tile(s, false)}</li>
        ))}
      </ul>
    );
  }

  return <GlyphList variant={variant} socials={socials} className={className} />;
};
