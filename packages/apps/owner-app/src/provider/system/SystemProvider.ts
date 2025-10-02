import {DotYouClient, DriveDefinition, TargetDrive} from '@homebase-id/js-lib/core';
import {CircleDefinition} from '@homebase-id/js-lib/network';

export interface DriveDefinitionParam extends Omit<DriveDefinition, 'targetDriveInfo'> {
    targetDrive: TargetDrive;
}

//Handles management of the System
const root = '/config/system';

export const initialize = async (
    dotYouClient: DotYouClient,
    firstRunToken: string | null,
    drives?: DriveDefinitionParam[],
    circles?: CircleDefinition[],
    enableAutomatedPasswordRecovery?: boolean
) => {
    const client = dotYouClient.createAxiosClient();
    const url = root + '/initialize?';
    const data = {firstRunToken: firstRunToken, drives: drives ?? [], circles: circles ?? [], enableAutomatedPasswordRecovery: enableAutomatedPasswordRecovery};

    return client
        .post<boolean>(url, data, {
            timeout: 120 * 1000, // 120s
        })
        .then((response) => {
            return response.data;
        });
};

export const isConfigured = async (dotYouClient: DotYouClient) => {
    const client = dotYouClient.createAxiosClient();
    const url = root + '/isconfigured';
    return client.post<boolean>(url, {}).then((response) => {
        return response.data;
    });
};
