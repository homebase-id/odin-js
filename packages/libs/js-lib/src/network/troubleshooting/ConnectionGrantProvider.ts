import { OdinClient } from '../../core/OdinClient';
import { assertIfDefined } from '../../helpers/DataUtil';

const statusPath = '/circles/connections/troubleshooting-info';
export const fetchCircleMembershipStatus = async (odinClient: OdinClient, odinId: string) => {
  assertIfDefined('OdinClient is required', odinClient);
  assertIfDefined('OdinId is required', odinId);

  const client = odinClient.createAxiosClient();
  return await client
    .post<CircleMembershipStatus>(statusPath, { odinId: odinId })
    .then((res) => res.data)
    .catch(odinClient.handleErrorResponse);
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
export const verifyConnection = async (odinClient: OdinClient, odinId: string) => {
  assertIfDefined('OdinClient is required', odinClient);
  assertIfDefined('OdinId is required', odinId);

  const client = odinClient.createAxiosClient();
  return await client
    .post<{ isValid: boolean }>(verifyPath, { odinId: odinId })
    .then((res) => res.data.isValid)
    .catch(odinClient.handleErrorResponse);
};
