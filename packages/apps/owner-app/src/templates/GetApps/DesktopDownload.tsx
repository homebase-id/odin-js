import { useState } from 'react';
import { t, ActionLink } from '@homebase-id/common-app';
import { Download } from '@homebase-id/common-app/icons';
import {
  DesktopApp,
  DesktopArch,
  desktopDownloadUrl,
  releasePageUrl,
  useDesktopTarget,
} from './appDownloads';

const OS_LABEL = { mac: 'Mac', windows: 'Windows', linux: 'Linux' };

// One button for the visitor's computer, so nobody has to pick from the release's file list.
export const DesktopDownload = ({ app }: { app: DesktopApp }) => {
  const detected = useDesktopTarget();
  const [archOverride, setArchOverride] = useState<DesktopArch | undefined>();
  const target = { ...detected, arch: archOverride ?? detected.arch };

  // Windows ships one installer for both; on Mac and Linux the CPU picks the file.
  const hasArchChoice = target.os !== 'windows';
  const archLabel = (arch: DesktopArch) =>
    target.os === 'mac'
      ? arch === 'arm64'
        ? t('Apple silicon')
        : t('Intel')
      : arch === 'arm64'
        ? 'ARM'
        : 'x64';
  const otherArch: DesktopArch = target.arch === 'arm64' ? 'x64' : 'arm64';

  return (
    <div className="flex flex-col gap-2">
      <ActionLink
        href={desktopDownloadUrl(app, target)}
        icon={Download}
        className="w-full sm:w-auto"
      >
        {t('Download for')} {OS_LABEL[target.os]}
        {hasArchChoice ? ` (${archLabel(target.arch)})` : ''}
      </ActionLink>
      <p className="text-sm text-slate-400">
        {hasArchChoice ? (
          <>
            <button className="hover:underline" onClick={() => setArchOverride(otherArch)}>
              {t('Get the')} {archLabel(otherArch)} {t('version instead')}
            </button>
            {' · '}
          </>
        ) : null}
        <a className="hover:underline" href={releasePageUrl(app)}>
          {t('Other platforms')}
        </a>
      </p>
    </div>
  );
};
