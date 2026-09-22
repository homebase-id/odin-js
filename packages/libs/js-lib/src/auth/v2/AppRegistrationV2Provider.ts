import { BaseDotYouClient } from '../../core/DotYouClient';
import {
  AddOwnedResourcesRequest,
  AppManifestV2,
  AppRegistrationV2,
  AppRegistrationValidationResult,
  OwnedCircle,
  UpdateAppPermissionsV2Request,
  UpdateAuthorizedCirclesV2Request,
  UpdateOwnedDriveRequest,
} from './AppRegistrationV2Types';
import { createV2AxiosClient, withV2Errors } from './V2ApiClient';
import { encodeBase64UrlJson } from './Base64UrlJson';

/**
 * `/api/v2/app-registrations` -- owner only. Pass the owner console's DotYouClient; the owner
 * shared secret encrypts every call, as on `/api/owner/v1`.
 */
const root = '/app-registrations';

export const getAppRegistrationsV2 = (dotYouClient: BaseDotYouClient) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.get<AppRegistrationV2[]>(root)).data;
  });

/** undefined when the app is not registered */
export const getAppRegistrationV2 = async (
  dotYouClient: BaseDotYouClient,
  appId: string
): Promise<AppRegistrationV2 | undefined> => {
  const client = createV2AxiosClient(dotYouClient);
  return withV2Errors(dotYouClient, async () => {
    const response = await client.get<AppRegistrationV2>(`${root}/${appId}`, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });
    return response.status === 404 ? undefined : response.data;
  });
};

/** Dry run: every problem with the manifest and what applying it would change. Writes nothing. */
export const validateAppManifestV2 = (dotYouClient: BaseDotYouClient, manifest: AppManifestV2) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.post<AppRegistrationValidationResult>(`${root}/validate`, manifest)).data;
  });

export const registerAppV2 = (dotYouClient: BaseDotYouClient, manifest: AppManifestV2) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.post<AppRegistrationV2>(root, manifest)).data;
  });

export const addOwnedResourcesV2 = (
  dotYouClient: BaseDotYouClient,
  appId: string,
  request: AddOwnedResourcesRequest
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.post<AppRegistrationV2>(`${root}/${appId}/owned`, request)).data;
  });

export const updateAppPermissionsV2 = (
  dotYouClient: BaseDotYouClient,
  appId: string,
  request: UpdateAppPermissionsV2Request
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.put(`${root}/${appId}/permissions`, request);
  });

export const updateAppAuthorizedCirclesV2 = (
  dotYouClient: BaseDotYouClient,
  appId: string,
  request: UpdateAuthorizedCirclesV2Request
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.put(`${root}/${appId}/authorized-circles`, request);
  });

export const updateOwnedDriveV2 = (
  dotYouClient: BaseDotYouClient,
  appId: string,
  driveId: string,
  request: UpdateOwnedDriveRequest
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.patch(`${root}/${appId}/owned-drives/${driveId}`, request);
  });

export const updateOwnedCircleV2 = (
  dotYouClient: BaseDotYouClient,
  appId: string,
  circleId: string,
  circle: OwnedCircle
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.put(`${root}/${appId}/owned-circles/${circleId}`, circle);
  });

export const deleteOwnedCircleV2 = (
  dotYouClient: BaseDotYouClient,
  appId: string,
  circleId: string
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.delete(`${root}/${appId}/owned-circles/${circleId}`);
  });

// ---------------------------------------------------------------------------------------------
// Client side: sending the owner to the registration page
// ---------------------------------------------------------------------------------------------

/**
 * `https://{identity}/owner/app-registration?m={base64url(JSON manifest)}&return=&cancel=`.
 * The page installs or updates the app, then goes to `returnUrl`; cancel goes to
 * `cancelUrl?error=cancelled-by-user`.
 */
export const getAppRegistrationUrl = (
  identity: string,
  manifest: AppManifestV2,
  returnUrl: string,
  cancelUrl?: string
) => {
  const params = new URLSearchParams({ m: encodeBase64UrlJson(manifest), return: returnUrl });
  if (cancelUrl) params.set('cancel', cancelUrl);
  return `https://${identity}/owner/app-registration?${params.toString()}`;
};
