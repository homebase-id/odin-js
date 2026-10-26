import {DotYouClient, DriveDefinition, TargetDrive} from '@homebase-id/js-lib/core';
import {CircleDefinition} from '@homebase-id/js-lib/network';
import {assertValidSlug} from '@homebase-id/js-lib/helpers';

/**
 * A drive the setup wizard asks the server to create (InitialSetupRequest.Drives). Each goes through
 * the same create path as any other drive, so both slugs are required and must be valid slugs
 * (see `isValidSlug`): the server derives neither.
 */
export interface DriveDefinitionParam
    extends Omit<DriveDefinition, 'targetDriveInfo' | 'driveSlug' | 'driveTypeSlug'> {
    targetDrive: TargetDrive;
    driveSlug: string;
    driveTypeSlug: string;
}

//Handles management of the System
const root = '/config/system';

export const initialize = async (
    dotYouClient: DotYouClient,
    firstRunToken: string | null,
    drives?: DriveDefinitionParam[],
    circles?: CircleDefinition[]
) => {
    const client = dotYouClient.createAxiosClient();
    const url = root + '/initialize?';
    drives?.forEach((d) => {
        assertValidSlug('driveSlug', d.driveSlug);
        assertValidSlug('driveTypeSlug', d.driveTypeSlug);
    });
    const data = {firstRunToken: firstRunToken, drives: drives ?? [], circles: circles ?? []};

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
