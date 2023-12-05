import { DotYouClient, NumberCursoredResult } from '@youfoundation/js-lib/core';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';

export interface PushNotification {
  id: string;
  senderId: string;
  unread: boolean;
  created: {
    milliseconds: number;
    seconds: number;
  };
  options: NotificationOptions;
}

export interface PushNotificationOptions {
  appId: string;
  groupId: string;
  tagId: string;
  silent: boolean;
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
