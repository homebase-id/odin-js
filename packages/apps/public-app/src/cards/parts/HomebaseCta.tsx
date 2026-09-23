import { t } from '@homebase-id/common-app';
import { Download } from '@homebase-id/common-app/icons';
import { CARD_FOCUS, cardVars, type CardDesign } from '../CardDesign';

// Verified against owner-app's Dashboard.tsx, which links the same app from the owner console
export const HOMEBASE_IOS_APP_ID = '6468971238';

const SIGN_UP_URL = 'https://homebase.id/sign-up';
const APP_STORE_URL = `https://apps.apple.com/us/app/homebase-secure-feed/id${HOMEBASE_IOS_APP_ID}`;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=id.homebase.feed';

const STORE_LINK = `flex items-center gap-1.5 text-[13px] text-[color:var(--card-muted)] hover:text-[color:var(--card-ink)] ${CARD_FOCUS}`;

// ink/ground contrast is the one pair every design guarantees (unlike surface/accent,
// which some layouts leave low-contrast because they never render a "boxed" block) —
// so a ghost button on that pair is the only style that is safe across all four presets
const SIGNUP_LINK = `mt-3 inline-block rounded-full border border-[color:color-mix(in_srgb,var(--card-ink)_35%,transparent)] px-5 py-2 text-[13px] font-semibold text-[color:var(--card-ink)] hover:bg-[color:color-mix(in_srgb,var(--card-ink)_10%,transparent)] ${CARD_FOCUS}`;

// Sits below the card, never over it; owners viewing their own card never see it (CardEmbed hides it)
export const HomebaseCta = ({ design }: { design: CardDesign }) => (
  <aside
    style={cardVars(design)}
    className="border-t border-[color:color-mix(in_srgb,var(--card-ink)_12%,transparent)] px-6 py-8 text-center"
  >
    <p className="text-[13px] text-[color:var(--card-muted)]">
      {t('Like this card? Make your own on Homebase.')}
    </p>
    <a href={SIGN_UP_URL} target="_blank" rel="noopener noreferrer" className={SIGNUP_LINK}>
      {t('Get your own Homebase card')}
    </a>
    <div className="mt-4 flex items-center justify-center gap-5">
      <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={STORE_LINK}>
        <Download className="h-3.5 w-3.5" />
        {t('App Store')}
      </a>
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={STORE_LINK}>
        <Download className="h-3.5 w-3.5" />
        {t('Google Play')}
      </a>
    </div>
  </aside>
);
