import { FC, ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  t,
  DialogWrapper,
  HomebaseApp,
  HomebaseFileSync,
  usePortal,
} from '@homebase-id/common-app';
import { IconProps, Phone } from '@homebase-id/common-app/icons';
import {
  APP_STORE_URL,
  FILE_SYNC_DESKTOP,
  GET_APPS_PATH,
  GOOGLE_PLAY_URL,
  HOMEBASE_DESKTOP,
  getAppPlatform,
} from './appDownloads';
import { DesktopDownload } from './DesktopDownload';
import appStoreBadge from './assets/app-store-badge.svg';
import googlePlayBadge from './assets/google-play-badge.png';
// Static QR codes of APP_STORE_URL and GOOGLE_PLAY_URL; regenerate them if either URL changes.
import appStoreQr from './assets/qr-app-store.svg';
import googlePlayQr from './assets/qr-google-play.svg';

// Apple's and Google's own badges. Google's PNG carries its own padding, so it is drawn taller to
// match Apple's visually.
const STORES = {
  ios: {
    label: 'App Store',
    href: APP_STORE_URL,
    badge: appStoreBadge,
    qr: appStoreQr,
    badgeClassName: 'h-10',
  },
  android: {
    label: 'Google Play',
    href: GOOGLE_PLAY_URL,
    badge: googlePlayBadge,
    qr: googlePlayQr,
    badgeClassName: 'h-[3.6rem] -my-[0.55rem] -mx-[0.6rem]',
  },
};

const StoreBadge = ({ store }: { store: keyof typeof STORES }) => (
  <a href={STORES[store].href} className="inline-flex">
    <img
      src={STORES[store].badge}
      alt={`${STORES[store].label}`}
      className={`${STORES[store].badgeClassName} w-auto`}
    />
  </a>
);

const StoreQr = ({ store }: { store: keyof typeof STORES }) => (
  <div className="flex flex-col items-center gap-3">
    <img
      src={STORES[store].qr}
      alt={`${t('QR code for')} ${STORES[store].label}`}
      className="h-40 w-40 rounded-md bg-white p-2 shadow-sm"
    />
    <StoreBadge store={store} />
  </div>
);

// The QR codes open in a dialog rather than in the card, so the card stays as short as File
// sync's beside it.
const PhoneQrDialog = ({ onClose }: { onClose: () => void }) => {
  const target = usePortal('modal-container');
  return createPortal(
    <DialogWrapper
      title={t('Get Homebase on your phone')}
      onClose={onClose}
      isSidePanel={false}
      size="normal"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-row flex-wrap justify-center gap-8">
          <StoreQr store="ios" />
          <StoreQr store="android" />
        </div>
        <p className="text-slate-400">{t("Point your phone's camera at a code.")}</p>
      </div>
    </DialogWrapper>,
    target
  );
};

// The small section under a card's download. Both cards have one, so they stand the same height
// side by side.
const CardSection = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
    {children}
  </div>
);

const SecondaryLink = ({ href, children }: { href: string; children: ReactNode }) =>
  href.startsWith('/') ? (
    <Link className="text-primary hover:underline" to={href}>
      {children}
    </Link>
  ) : (
    <a className="text-primary hover:underline" href={href}>
      {children}
    </a>
  );

export const HomebaseAppCard = () => {
  const platform = getAppPlatform();
  const [isQrOpen, setIsQrOpen] = useState(false);

  return (
    <AppCard
      icon={HomebaseApp}
      name={t('Homebase')}
      what={t('Chat, moments, friends and your vault, in one app.')}
      why={t(
        'Get a notification the moment someone messages you, and have your Homebase in your pocket, not just in a browser tab.'
      )}
    >
      {platform === 'desktop' ? (
        <div className="flex flex-col gap-4">
          <DesktopDownload app={HOMEBASE_DESKTOP} />
          <CardSection label={t('On your phone')}>
            <div className="flex flex-row flex-wrap items-center gap-3">
              <StoreBadge store="ios" />
              <StoreBadge store="android" />
            </div>
            <button
              className="flex flex-row items-center gap-2 self-start text-sm text-primary hover:underline"
              onClick={() => setIsQrOpen(true)}
            >
              <Phone className="h-4 w-4" />
              {t('Show QR codes to scan')}
            </button>
          </CardSection>
          {isQrOpen ? <PhoneQrDialog onClose={() => setIsQrOpen(false)} /> : null}
        </div>
      ) : (
        <>
          <StoreBadge store={platform} />
          <p className="text-sm text-slate-400">
            {t('Also for Mac, Windows and Linux:')}{' '}
            <SecondaryLink href={GET_APPS_PATH}>{t('open this on your computer')}</SecondaryLink>
          </p>
        </>
      )}
    </AppCard>
  );
};

export const FileSyncAppCard = () => {
  const isDesktop = getAppPlatform() === 'desktop';

  return (
    <AppCard
      icon={HomebaseFileSync}
      name={t('File sync')}
      what={t('A folder on your computer that stays in sync with your Homebase.')}
      why={t(
        'Like Dropbox, but the files live on your own Homebase. Save a file in the folder and it is there, on every computer you sync.'
      )}
    >
      {isDesktop ? (
        <div className="flex flex-col gap-4">
          <DesktopDownload app={FILE_SYNC_DESKTOP} />
          <CardSection label={t('After installing')}>
            <p className="text-sm text-slate-400">
              {t(
                'File sync has no window. Open it, then choose "Log in to Homebase…" from its icon in the menu bar or taskbar.'
              )}
            </p>
          </CardSection>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          {t('For Mac, Windows and Linux. Open your owner console on your computer to install it.')}
        </p>
      )}
    </AppCard>
  );
};

const AppCard = ({
  icon: Icon,
  name,
  what,
  why,
  children,
}: {
  icon: FC<IconProps>;
  name: string;
  what: string;
  why: string;
  children: ReactNode;
}) => (
  <div className="flex h-full flex-col gap-4 rounded-lg bg-background p-5">
    <div className="flex flex-row items-center gap-4">
      <Icon className="h-14 w-14 flex-shrink-0 rounded-[22%] shadow-sm" />
      <div>
        <p className="text-lg font-medium">{name}</p>
        <p className="leading-snug text-foreground/70">{what}</p>
      </div>
    </div>
    <p className="text-sm text-slate-400">{why}</p>
    <div className="mt-auto flex flex-col gap-2">{children}</div>
  </div>
);
