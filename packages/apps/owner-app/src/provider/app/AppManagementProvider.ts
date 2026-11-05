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
  DriveGrantRequest,
} from './AppManagementProviderTypes';
import { DotYouClient } from '@homebase-id/js-lib/core';
import { DriveGrant } from '@homebase-id/js-lib/network';

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
  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.post<AppClientRegistration[]>(`app-management/clients`, {
    appId: appId,
  });
  return response.data;
};

export const RemoveClient = async (
  dotYouClient: DotYouClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.post('app-management/delete-client', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const RevokeClient = async (
  dotYouClient: DotYouClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.post('app-management/revoke-client', {
    accessRegistrationId: request.registrationId,
  });
  return response.data;
};

export const AllowClient = async (
  dotYouClient: DotYouClient,
  request: { appId: string; registrationId: string }
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.post('app-management/allow-client', {
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

  return response.data;
};

export const RegisterApp = async (
  dotYouClient: DotYouClient,
  request: AppRegistrationRequest
): Promise<RedactedAppRegistration> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.post<RedactedAppRegistration>(
    'app-management/register/app',
    toServerAppRegistrationRequest(request)
  );

  return response.data;
};

/** The register body as the server reads it: every drive grant list through toServerDriveGrant. */
export const toServerAppRegistrationRequest = (request: AppRegistrationRequest) => ({
  ...request,
  drives: request.drives?.map(toServerDriveGrant),
  circleMemberPermissionGrant: {
    ...request.circleMemberPermissionGrant,
    drives: request.circleMemberPermissionGrant?.drives?.map(toServerDriveGrant),
  },
  circles: request.circles?.map((circle) => ({
    ...circle,
    driveGrants: circle.driveGrants.map(toServerDriveGrant),
  })),
});

/** A drive grant as the server reads it: the permissioned drive alone, its flags OR-ed into one number. */
const toServerDriveGrant = (grant: DriveGrantRequest) => ({
  permissionedDrive: getPermissionNumberFromDrivePermission(grant.permissionedDrive),
});

export const GetAppRegistration = async (
  dotYouClient: DotYouClient,
  request: GetAppRequest
): Promise<RedactedAppRegistration | undefined> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const appreg = await client
    .post<RedactedAppRegistration>('app-management/app', request)
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
  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.get<RedactedAppRegistration[]>('app-management/list');

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
  const client = dotYouClient.createAxiosClient({ v2: true });
  await client.post('app-management/revoke', request);
};

export const AllowApp = async (
  dotYouClient: DotYouClient,
  request: GetAppRequest
): Promise<void> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  return await client.post('app-management/allow', request).then((response) => response.data);
};

/**
 * Uninstalls a third-party app fully: its clients, its grants on every connection and its registration. An app
 * that owns circles or drives is refused unless `deleteOwnedCirclesAndDrives` says they go with it.
 */
export const UninstallApp = async (
  dotYouClient: DotYouClient,
  request: { appId: string; deleteOwnedCirclesAndDrives: boolean }
): Promise<void> => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  return await client.post('app-management/uninstall', request).then((response) => response.data);
};

export const UpdateAuthorizedCircles = async (
  dotYouClient: DotYouClient,
  request: {
    appId: string;
    authorizedCircles: string[];
    circleMemberPermissionGrant: PermissionSetGrantRequest;
  }
) => {
  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.post('app-management/register/update-authorized-circles', {
    ...request,
    circleMemberPermissionGrant: {
      ...request.circleMemberPermissionGrant,
      drives: request.circleMemberPermissionGrant?.drives?.map(toServerDriveGrant),
    },
  });

  return response.data;
};

export const UpdatePermissions = async (
  dotYouClient: DotYouClient,
  request: PermissionUpdateRequest
) => {
  const cleanedUpRequest: PermissionUpdateRequest = {
    ...request,
    permissionSet: {
      ...request.permissionSet,
      keys: (request.permissionSet?.keys ?? []).reduce((acc: number[], key: number) => {
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

  const client = dotYouClient.createAxiosClient({ v2: true });
  const response = await client.post('app-management/register/update-app-permissions', {
    ...cleanedUpRequest,
    drives: cleanedUpRequest.drives.map(toServerDriveGrant),
  });

  return response.data;
};
