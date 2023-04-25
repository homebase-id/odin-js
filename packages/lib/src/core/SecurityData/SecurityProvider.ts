import { parsePermissions } from '../../owner/circleNetwork/CircleProvider';
import { ApiType, DotYouClient } from '../DotYouClient';
import { DrivePermissions } from '../DriveData/DriveTypes';
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

  const client = dotYouClient.createAxiosClient();

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
                    permission: parsePermissions(
                      grant.permissionedDrive.permission
                    ) as DrivePermissions,
                  },
                };
              }),
            };
          }),
        },
      };
    });
};

export const getSecurityContextOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string
): Promise<SecurityContex> => {
  const client = dotYouClient.createAxiosClient();

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
                    permission: parsePermissions(
                      grant.permissionedDrive.permission
                    ) as DrivePermissions,
                  },
                };
              }),
            };
          }),
        },
      };
    });
};
