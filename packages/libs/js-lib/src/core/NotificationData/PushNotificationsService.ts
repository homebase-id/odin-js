import { AxiosRequestConfig } from 'axios';
import { OdinClient, NumberCursoredResult, PushNotificationOptions } from '../core';
import { stringifyToQueryParams } from '../../helpers/helpers';

export interface PushNotification {
  id: string;
  senderId: string;
  unread: boolean;
  created: number;
  options: PushNotificationOptions;
}

export const AddNotification = async (
  odinClient: OdinClient,
  notification: NotificationOptions
) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient.post(`/notify/list`, {
    appNotificationOptions: notification,
  });
};

export const GetNotifications = async (
  odinClient: OdinClient,
  appId: string | undefined,
  count: number | undefined = 50,
  cursor: unknown | undefined
) => {
  const axiosClient = odinClient.createAxiosClient();
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

export const getNotificationCountsByAppId = async (odinClient: OdinClient) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient
    .get<NotificationCountsByAppId>(`/notify/list/counts-by-appid`)
    .then((res) => res.data);
};

export const MarkNotificationsAsRead = async (
  odinClient: OdinClient,
  notificationIds: string[]
) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient.put(`/notify/list`, {
    updates: notificationIds.map((id) => ({
      id,
      unread: false,
    })),
  });
};

export const markAllNotificationsOfAppAsRead = async (
  odinClient: OdinClient,
  appId: string
) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient.post(`/notify/list/mark-read-by-appid`, appId).then((res) => res.data);
};

export const markAllNotificationsOfAppAndTypeIdAsRead = async (
  odinClient: OdinClient,
  appId: string,
  typeId: string
) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient
    .post(`/notify/list/mark-read-by-appid-and-typeid`, { appId, typeId })
    .then((res) => res.data);
};

export const DeleteNotifications = async (
  odinClient: OdinClient,
  notificationIds: string[]
) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient.delete(`/notify/list`, {
    data: {
      idList: notificationIds,
    },
  });
};

export const SendNotification = async (
  odinClient: OdinClient,
  notification: PushNotificationOptions,
  axiosConfig?: AxiosRequestConfig
) => {
  const axiosClient = odinClient.createAxiosClient();
  return await axiosClient.post(`/notify/push/push`, notification, axiosConfig);
};
