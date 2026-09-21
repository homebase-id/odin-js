import { useId, type CSSProperties, type ReactNode } from 'react';
import { t } from '@homebase-id/common-app';
import { CARD_FOCUS, type LayoutProps } from '../../CardDesign';
import type { CardData } from '../../useCardData';
import { useChatHref } from '../../parts/Blocks';
import { CardLabel } from '../../parts/Type';

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

// The reference's body grey (#C7CEDA) sits between ink and muted
const CONTACT_STYLE = {
  '--dossier-body': 'color-mix(in srgb, var(--card-ink) 65%, var(--card-muted))',
} as CSSProperties;

// The card is the page's contact list at phone size (reference: 8px terms, 10px values at 260px)
const CONTACT_SIZES = {
  card: { row: 'gap-3 py-[11px]', term: 'w-[60px] text-[10px]', value: 'text-[13px]' },
  page: { row: 'gap-5 py-[15px]', term: 'w-20 text-[11px]', value: 'text-[15px]' },
};

type ContactSize = keyof typeof CONTACT_SIZES;

const ContactRow = ({
  term,
  size,
  children,
}: {
  term: string;
  size: ContactSize;
  children: ReactNode;
}) => (
  <div className={`flex items-center border-t ${hairline} ${CONTACT_SIZES[size].row}`}>
    <dt
      className={`flex-shrink-0 uppercase tracking-[0.12em] text-[color:var(--card-muted)] ${CONTACT_SIZES[size].term}`}
    >
      {term}
    </dt>
    <dd
      className={`min-w-0 flex-1 break-words text-[color:var(--dossier-body)] ${CONTACT_SIZES[size].value}`}
    >
      {children}
    </dd>
  </div>
);

// CHAT as a term/value row; the whole section drops out when it doesn't apply
export const DossierContact = ({
  design,
  data,
  size,
  className,
}: LayoutProps & { size: ContactSize; className?: string }) => {
  const id = useId();
  const chatHref = useChatHref(data.odinId);
  const showChat = !!chatHref && design.blocks.some((block) => block.kind === 'chat');
  if (!showChat) return null;

  return (
    <section aria-labelledby={id} style={CONTACT_STYLE} className={className}>
      <SectionLabel id={id} className="pb-3">
        {t('Contact')}
      </SectionLabel>
      <dl className={`border-b ${hairline}`}>
        <ContactRow term={t('Chat')} size={size}>
          <a
            href={chatHref}
            className={`text-[color:var(--card-accent)] underline-offset-4 hover:underline ${CARD_FOCUS}`}
          >
            {t('open a chat')} <span aria-hidden>&#8594;</span>
          </a>
        </ContactRow>
      </dl>
    </section>
  );
};
