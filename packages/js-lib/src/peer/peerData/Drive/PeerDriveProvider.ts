import { DotYouClient, assertIfDotYouClientIsOwner } from '../../../core/DotYouClient';
import { TargetDrive, SystemFileType, PagedResult, DriveDefinition } from '../../../core/core';

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
  assertIfDotYouClientIsOwner(dotYouClient);
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
    odinId: odinId,
  };

  const client = dotYouClient.createAxiosClient({
    systemFileType,
  });

  return client.post('transit/query/metadata/type', params).then((response) => {
    return {
      ...response.data,
      results: response?.data?.results?.map((result: { targetDrive: TargetDrive }) => {
        return { ...result, targetDriveInfo: result.targetDrive };
      }),
    };
  });
};
