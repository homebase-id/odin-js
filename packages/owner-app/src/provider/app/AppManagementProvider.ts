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
import { DotYouClient, DrivePermissions, parsePermissions } from '@youfoundation/js-lib';

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
  dotYouClient: DotYouClient
): Promise<AppClientRegistration[]> => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.get<AppClientRegistration[]>('appmanagement/clients');
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
  const response = await client.post<RedactedAppRegistration>(
    'appmanagement/register/app',
    request
  );

  console.log('RegisterApp returning response');
  console.log(response);

  return response.data;
};

export const GetAppRegistration = async (
  dotYouClient: DotYouClient,
  request: GetAppRequest
): Promise<RedactedAppRegistration> => {
  const client = dotYouClient.createAxiosClient();
  const appreg = await client
    .post<RedactedAppRegistration>('appmanagement/app', request)
    .then((response) => response.data);
  if (!appreg) return null;

  return {
    ...appreg,
    grant: {
      ...appreg.grant,
      driveGrants: appreg.grant.driveGrants.map((driveGrant) => {
        return {
          permissionedDrive: {
            drive: driveGrant.permissionedDrive.drive,
            permission: parsePermissions(
              driveGrant.permissionedDrive.permission
            ) as DrivePermissions,
          },
        };
      }),
    },
    circleMemberPermissionSetGrantRequest: {
      ...appreg.circleMemberPermissionSetGrantRequest,
      drives: appreg.circleMemberPermissionSetGrantRequest.drives.map((driveGrant) => {
        return {
          permissionedDrive: {
            drive: driveGrant.permissionedDrive.drive,
            permission: parsePermissions(
              driveGrant.permissionedDrive.permission
            ) as DrivePermissions,
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
        driveGrants: appreg.grant.driveGrants.map((driveGrant) => {
          return {
            permissionedDrive: {
              drive: driveGrant.permissionedDrive.drive,
              permission: parsePermissions(
                driveGrant.permissionedDrive.permission
              ) as DrivePermissions,
            },
          };
        }),
      },
      circleMemberPermissionSetGrantRequest: {
        ...appreg.circleMemberPermissionSetGrantRequest,
        drives: appreg.circleMemberPermissionSetGrantRequest.drives.map((driveGrant) => {
          return {
            permissionedDrive: {
              drive: driveGrant.permissionedDrive.drive,
              permission: parsePermissions(
                driveGrant.permissionedDrive.permission
              ) as DrivePermissions,
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
  const response = await client.post('appmanagement/register/updateauthorizedcircles', request);

  return response.data;
};

export const UpdatePermissions = async (
  dotYouClient: DotYouClient,
  request: PermissionUpdateRequest
) => {
  const client = dotYouClient.createAxiosClient();
  const response = await client.post('appmanagement/register/updateapppermissions', request);

  return response.data;
};
