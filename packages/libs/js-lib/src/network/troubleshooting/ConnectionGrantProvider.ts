import { DotYouClient } from '../../core/DotYouClient';
import { assertIfDefined } from '../../helpers/DataUtil';

const statusPath = '/circles/connections/troubleshooting-info';
export const fetchCircleMembershipStatus = async (dotYouClient: DotYouClient, odinId: string) => {
  assertIfDefined('DotYouClient is required', dotYouClient);
  assertIfDefined('OdinId is required', odinId);

  const client = dotYouClient.createAxiosClient();
  return await client
    .post<CircleMembershipStatus>(statusPath, { odinId: odinId })
    .then((res) => res.data)
    .catch(dotYouClient.handleErrorResponse);
};

export interface CircleMembershipStatus {
  circles: CircleMembershipStatusEntry[];
}

export interface CircleMembershipStatusEntry {
  circleDefinitionId: string;
  circleDefinitionName: string;
  circleDefinitionDriveGrantCount: number;
  analysis: CircleMembershipStatusAnalysis;
}

export interface CircleMembershipStatusAnalysis {
  isCircleMember: boolean;
  permissionKeysAreValid: boolean;
  driveGrantAnalysis: CircleMembershipStatusDriveGrantAnalysis[];
}

export interface CircleMembershipStatusDriveGrantAnalysis {
  driveName: string;
  driveGrantIsValid: true;
}

const verifyPath = '/circles/connections/verify-connection';
export const verifyConnection = async (dotYouClient: DotYouClient, odinId: string) => {
  assertIfDefined('DotYouClient is required', dotYouClient);
  assertIfDefined('OdinId is required', odinId);

  const client = dotYouClient.createAxiosClient();
  return await client
    .post<{ isValid: boolean }>(verifyPath, { odinId: odinId })
    .then((res) => res.data.isValid)
    .catch(dotYouClient.handleErrorResponse);
};
