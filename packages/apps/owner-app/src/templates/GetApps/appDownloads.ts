import { useEffect, useState } from 'react';
import { getOperatingSystem } from '@homebase-id/js-lib/auth';

// The Homebase app (chat-kmp) still ships under the Feed app's store ids (id.homebase.feed).
export const APP_STORE_URL = 'https://apps.apple.com/us/app/homebase-secure-feed/id6468971238';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=id.homebase.feed';

export const GET_APPS_PATH = '/owner/get-apps';

export type AppPlatform = 'ios' | 'android' | 'desktop';

export const getAppPlatform = (): AppPlatform => {
  const os = getOperatingSystem().name;
  if (os === 'iOS') return 'ios';
  if (os === 'Android') return 'android';
  return 'desktop';
};

export type DesktopOs = 'mac' | 'windows' | 'linux';
export type DesktopArch = 'arm64' | 'x64';
export type DesktopTarget = { os: DesktopOs; arch: DesktopArch };

// Desktop builds are Conveyor sites published as GitHub releases. Both release workflows copy
// each installer to a name without the version, so releases/latest/download/<name> is always the
// newest -- and the one file to download out of the dozen-odd a release holds.
export type DesktopApp = {
  repo: string;
  installer: (target: DesktopTarget) => string;
};

const conveyorArch = (arch: DesktopArch) => (arch === 'arm64' ? 'aarch64' : 'amd64');
const debArch = (arch: DesktopArch) => (arch === 'arm64' ? 'arm64' : 'amd64');

export const HOMEBASE_DESKTOP: DesktopApp = {
  repo: 'homebase-id/chat-desktop-release-production',
  installer: ({ os, arch }) =>
    os === 'mac'
      ? `homebase-chat-mac-${conveyorArch(arch)}.zip`
      : os === 'windows'
        ? 'homebase-chat.exe'
        : `homebase-chat_${debArch(arch)}.deb`,
};

export const FILE_SYNC_DESKTOP: DesktopApp = {
  repo: 'homebase-id/filesync-release-production',
  installer: ({ os, arch }) =>
    os === 'mac'
      ? `Homebase-Filesync-mac-${conveyorArch(arch)}.dmg`
      : os === 'windows'
        ? 'homebase-filesync.exe'
        : `homebase-filesync_${debArch(arch)}.deb`,
};

export const releasePageUrl = (app: DesktopApp) => `https://github.com/${app.repo}/releases/latest`;

export const desktopDownloadUrl = (app: DesktopApp, target: DesktopTarget) =>
  `${releasePageUrl(app)}/download/${app.installer(target)}`;

// The OS from the user agent; the CPU from userAgentData where the browser exposes it (Chromium).
// Safari reports Intel even on Apple silicon, so an unknown Mac is taken to be Apple silicon,
// which every Mac sold since 2020 is.
export const useDesktopTarget = (): DesktopTarget => {
  const osName = getOperatingSystem().name;
  const os: DesktopOs =
    osName === 'Windows' ? 'windows' : osName === 'Linux' || osName === 'Chrome OS' ? 'linux' : 'mac';

  const [arch, setArch] = useState<DesktopArch | undefined>();
  useEffect(() => {
    const uaData = (
      navigator as Navigator & {
        userAgentData?: { getHighEntropyValues: (hints: string[]) => Promise<{ architecture?: string }> };
      }
    ).userAgentData;
    uaData
      ?.getHighEntropyValues(['architecture'])
      .then((values) => setArch(values.architecture === 'arm' ? 'arm64' : 'x64'))
      .catch(() => undefined);
  }, []);

  return { os, arch: arch ?? (os === 'mac' ? 'arm64' : 'x64') };
};
