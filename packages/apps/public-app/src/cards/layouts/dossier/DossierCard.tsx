import { useId } from 'react';
import { t } from '@homebase-id/common-app';
import type { BlockKind, LayoutProps } from '../../CardDesign';
import { CardBlocks, hasBlockContent, useChatHref } from '../../parts/Blocks';
import { CardPortrait, portraitImage } from '../../parts/Portrait';
import { CardSocials } from '../../parts/Socials';
import { CardName } from '../../parts/Type';
import { DossierContact, hairline, LocationLine, ownerName, SectionLabel } from './DossierParts';

// Reference: the fourth card in Anatomy.dc.html (262px wide), scaled ~1.3x for a 390px phone

export const DossierCard = ({ design, data }: LayoutProps) => {
  const elsewhereId = useId();
  const chatHref = useChatHref();

  const [portrait] = design.portraits;
  const hasBlock = (kind: BlockKind) => design.blocks.some((block) => block.kind === kind);
  // CardBlocks hides itself once it has no rows to show, but the section heading is ours to hide
  const showElsewhere =
    (hasBlock('links') && hasBlockContent('links', data, chatHref)) ||
    (hasBlock('moments') && hasBlockContent('moments', data, chatHref));

  return (
    <div className="flex min-h-[inherit] flex-col px-5 pb-5 pt-6 text-[13px]">
      <header className="flex items-start gap-4">
        {portrait ? (
          <CardPortrait
            portrait={portrait}
            image={portraitImage(portrait, data)}
            alt={ownerName(data)}
            className="h-20 w-20 flex-shrink-0"
          />
        ) : null}
        <div className="min-w-0 pt-0.5">
          <CardName
            design={design}
            data={data}
            className="break-words text-[22px] leading-[24px] tracking-[-0.03em] text-[color:var(--card-ink)]"
          />
          <LocationLine data={data} className="pt-2 !tracking-[0.14em]" />
        </div>
      </header>

      <DossierContact design={design} data={data} size="card" className="pt-7" />

      {showElsewhere ? (
        <section aria-labelledby={elsewhereId} className="pt-7">
          <SectionLabel id={elsewhereId} className="pb-1">
            {t('Elsewhere')}
          </SectionLabel>
          <CardBlocks
            design={design}
            data={data}
            kinds={['moments', 'links']}
            label={t('Elsewhere')}
            className="!gap-0 [&_a]:border-t-0 [&_a]:py-[9px]"
          />
        </section>
      ) : null}

      <div className="min-h-8 flex-1" />
      <CardSocials
        variant={design.socials}
        data={data}
        className={`border-t ${hairline} pt-3 tracking-[0.04em]`}
      />
    </div>
  );
};
