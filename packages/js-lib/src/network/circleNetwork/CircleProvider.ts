import { DotYouClient, assertIfDotYouClientIsOwner } from '../../core/DotYouClient';
import { getNewId } from '../../helpers/helpers';
import { DrivePermissionType } from '../network';
import { CircleDefinition } from './CircleDataTypes';

//Handles management of Circles
const root = '/circles/definitions';

export const updateCircleDefinition = async (
  dotYouClient: DotYouClient,
  circleDefinition: CircleDefinition
) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/update';

  const data = { ...circleDefinition };
  data.driveGrants = data.driveGrants || [];

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const createCircleDefinition = async (
  dotYouClient: DotYouClient,
  circleDefinition: CircleDefinition
) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/create';

  if (!circleDefinition.id) {
    circleDefinition.id = getNewId();
  }

  return client
    .post(url, circleDefinition)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

/// Convert text based permission levels to the numbered type
// Reflects DrivePermission enum in services/Odin.Core.Services/Drives/DrivePermission.cs
export const parsePermissions = (permission: unknown): number | string | unknown => {
  if (typeof permission !== 'string') {
    return permission;
  }

  const lowered = permission.toLowerCase();
  return lowered === 'read'
    ? DrivePermissionType.Reader
    : lowered === 'write'
    ? DrivePermissionType.Writer
    : lowered === 'read, write'
    ? DrivePermissionType.Editor
    : lowered === 'react'
    ? DrivePermissionType.React
    : lowered === 'comment'
    ? DrivePermissionType.Comment
    : lowered === 'read, react'
    ? DrivePermissionType.ReadAndWriteReactions
    : lowered === 'read, writereactionsandcomments'
    ? DrivePermissionType.ReadAndWriteReactionsAndComments
    : lowered === 'writereactionsandcomments'
    ? DrivePermissionType.WriteReactionsAndComments
    : lowered === 'readwrite' || lowered === 'all'
    ? DrivePermissionType.Full
    : permission;
};

export const getCircles = async (dotYouClient: DotYouClient): Promise<CircleDefinition[]> => {
  assertIfDotYouClientIsOwner(dotYouClient);

  const client = dotYouClient.createAxiosClient();
  const url = root + '/list';

  const response = await client.get<CircleDefinition[]>(url);

  return response.data.map((circleDef) => {
    return {
      ...circleDef,
      driveGrants: circleDef.driveGrants?.map((grant) => {
        return {
          permissionedDrive: {
            ...grant.permissionedDrive,
            permission: parsePermissions(grant.permissionedDrive.permission),
          },
        };
      }),
    } as CircleDefinition;
  });
};

export const getCircle = async (
  dotYouClient: DotYouClient,
  circleId: string
): Promise<CircleDefinition> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/get';

  const circleDef = await client.post<CircleDefinition>(url, circleId).then((response) => {
    return response.data;
  });

  return {
    ...circleDef,
    driveGrants: circleDef.driveGrants?.map((grant) => {
      return {
        permissionedDrive: {
          ...grant.permissionedDrive,
          permission: parsePermissions(grant.permissionedDrive.permission),
        },
      };
    }),
  } as CircleDefinition;
};

export const disableCircle = async (dotYouClient: DotYouClient, circleId: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/disable';

  return client
    .post(url, circleId)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const enableCircle = async (dotYouClient: DotYouClient, circleId: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/enable';

  return client
    .post(url, circleId)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const removeCircle = async (dotYouClient: DotYouClient, circleId: string) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/delete';

  return client
    .post(url, circleId)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};
