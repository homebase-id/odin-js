import { describe, expect, it } from 'vitest';
import { toServerAppRegistrationRequest } from './AppManagementProvider';

const appId = '00000000-0000-0000-0000-000000000001';
const drive = {
  alias: 'cfceb937-b868-496b-91cb-3402f18320f8',
  type: '5da48122-e946-487a-8b9d-589642f3c91d',
};

describe('toServerAppRegistrationRequest', () => {
  // Homebase Filesync's `ac` on first install, as appCirclesParamToDeclarations parses it: the
  // grant's permission arrives as an array, like every other grant in the owner app.
  it('sends a declared circle grant permission as the one number the server takes', () => {
    const body = toServerAppRegistrationRequest({
      appId,
      name: 'Homebase Filesync',
      appSlug: 'filesync',
      circles: [
        {
          slug: 'filesync',
          name: 'Filesync',
          description: 'People who can see the files you share through Homebase Filesync',
          emoji: '📁',
          driveGrants: [{ permissionedDrive: { drive, permission: [1] } }],
          permissions: { keys: [] },
        },
      ],
    });

    expect(body.circles?.[0].driveGrants[0].permissionedDrive).toEqual({ drive, permission: 1 });
  });

  it('sums the permissions of the app drives and the circle member grant', () => {
    const body = toServerAppRegistrationRequest({
      appId,
      name: 'app',
      appSlug: 'app',
      drives: [{ permissionedDrive: { drive, permission: [1, 2] } }],
      circleMemberPermissionGrant: {
        drives: [{ permissionedDrive: { drive, permission: [1, 4] } }],
      },
    });

    expect(body.drives?.[0].permissionedDrive.permission).toBe(3);
    expect(body.circleMemberPermissionGrant.drives?.[0].permissionedDrive.permission).toBe(5);
  });
});
