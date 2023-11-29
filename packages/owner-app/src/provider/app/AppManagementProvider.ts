import {
  getDrivePermissionFromString,
  getPermissionNumberFromDrivePermission,
} from '@youfoundation/js-lib/helpers';
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
import { DotYouClient } from '@youfoundation/js-lib/core';

//adds the specified client to the list of allowed clients for a given app; returns a CAT
export const RegisterAppClient = async (
  dotYouClient: DotYouClient,
  request: AppClientRegistrationRequest
): Promise<AppClientRegistrationResponse> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post<AppClientRegistrationResponse>(
    'appmanagement/register/client',
    request
  );
  return response.data;
};

export const GetAppClients = async (
  dotYouClient: DotYouClient,
  appId: string
): Promise<AppClientRegistration[]> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post<AppClientRegistration[]>(`appmanagement/clients`, {
    appId: appId,
  });
  return response.data;
};

export const RemoveClient = async (
  dotYouClient: DotYouClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post('appmanagement/deleteClient', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const RevokeClient = async (
  dotYouClient: DotYouClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post('appmanagement/revokeClient', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const AllowClient = async (
  dotYouClient: DotYouClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post('appmanagement/allowClient', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const RegisterChatAppClient_temp = async (
  dotYouClient: DotYouClient,
  request: AppClientRegistrationRequest
): Promise<AppClientRegistrationResponse> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post<AppClientRegistrationResponse>(
    'appmanagement/register/chatclient_temp',
    request
  );
  console.log('RegisterChatAppClient_temp returning response');
  console.log(response);

  return response.data;
};

export const RegisterApp = async (
  dotYouClient: DotYouClient,
  request: AppRegistrationRequest
): Promise<RedactedAppRegistration> => {
  const client = dotYouClient.createAxiosClient();
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

  console.log('RegisterApp returning response');
  console.log(response);

  return response.data;
};

export const GetAppRegistration = async (
  dotYouClient: DotYouClient,
  request: GetAppRequest
): Promise<RedactedAppRegistration | undefined> => {
  const client = dotYouClient.createAxiosClient();
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
  dotYouClient: DotYouClient
): Promise<RedactedAppRegistration[]> => {
  const client = dotYouClient.createAxiosClient();
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
  dotYouClient: DotYouClient,
  request: GetAppRequest
): Promise<void> => {
  const client = dotYouClient.createAxiosClient();
  await client.post('appmanagement/revoke', request);
};

export const AllowApp = async (
  dotYouClient: DotYouClient,
  request: GetAppRequest
): Promise<void> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post('appmanagement/allow', request);
  console.log(response);
};

export const RemoveApp = async (
  dotYouClient: DotYouClient,
  request: GetAppRequest
): Promise<void> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post('appmanagement/deleteApp', request);
  console.log(response);
};

export const UpdateAuthorizedCircles = async (
  dotYouClient: DotYouClient,
  request: {
    appId: string;
    authorizedCircles: string[];
    circleMemberPermissionGrant: PermissionSetGrantRequest;
  }
) => {
  const client = dotYouClient.createAxiosClient();
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
  dotYouClient: DotYouClient,
  request: PermissionUpdateRequest
) => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post('appmanagement/register/updateapppermissions', {
    ...request,
    drives: request.drives.map((driveGrant) => ({
      permissionedDrive: getPermissionNumberFromDrivePermission(driveGrant.permissionedDrive),
    })),
  });

  return response.data;
};
