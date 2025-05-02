import { DriveDefinition } from './DriveTypes';
import { ApiType, OdinClient } from '../../OdinClient';
import {
  assertIfDefined,
  drivesEqual,
  hasDebugFlag,
  stringGuidsEqual,
  stringifyToQueryParams,
} from '../../../helpers/helpers';
import { PagedResult, PagingOptions, TargetDrive } from '../../core';

export const TRANSIENT_TEMP_DRIVE_ALIAS = '90f5e74ab7f9efda0ac298373a32ad8c';
const isDebug = hasDebugFlag();

export const getDrives = async (
  odinClient: OdinClient,
  params: PagingOptions
): Promise<PagedResult<DriveDefinition>> => {
  const client = odinClient.createAxiosClient();

  return client.post<PagedResult<DriveDefinition>>('drive/mgmt', params).then((response) => {
    return {
      ...response.data,
      results: isDebug
        ? response?.data?.results
        : response?.data?.results?.filter(
          (drive) => !stringGuidsEqual(drive.targetDriveInfo.alias, TRANSIENT_TEMP_DRIVE_ALIAS)
        ),
    };
  });
};

//returns all drives for a given type
export const getDrivesByType = async (
  odinClient: OdinClient,
  type: string,
  pageNumber: number,
  pageSize: number
): Promise<PagedResult<DriveDefinition>> => {
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
  };

  if (odinClient.getType() === ApiType.Owner) {
    const client = odinClient.createAxiosClient();
    return client
      .get<PagedResult<DriveDefinition>>('drive/mgmt/type?' + stringifyToQueryParams(params))
      .then((response) => {
        return {
          ...response.data,
          results: isDebug
            ? response?.data?.results
            : response?.data?.results?.filter(
              (drive) =>
                !stringGuidsEqual(drive.targetDriveInfo.alias, TRANSIENT_TEMP_DRIVE_ALIAS)
            ),
        };
      });
  } else {
    const client = odinClient.createAxiosClient();
    return client.get('drive/metadata/type?' + stringifyToQueryParams(params)).then((response) => {
      return {
        ...response.data,
        results: response?.data?.results?.map((result: { targetDrive: TargetDrive }) => {
          return { ...result, targetDriveInfo: result.targetDrive };
        }),
      };
    });
  }
};

export const ensureDrive = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  name: string,
  metadata: string | undefined,
  allowAnonymousReads: boolean,
  allowSubscriptions = false
): Promise<boolean> => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('name', name);

  //create the drive if it does not exist
  const client = odinClient.createAxiosClient();
  const allDrives = await getDrives(odinClient, { pageNumber: 1, pageSize: 1000 });

  const foundDrive = allDrives.results.find((d) => drivesEqual(d.targetDriveInfo, targetDrive));

  if (foundDrive) return true;

  const data = {
    name: name,
    targetDrive: targetDrive,
    metadata: metadata,
    allowAnonymousReads: allowAnonymousReads,
    allowSubscriptions: allowSubscriptions,
  };

  return client
    .post('/drive/mgmt/create', data)
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[odin-js:ensureDrive]', error);
      throw error;
    });
};

export const editDriveMetadata = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  newMetadata: string
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newMetadata', newMetadata);

  const client = odinClient.createAxiosClient();
  const data = {
    targetDrive: targetDrive,
    metadata: newMetadata,
  };

  return client
    .post('/drive/mgmt/updatemetadata', data)
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[odin-js:editDriveMetadata]', error);
      throw error;
    });
};

export const editDriveAllowAnonymousRead = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  newAllowAnonymousRead: boolean
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newAllowAnonymousRead', newAllowAnonymousRead);

  const client = odinClient.createAxiosClient();
  const data = {
    targetDrive: targetDrive,
    allowAnonymousReads: newAllowAnonymousRead,
  };

  return client
    .post('/drive/mgmt/setdrivereadmode', data)
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[odin-js:editDriveAllowAnonymousRead]', error);
      throw error;
    });
};

export const editDriveAllowSubscriptions = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  newAllowSubscriptions: boolean
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newAllowSubscriptions', newAllowSubscriptions);

  const client = odinClient.createAxiosClient();
  const data = {
    targetDrive: targetDrive,
    allowSubscriptions: newAllowSubscriptions,
  };

  return client
    .post('/drive/mgmt/set-allow-subscriptions', data)
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[odin-js:editDriveAllowSubscriptions]', error);
      throw error;
    });
};

export const editDriveAttributes = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  newAttributes: { [key: string]: string }
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newAttributes', newAttributes);

  const client = odinClient.createAxiosClient();
  const data = {
    targetDrive: targetDrive,
    attributes: newAttributes,
  };

  return client
    .post('/drive/mgmt/updateattributes', data)
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[odin-js:editDriveAttributes]', error);
      throw error;
    });
};

export interface DriveStatus {
  inbox: {
    oldestItemTimestamp: number;
    poppedCount: number;
    totalItems: number;
  };
  outbox: {
    checkedOutCount: number;
    nextItemRun: number;
    totalItems: number;
  };
  sizeInfo: {
    fileCount: number;
    size: number;
  };
}

export const getDriveStatus = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive
): Promise<DriveStatus> => {
  assertIfDefined('targetDrive', targetDrive);

  const client = odinClient.createAxiosClient();

  return client
    .get<DriveStatus>('/drive/status?' + stringifyToQueryParams(targetDrive))
    .then((response) => response.data)
    .catch((error) => {
      console.error('[odin-js:getDriveStatus]', error);
      throw error;
    });
};
