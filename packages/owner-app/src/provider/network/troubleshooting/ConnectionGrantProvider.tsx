import { DotYouClient } from '@youfoundation/js-lib/core';
import { assertIfDefined } from '@youfoundation/js-lib/helpers';

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