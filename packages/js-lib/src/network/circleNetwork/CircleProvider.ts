import { DotYouClient } from '../../core/DotYouClient';
import {
  getDrivePermissionFromString,
  getNewId,
  getPermissionNumberFromDrivePermission,
} from '../../helpers/helpers';
import { CircleDefinition, DriveGrant } from './CircleDataTypes';

//Handles management of Circles
const root = '/circles/definitions';

export const ALL_CONNECTIONS_CIRCLE_ID = 'bb2683fa402aff866e771a6495765a15';

export const updateCircleDefinition = async (
  dotYouClient: DotYouClient,
  circleDefinition: CircleDefinition
) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/update';

  const data: any = { ...circleDefinition };
  data.driveGrants =
    data.driveGrants?.map((grant: DriveGrant) => ({
      ...grant,
      permissionedDrive: getPermissionNumberFromDrivePermission(grant.permissionedDrive),
    })) || [];

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

  const data: any = { ...circleDefinition };

  if (!data.id) {
    data.id = getNewId();
  }

  data.driveGrants =
    data.driveGrants?.map((grant: DriveGrant) => ({
      ...grant,
      permissionedDrive: getPermissionNumberFromDrivePermission(grant.permissionedDrive),
    })) || [];

  return client
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const getCircles = async (dotYouClient: DotYouClient): Promise<CircleDefinition[]> => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/list?includeSystemCircle=true';

  const response = await client.get<CircleDefinition[]>(url);

  return response.data.map((circleDef) => {
    return {
      ...circleDef,
      driveGrants: circleDef.driveGrants?.map((grant) => {
        return {
          permissionedDrive: {
            ...grant.permissionedDrive,
            permission: getDrivePermissionFromString(grant.permissionedDrive.permission),
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
          permission: getDrivePermissionFromString(grant.permissionedDrive.permission),
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
