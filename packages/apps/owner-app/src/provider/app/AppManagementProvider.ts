import {
  drivesEqual,
  getDrivePermissionFromString,
  getPermissionNumberFromDrivePermission,
} from '@homebase-id/js-lib/helpers';
import {
  AppClientRegistrationRequest,
  AppClientRegistrationResponse,
  AppRegistrationRequest,
  RedactedAppRegistration,
  GetAppRequest,
  AppClientRegistration,
  PermissionUpdateRequest,
  PermissionSetGrantRequest,
} from './AppManagementProviderTypes';
import { OdinClient } from '@homebase-id/js-lib/core';
import { DriveGrant } from '@homebase-id/js-lib/network';

//adds the specified client to the list of allowed clients for a given app; returns a CAT
export const RegisterAppClient = async (
  odinClient: OdinClient,
  request: AppClientRegistrationRequest
): Promise<AppClientRegistrationResponse> => {
  const client = odinClient.createAxiosClient();
  const response = await client.post<AppClientRegistrationResponse>(
    'appmanagement/register/client',
    request
  );
  return response.data;
};

export const GetAppClients = async (
  odinClient: OdinClient,
  appId: string
): Promise<AppClientRegistration[]> => {
  const client = odinClient.createAxiosClient();
  const response = await client.post<AppClientRegistration[]>(`appmanagement/clients`, {
    appId: appId,
  });
  return response.data;
};

export const RemoveClient = async (
  odinClient: OdinClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = odinClient.createAxiosClient();
  const response = await client.post('appmanagement/deleteClient', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const RevokeClient = async (
  odinClient: OdinClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = odinClient.createAxiosClient();
  const response = await client.post('appmanagement/revokeClient', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const AllowClient = async (
  odinClient: OdinClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = odinClient.createAxiosClient();
  const response = await client.post('appmanagement/allowClient', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const RegisterChatAppClient_temp = async (
  odinClient: OdinClient,
  request: AppClientRegistrationRequest
): Promise<AppClientRegistrationResponse> => {
  const client = odinClient.createAxiosClient();
  const response = await client.post<AppClientRegistrationResponse>(
    'appmanagement/register/chatclient_temp',
    request
  );

  return response.data;
};

export const RegisterApp = async (
  odinClient: OdinClient,
  request: AppRegistrationRequest
): Promise<RedactedAppRegistration> => {
  const client = odinClient.createAxiosClient();
  const response = await client.post<RedactedAppRegistration>('appmanagement/register/app', {
    ...request,
    drives: request.drives?.map((driveGrant) => ({
      ...driveGrant,
      permissionedDrive: getPermissionNumberFromDrivePermission(driveGrant.permissionedDrive),
    })),
    circleMemberPermissionGrant: {
      ...request.circleMemberPermissionGrant,
      drives: request.circleMemberPermissionGrant?.drives?.map((driveGrant) => ({
        ...driveGrant,
        permissionedDrive: getPermissionNumberFromDrivePermission(driveGrant.permissionedDrive),
      })),
    },
  });

  return response.data;
};

export const GetAppRegistration = async (
  odinClient: OdinClient,
  request: GetAppRequest
): Promise<RedactedAppRegistration | undefined> => {
  const client = odinClient.createAxiosClient();
  const appreg = await client
    .post<RedactedAppRegistration>('appmanagement/app', request)
    .then((response) => response.data);
  if (!appreg) return;

  return {
    ...appreg,
    grant: {
      ...appreg.grant,
      driveGrants: appreg.grant.driveGrants?.map((driveGrant) => {
        return {
          permissionedDrive: {
            drive: driveGrant.permissionedDrive.drive,
            permission: getDrivePermissionFromString(driveGrant.permissionedDrive.permission),
          },
        };
      }),
    },
    circleMemberPermissionSetGrantRequest: {
      ...appreg.circleMemberPermissionSetGrantRequest,
      drives: appreg.circleMemberPermissionSetGrantRequest?.drives?.map((driveGrant) => {
        return {
          permissionedDrive: {
            drive: driveGrant.permissionedDrive.drive,
            permission: getDrivePermissionFromString(driveGrant.permissionedDrive.permission),
          },
        };
      }),
    },
  };
};

export const GetAppRegistrations = async (
  odinClient: OdinClient
): Promise<RedactedAppRegistration[]> => {
  const client = odinClient.createAxiosClient();
  const response = await client.get<RedactedAppRegistration[]>('appmanagement/list');

  return response.data.map((appreg) => {
    return {
      ...appreg,
      grant: {
        ...appreg.grant,
        driveGrants: appreg.grant.driveGrants?.map((driveGrant) => {
          return {
            permissionedDrive: {
              drive: driveGrant.permissionedDrive.drive,
              permission: getDrivePermissionFromString(driveGrant.permissionedDrive.permission),
            },
          };
        }),
      },
      circleMemberPermissionSetGrantRequest: {
        ...appreg.circleMemberPermissionSetGrantRequest,
        drives: appreg.circleMemberPermissionSetGrantRequest.drives?.map((driveGrant) => {
          return {
            permissionedDrive: {
              drive: driveGrant.permissionedDrive.drive,
              permission: getDrivePermissionFromString(driveGrant.permissionedDrive.permission),
            },
          };
        }),
      },
    };
  });
};

export const RevokeApp = async (
  odinClient: OdinClient,
  request: GetAppRequest
): Promise<void> => {
  const client = odinClient.createAxiosClient();
  await client.post('appmanagement/revoke', request);
};

export const AllowApp = async (
  odinClient: OdinClient,
  request: GetAppRequest
): Promise<void> => {
  const client = odinClient.createAxiosClient();
  return await client.post('appmanagement/allow', request).then((response) => response.data);
};

export const RemoveApp = async (
  odinClient: OdinClient,
  request: GetAppRequest
): Promise<void> => {
  const client = odinClient.createAxiosClient();
  return await client.post('appmanagement/deleteApp', request).then((response) => response.data);
};

export const UpdateAuthorizedCircles = async (
  odinClient: OdinClient,
  request: {
    appId: string;
    authorizedCircles: string[];
    circleMemberPermissionGrant: PermissionSetGrantRequest;
  }
) => {
  const client = odinClient.createAxiosClient();
  const response = await client.post('appmanagement/register/updateauthorizedcircles', {
    ...request,
    circleMemberPermissionGrant: {
      ...request.circleMemberPermissionGrant,
      drives: request.circleMemberPermissionGrant?.drives?.map((driveGrant) => ({
        permissionedDrive: getPermissionNumberFromDrivePermission(driveGrant.permissionedDrive),
      })),
    },
  });

  return response.data;
};

export const UpdatePermissions = async (
  odinClient: OdinClient,
  request: PermissionUpdateRequest
) => {
  const cleanedUpRequest: PermissionUpdateRequest = {
    ...request,
    permissionSet: {
      ...request.permissionSet,
      keys: request.permissionSet.keys.reduce((acc: number[], key: number) => {
        if (!acc.includes(key)) acc.push(key);
        return acc;
      }, [] as number[]),
    },
    drives: request.drives.reduce((acc: DriveGrant[], driveGrant) => {
      if (
        !acc.find((d) => drivesEqual(d.permissionedDrive.drive, driveGrant.permissionedDrive.drive))
      )
        acc.push(driveGrant);

      return acc;
    }, [] as DriveGrant[]),
  };

  const client = odinClient.createAxiosClient();
  const response = await client.post('appmanagement/register/updateapppermissions', {
    ...cleanedUpRequest,
    drives: cleanedUpRequest.drives.map((driveGrant) => ({
      permissionedDrive: getPermissionNumberFromDrivePermission(driveGrant.permissionedDrive),
    })),
  });

  return response.data;
};
