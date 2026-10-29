import { describe, expect, it, vi } from 'vitest';

// common-app reaches for window when loaded; this file needs only its translations
vi.mock('@homebase-id/common-app', () => ({ t: (text: string) => text }));

import { BlogConfig } from '@homebase-id/js-lib/public';
import { drivesParamProblems, drivesParamToDriveGrantRequest } from './util';

const drive = (extra: Record<string, unknown>) =>
  JSON.stringify([
    {
      a: 'cfceb937b868496b91cb3402f18320f8',
      t: '5da48122e946487a8b9d589642f3c91d',
      n: 'Filesync',
      d: '',
      p: 3,
      ds: 'filesync',
      ts: 'filesync',
      ...extra,
    },
  ]);

describe('the sharing model an app asks a drive to be created as (sm)', () => {
  it('carries a known model into the drive request, and absent stays absent (collaborative)', () => {
    expect(
      drivesParamToDriveGrantRequest(drive({ sm: 'selectiveShare' }))?.[0].driveMeta?.sharingModel
    ).toBe('selectiveShare');
    expect(drivesParamToDriveGrantRequest(drive({}))?.[0].driveMeta?.sharingModel).toBeUndefined();
  });

  it('refuses an unknown model rather than creating the drive as something else', () => {
    expect(drivesParamProblems(drive({ sm: 'secret' }), 'd')).toHaveLength(1);
    expect(drivesParamToDriveGrantRequest(drive({ sm: 'secret' }))).toBeUndefined();
  });

  it('refuses a private drive that allows anonymous reads', () => {
    expect(drivesParamProblems(drive({ sm: 'private', r: true }), 'd')).toHaveLength(1);
    expect(drivesParamProblems(drive({ sm: 'collaborative', r: true }), 'd')).toHaveLength(0);
  });

  it('refuses a private drive that allows subscriptions', () => {
    expect(drivesParamProblems(drive({ sm: 'selectiveShare', s: true }), 'd')).toHaveLength(1);
    expect(drivesParamProblems(drive({ s: true }), 'd')).toHaveLength(0);
  });

  it('refuses a private channel drive, which the console makes CDN-readable', () => {
    expect(
      drivesParamProblems(drive({ sm: 'private', t: BlogConfig.DriveType }), 'd')
    ).toHaveLength(1);
    expect(drivesParamProblems(drive({ t: BlogConfig.DriveType }), 'd')).toHaveLength(0);
  });
});
