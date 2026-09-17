import { CARD_FOCUS, type SocialsVariant } from '../CardDesign';
import type { CardData } from '../useCardData';

const hostName = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '').split('.')[0];
  } catch {
    return '';
  }
};

export const CardSocials = ({
  variant,
  data,
  className,
}: {
  variant: SocialsVariant;
  data: CardData;
  className?: string;
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
    const [first] = socials;
    const Icon = first.icon;
    return (
      <a
        href={first.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 rounded-2xl bg-[var(--card-surface)] px-4 py-3 text-[color:var(--card-surface-ink)] shadow-[0_6px_16px_-10px_rgba(0,0,0,0.4)] ${CARD_FOCUS} ${className ?? ''}`}
      >
        <Icon className="h-7 w-7 text-[color:var(--card-accent)]" />
        <span className="leading-tight">
          <span className="block font-semibold capitalize">{hostName(first.link)}</span>
          {typeof first.children === 'string' ? (
            <span className="block text-sm text-[color:var(--card-muted)]">@{first.children}</span>
          ) : null}
        </span>
      </a>
    );
  }

  return (
    <ul
      className={`flex flex-wrap items-center ${variant === 'bar' ? 'justify-center gap-5' : 'gap-3'} ${className ?? ''}`}
    >
      {socials.map((s) => {
        const Icon = s.icon;
        return (
          <li key={s.link}>
            <a
              href={s.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={hostName(s.link) || s.link}
              className={`-m-1.5 block p-1.5 opacity-80 hover:opacity-100 ${CARD_FOCUS}`}
            >
              <Icon className={variant === 'bar' ? 'h-6 w-6' : 'h-4 w-4'} />
            </a>
          </li>
        );
      })}
    </ul>
  );
};
