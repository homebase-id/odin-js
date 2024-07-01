import { DotYouClient, NumberCursoredResult, PushNotificationOptions } from '../../core/core';
import { stringGuidsEqual, stringifyToQueryParams } from '../../helpers/helpers';

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
  cursor: number | undefined
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .get<NumberCursoredResult<PushNotification>>(
      `/notify/list?${stringifyToQueryParams({
        count,
        cursor,
      })}`
    )
    .then((res) => {
      return {
        ...res.data,
        results: res.data.results.filter(
          (push) => !appId || stringGuidsEqual(push.options.appId, appId)
        ),
      };
    });
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
  return await axiosClient
    .post(`/notify/list/mark-read-by-appid`, {
      appId: appId,
    })
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
  notification: PushNotificationOptions
) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient.post(`/notify/push/push`, notification);
};
