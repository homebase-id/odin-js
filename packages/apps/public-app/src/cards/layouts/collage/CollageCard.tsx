import { t } from '@homebase-id/common-app';
import { ChatBubble } from '@homebase-id/common-app/icons';
import type { LayoutProps } from '../../CardDesign';
import { CardGround } from '../../parts/Ground';
import { CardName } from '../../parts/Type';
import { CardBlocks, useChatHref } from '../../parts/Blocks';
import { CardSocials } from '../../parts/Socials';
import { CARD_FOCUS as FOCUS } from '../../CardDesign';
import { collageFrames, Cutout, firstNameOnly, Print } from './frames';

// Round chat button: CardBlock's button always prints its label, which does not fit beside the wordmark
const ChatButton = ({ odinId }: { odinId: string }) => {
  const href = useChatHref(odinId);
  if (!href) return null;
  return (
    <a
      href={href}
      aria-label={t('Chat with me')}
      className={`ml-auto flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-full bg-[var(--card-ink)] text-[color:var(--card-ground)] shadow-[0_2px_6px_rgba(0,0,0,0.28)] ${FOCUS}`}
    >
      <ChatBubble className="h-5 w-5" />
      <span className="text-[10px] font-semibold leading-none">{t('Chat')}</span>
    </a>
  );
};

export const CollageCard = ({ design, data }: LayoutProps) => {
  const [print, cutout] = collageFrames({ design, data });
  const hasChat = design.blocks.some((b) => b.kind === 'chat');

  return (
    <div className="relative flex min-h-[inherit] flex-col px-5 pb-5 pt-7">
      <CardGround design={design} data={data} />

      {print || cutout ? (
        <div className="flex items-start">
          {print ? (
            <Print
              {...print}
              className="ml-[1%] w-[49%] p-2 pb-8"
              tapeClassName="-top-2.5 left-1/2 h-5 w-[38%] -translate-x-1/2 -rotate-3"
            />
          ) : null}
          {cutout ? (
            <Cutout
              {...cutout}
              ring={4}
              className={`ml-auto mr-[1%] w-[38%] ${print ? 'mt-[18%]' : ''}`}
            />
          ) : null}
        </div>
      ) : null}

      <div className={`relative z-10 pl-2 ${print || cutout ? '-mt-11' : 'mt-6'}`}>
        <CardName
          design={design}
          data={firstNameOnly(data)}
          className="text-[56px] font-bold leading-[0.86] [overflow-wrap:anywhere]"
        />
        {data.headline ? (
          <p className="mt-2 pl-1 font-[family-name:var(--card-label)] text-[22px] font-medium leading-6 text-[color:var(--card-muted)]">
            {data.headline}
          </p>
        ) : null}
      </div>

      <CardBlocks
        design={design}
        data={data}
        kinds={['links', 'moments']}
        className="mt-7 !gap-2.5 [&>a:nth-child(even)]:rotate-[0.75deg] [&>a:nth-child(odd)]:rotate-[-0.75deg] [&>a]:shadow-[0_3px_10px_-4px_rgba(0,0,0,0.3)]"
      />

      <div className="mt-auto flex items-center gap-2.5 pt-6">
        <CardSocials variant={design.socials} data={data} className="min-w-0 flex-1" />
        {hasChat ? <ChatButton odinId={data.odinId} /> : null}
      </div>
    </div>
  );
};
