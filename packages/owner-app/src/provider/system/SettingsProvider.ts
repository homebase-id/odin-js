import { DotYouClient } from '@youfoundation/js-lib/core';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';

export interface uiSettings extends Record<string, unknown> {
  automaticallyLoadProfilePicture?: boolean;
}

const root = '/config';

//Handles management of Contacts

export const getFlags = async (dotYouClient: DotYouClient) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/system/flags';

  return await client.post<Record<string, boolean>>(url).then((response) => {
    return response.data;
  });
};

export const updateFlag = async (dotYouClient: DotYouClient, name: string, value: boolean) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/system/updateflag';

  return await client
    .post(url, { flagName: name, value: value ? 'true' : 'false' })
    .then((response) => {
      return response.data;
    });
};

export const getSettings = async (dotYouClient: DotYouClient) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/ownerapp/settings/list';

  return await client.post<{ settings: uiSettings }>(url).then((response) => {
    const settingsObj = response.data?.settings;
    const returnObj: uiSettings = {};

    Object.keys(settingsObj).forEach((key) => {
      returnObj[key] = tryJsonParse(settingsObj[key] + '');
    });

    return returnObj;
  });
};

export const updateSettings = async (dotYouClient: DotYouClient, settings: uiSettings) => {
  const client = dotYouClient.createAxiosClient();
  const url = root + '/ownerapp/settings/update';

  const requestObj: uiSettings = {};

  Object.keys(settings).forEach((key) => {
    requestObj[key] = JSON.stringify(settings[key]);
  });

  return await client.post(url, { settings: requestObj }).then((response) => {
    return response.data;
  });
};
