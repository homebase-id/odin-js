import { DriveDefinition } from './DriveTypes';
import { ApiType, DotYouClient } from '../DotYouClient';
import { stringify } from '../../helpers/helpers';
import { PagedResult, PagingOptions, TargetDrive } from '../core';

export const getDrives = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<DriveDefinition>> => {
  const client = dotYouClient.createAxiosClient();

  return client.post('drive/mgmt', params).then((response) => {
    return response.data;
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
    // Post needed
    const client = dotYouClient.createAxiosClient();
    return client.post('drive/mgmt/type', params).then((response) => {
      return response.data;
    });
  } else {
    const client = dotYouClient.createAxiosClient();
    return client.get('drive/metadata/type?' + stringify(params)).then((response) => {
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
  metadata: string,
  allowAnonymousReads: boolean,
  allowSubscriptions = false
): Promise<boolean> => {
  //create the drive if it does not exist
  const client = dotYouClient.createAxiosClient();
  const allDrives = await getDrives(dotYouClient, { pageNumber: 1, pageSize: 1000 });

  const foundDrive = allDrives.results.find(
    (d) =>
      d.targetDriveInfo.alias == targetDrive.alias && d.targetDriveInfo.type == targetDrive.type
  );

  if (foundDrive) {
    return true;
  }

  const data = {
    name: name,
    targetDrive: targetDrive,
    metadata: metadata,
    allowAnonymousReads: allowAnonymousReads,
    allowSubscriptions: allowSubscriptions,
  };

  return client
    .post('/drive/mgmt/create', data)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:ensureDrive]', error);
      throw error;
    });
};
