import { DriveDefinition } from './DriveTypes';
import { ApiType, DotYouClient } from '../../DotYouClient';
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
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<DriveDefinition>> => {
  const client = dotYouClient.createAxiosClient();

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
  dotYouClient: DotYouClient,
  type: string,
  pageNumber: number,
  pageSize: number
): Promise<PagedResult<DriveDefinition>> => {
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
  };

  if (dotYouClient.getType() === ApiType.Owner) {
    const client = dotYouClient.createAxiosClient();
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
    const client = dotYouClient.createAxiosClient();
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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  name: string,
  metadata: string | undefined,
  allowAnonymousReads: boolean,
  allowSubscriptions = false
): Promise<boolean> => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('name', name);

  //create the drive if it does not exist
  const client = dotYouClient.createAxiosClient();
  const allDrives = await getDrives(dotYouClient, { pageNumber: 1, pageSize: 1000 });

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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newMetadata: string
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newMetadata', newMetadata);

  const client = dotYouClient.createAxiosClient();
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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newAllowAnonymousRead: boolean
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newAllowAnonymousRead', newAllowAnonymousRead);

  const client = dotYouClient.createAxiosClient();
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


export const editDriveArchiveFlag = async (
    dotYouClient: DotYouClient,
    targetDrive: TargetDrive,
    newArchived: boolean
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newArchived', newArchived);

  const client = dotYouClient.createAxiosClient();
  const data = {
    targetDrive: targetDrive,
    archived: newArchived,
  };

  return client
      .post('/drive/mgmt/set-archive-drive', data)
      .then((response) => response.status === 200)
      .catch((error) => {
        console.error('[odin-js:editDriveArchiveFlag]', error);
        throw error;
      });
};

export const editDriveAllowSubscriptions = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newAllowSubscriptions: boolean
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newAllowSubscriptions', newAllowSubscriptions);

  const client = dotYouClient.createAxiosClient();
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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  newAttributes: { [key: string]: string }
) => {
  assertIfDefined('targetDrive', targetDrive);
  assertIfDefined('newAttributes', newAttributes);

  const client = dotYouClient.createAxiosClient();
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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive
): Promise<DriveStatus> => {
  assertIfDefined('targetDrive', targetDrive);

  const client = dotYouClient.createAxiosClient();

  return client
    .get<DriveStatus>('/drive/status?' + stringifyToQueryParams(targetDrive))
    .then((response) => response.data)
    .catch((error) => {
      console.error('[odin-js:getDriveStatus]', error);
      throw error;
    });
};
