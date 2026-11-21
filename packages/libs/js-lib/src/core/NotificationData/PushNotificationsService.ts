import { AxiosRequestConfig } from 'axios';
import { DotYouClient, NumberCursoredResult, PushNotificationOptions } from '../core';
import { stringifyToQueryParams } from '../../helpers/helpers';

export interface PushNotification {
  id: string;
  senderId: string;
  unread: boolean;
  created: number;
  options: PushNotificationOptions;
}

export const AddNotification = async (
  dotYouClient: DotYouClient,
  notification: NotificationOptions
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient.post(`/notify/list`, {
    appNotificationOptions: notification,
  });
};

export const GetNotifications = async (
  dotYouClient: DotYouClient,
  appId: string | undefined,
  count: number | undefined = 50,
  cursor: unknown | undefined
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .get<NumberCursoredResult<PushNotification>>(
      `/notify/list?${stringifyToQueryParams({
        count,
        cursor,
        appId,
      })}`
    )
    .then((res) => res.data);
};

export interface NotificationCountsByAppId {
  unreadCounts: Record<string, number>;
}

export const getNotificationCountsByAppId = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .get<NotificationCountsByAppId>(`/notify/list/counts-by-appid`)
    .then((res) => res.data);
};

export const MarkNotificationsAsRead = async (
  dotYouClient: DotYouClient,
  notificationIds: string[]
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient.put(`/notify/list`, {
    updates: notificationIds.map((id) => ({
      id,
      unread: false,
    })),
  });
};

export const markAllNotificationsOfAppAsRead = async (
  dotYouClient: DotYouClient,
  appId: string
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient.post(`/notify/list/mark-read-by-appid`, appId).then((res) => res.data);
};

export const markAllNotificationsOfAppAndTypeIdAsRead = async (
  dotYouClient: DotYouClient,
  appId: string,
  typeId: string
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post(`/notify/list/mark-read-by-appid-and-typeid`, { appId, typeId })
    .then((res) => res.data);
};

export const DeleteNotifications = async (
  dotYouClient: DotYouClient,
  notificationIds: string[]
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient.delete(`/notify/list`, {
    data: {
      idList: notificationIds,
    },
  });
};

export const SendNotification = async (
  dotYouClient: DotYouClient,
  notification: PushNotificationOptions,
  axiosConfig?: AxiosRequestConfig
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient.post(`/notify/push/push`, notification, axiosConfig);
};
