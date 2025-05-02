import { getDrivePermissionFromString } from '../../helpers/PermissionHelpers';
import { ApiType, OdinClient } from '../OdinClient';
import { SecurityContex } from './SecurityTypes';

export const getSecurityContext = async (odinClient: OdinClient): Promise<SecurityContex> => {
  if (odinClient.getType() === ApiType.Owner) {
    return {
      caller: {
        odinId: undefined,
        securityLevel: 'owner',
      },
      permissionContext: { permissionGroups: [] },
    };
  }

  const client = odinClient.createAxiosClient();

  return client
    .get<SecurityContex>('/security/context')
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
  odinClient: OdinClient,
  odinId: string
): Promise<SecurityContex> => {
  const client = odinClient.createAxiosClient();

  return client
    .post<SecurityContex>(`/transit/query/security/context`, { odinId })
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
