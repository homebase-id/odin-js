import { DotYouClient, assertIfDotYouClientIsOwnerOrApp } from '../../../core/DotYouClient';
import { TargetDrive, SystemFileType, PagedResult, DriveDefinition } from '../../../core/core';
import { stringifyToQueryParams } from '../../../helpers/DataUtil';

/// Drive methods:
//returns all drives for a given type
export const getDrivesByTypeOverPeer = async (
  dotYouClient: DotYouClient,
  type: string,
  pageNumber: number,
  pageSize: number,
  odinId: string,
  systemFileType?: SystemFileType
): Promise<PagedResult<DriveDefinition>> => {
  assertIfDotYouClientIsOwnerOrApp(dotYouClient);
  const client = dotYouClient.createAxiosClient({
    systemFileType,
    v2: true,
  });

  // The server answers with every drive of the type the peer lets the caller see, as V1 did; there is no paging
  const route = `/peer/${encodeURIComponent(odinId)}/drives?${stringifyToQueryParams({ type })}`;
  return client.get(route).then((response) => {
    return {
      ...response.data,
      results: response?.data?.results?.map((result: { targetDrive: TargetDrive }) => {
        return { ...result, targetDriveInfo: result.targetDrive };
      }),
    };
  });
};
