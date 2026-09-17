import type { AppManifestV2 } from '@homebase-id/js-lib/auth';

/**
 * Three hard-coded third-party apps. Each owns one drive and one circle whose members get
 * Write + React on that drive (manual membership only), and asks for a couple of harmless
 * identity permission keys.
 *
 * Only the primary app (Notes) sets corsHostName: that is the host the bundle token's redirect is
 * checked against. corsHostName is immutable once registered, so run this app on the same host and
 * port every time (https://dev.dotyou.cloud:3008).
 */

// PermissionKeys (js-lib AppPermissionType)
const READ_CONNECTIONS = 10;
const READ_WHO_I_FOLLOW = 80;
const READ_CIRCLE_MEMBERS = 50;

// DrivePermission flags
const WRITE = 2;
const REACT = 4;

export interface SampleApp {
  key: 'notes' | 'photos' | 'tasks';
  appId: string;
  name: string;
  appSlug: string;
  drive: { alias: string; type: string; name: string; driveSlug: string; driveTypeSlug: string };
  circleId: string;
  circleName: string;
  emoji: string;
  permissionKeys: number[];
  isPrimary: boolean;
}

export const SAMPLE_APPS: SampleApp[] = [
  {
    key: 'notes',
    appId: 'b0d1e000-0000-4000-8000-00000000a001',
    name: 'Bundle Demo Notes',
    appSlug: 'bd-notes',
    drive: {
      alias: 'b0d1e000-0000-4000-8000-00000000d001',
      type: 'b0d1e000-0000-4000-8000-00000000e001',
      name: 'Bundle Demo Notes',
      driveSlug: 'notes',
      driveTypeSlug: 'bd-notes',
    },
    circleId: 'b0d1e000-0000-4000-8000-00000000c001',
    circleName: 'Notes collaborators',
    emoji: '📝',
    permissionKeys: [READ_CONNECTIONS, READ_WHO_I_FOLLOW],
    isPrimary: true,
  },
  {
    key: 'photos',
    appId: 'b0d1e000-0000-4000-8000-00000000a002',
    name: 'Bundle Demo Photos',
    appSlug: 'bd-photos',
    drive: {
      alias: 'b0d1e000-0000-4000-8000-00000000d002',
      type: 'b0d1e000-0000-4000-8000-00000000e002',
      name: 'Bundle Demo Photos',
      driveSlug: 'photos',
      driveTypeSlug: 'bd-photos',
    },
    circleId: 'b0d1e000-0000-4000-8000-00000000c002',
    circleName: 'Photo viewers',
    emoji: '📷',
    permissionKeys: [READ_CONNECTIONS],
    isPrimary: false,
  },
  {
    key: 'tasks',
    appId: 'b0d1e000-0000-4000-8000-00000000a003',
    name: 'Bundle Demo Tasks',
    appSlug: 'bd-tasks',
    drive: {
      alias: 'b0d1e000-0000-4000-8000-00000000d003',
      type: 'b0d1e000-0000-4000-8000-00000000e003',
      name: 'Bundle Demo Tasks',
      driveSlug: 'tasks',
      driveTypeSlug: 'bd-tasks',
    },
    circleId: 'b0d1e000-0000-4000-8000-00000000c003',
    circleName: 'Task helpers',
    emoji: '✅',
    permissionKeys: [READ_CIRCLE_MEMBERS],
    isPrimary: false,
  },
];

export const PRIMARY_APP = SAMPLE_APPS.find((app) => app.isPrimary) as SampleApp;

export const buildManifest = (app: SampleApp, corsHostName: string): AppManifestV2 => {
  const targetDrive = { alias: app.drive.alias, type: app.drive.type };
  return {
    appId: app.appId,
    name: app.name,
    appSlug: app.appSlug,
    corsHostName: app.isPrimary ? corsHostName : undefined,
    permissionSet: { keys: app.permissionKeys },
    ownedDrives: [
      {
        name: app.drive.name,
        targetDrive,
        metadata: `Owned by ${app.name} (bundle token demo)`,
        allowAnonymousReads: false,
        allowSubscriptions: false,
        allowCdn: false,
        ownerOnly: false,
        driveSlug: app.drive.driveSlug,
        driveTypeSlug: app.drive.driveTypeSlug,
      },
    ],
    ownedCircles: [
      {
        id: app.circleId,
        name: app.circleName,
        description: `People who can write to and react on ${app.name}`,
        driveGrants: [{ permissionedDrive: { drive: targetDrive, permission: WRITE | REACT } }],
        permissions: { keys: [] },
        grantOn: 'none',
        designation: 'personal',
        emoji: app.emoji,
      },
    ],
  };
};
