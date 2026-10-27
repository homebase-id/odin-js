import { describe, expect, it, vi } from 'vitest';
import { toServerAppRegistrationRequest } from './AppManagementProvider';
import { appCirclesParamToDeclarations } from '../../templates/AppDefinition/util';

// util.ts takes only `t` from common-app, whose index reads `window` on import.
vi.mock('@homebase-id/common-app', () => ({ t: (text: string) => text }));

const appId = '00000000-0000-0000-0000-000000000001';
const drive = {
  alias: 'cfceb937-b868-496b-91cb-3402f18320f8',
  type: '5da48122-e946-487a-8b9d-589642f3c91d',
};

describe('toServerAppRegistrationRequest', () => {
  it("sends a declared circle's grant permission as the one number the server takes", () => {
    // Homebase Filesync's `ac` on its first install.
    const circles = appCirclesParamToDeclarations(
      JSON.stringify([
        {
          s: 'filesync',
          n: 'Filesync',
          d: 'People who can see the files you share through Homebase Filesync',
          e: '📁',
          g: [{ a: drive.alias, t: drive.type, p: 1 }],
        },
      ])
    );
    expect(circles).toBeDefined();

    const body = toServerAppRegistrationRequest({
      appId,
      name: 'Homebase Filesync',
      appSlug: 'filesync',
      circles,
    });

    expect(body.circles?.[0].driveGrants).toEqual([
      { permissionedDrive: { drive, permission: 1 } },
    ]);
  });

  it('sends the app drives and the circle member grant the same way', () => {
    const body = toServerAppRegistrationRequest({
      appId,
      name: 'app',
      appSlug: 'app',
      drives: [{ permissionedDrive: { drive, permission: [1, 2] } }],
      circleMemberPermissionGrant: {
        drives: [{ permissionedDrive: { drive, permission: [1, 4] } }],
      },
    });

    expect(body.drives).toEqual([{ permissionedDrive: { drive, permission: 3 } }]);
    expect(body.circleMemberPermissionGrant.drives).toEqual([
      { permissionedDrive: { drive, permission: 5 } },
    ]);
  });
});
