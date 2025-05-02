import { OdinClient, assertIfOdinClientIsOwnerOrApp } from '../../../core/OdinClient';
import { TargetDrive, SystemFileType, PagedResult, DriveDefinition } from '../../../core/core';

/// Drive methods:
//returns all drives for a given type
export const getDrivesByTypeOverPeer = async (
  odinClient: OdinClient,
  type: string,
  pageNumber: number,
  pageSize: number,
  odinId: string,
  systemFileType?: SystemFileType
): Promise<PagedResult<DriveDefinition>> => {
  assertIfOdinClientIsOwnerOrApp(odinClient);
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
    odinId: odinId,
  };

  const client = odinClient.createAxiosClient({
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
