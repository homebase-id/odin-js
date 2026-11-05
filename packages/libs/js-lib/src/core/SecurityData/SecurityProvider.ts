import { getDrivePermissionFromString } from '../../helpers/PermissionHelpers';
import { ApiType, DotYouClient } from '../DotYouClient';
import { SecurityContex } from './SecurityTypes';

export const getSecurityContext = async (dotYouClient: DotYouClient): Promise<SecurityContex> => {
  if (dotYouClient.getType() === ApiType.Owner) {
    return {
      caller: {
        odinId: undefined,
        securityLevel: 'owner',
      },
      permissionContext: { permissionGroups: [] },
    };
  }

  const client = dotYouClient.createAxiosClient({ v2: true });

  return client
    .get<SecurityContex>('/auth/context')
    .then((response) => response.data)
    .then((context) => {
      return {
        ...context,
        permissionContext: {
          ...context.permissionContext,
          permissionGroups: context.permissionContext.permissionGroups.map((group) => {
            return {
              ...group,
              driveGrants: group.driveGrants?.map((grant) => {
                return {
                  ...grant,
                  permissionedDrive: {
                    ...grant.permissionedDrive,
                    permission: getDrivePermissionFromString(grant.permissionedDrive.permission),
                  },
                };
              }),
            };
          }),
        },
      };
    });
};

export const getSecurityContextOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<SecurityContex> => {
  const client = dotYouClient.createAxiosClient({ v2: true });

  return client
    .get<SecurityContex>(`/peer/${encodeURIComponent(odinId)}/auth/context`)
    .then((response) => response.data)
    .then((context) => {
      return {
        ...context,
        permissionContext: {
          ...context.permissionContext,
          permissionGroups: context.permissionContext.permissionGroups.map((group) => {
            return {
              ...group,
              driveGrants: group.driveGrants?.map((grant) => {
                return {
                  ...grant,
                  permissionedDrive: {
                    ...grant.permissionedDrive,
                    permission: getDrivePermissionFromString(grant.permissionedDrive.permission),
                  },
                };
              }),
            };
          }),
        },
      };
    });
};
