import { DotYouClient } from '../../core/DotYouClient';

export interface IntroductionGroup {
  message: string;
  recipients: string[];
}

export interface IntroductionResult {
  recipientStatus: { [key: string]: boolean };
}

export const sendIntroduction = async (
  dotYouClient: DotYouClient,
  introduction: IntroductionGroup
): Promise<IntroductionResult | null> => {
  const client = dotYouClient.createAxiosClient();

  if (introduction.recipients.length < 2) {
    return null;
  }

  const promise: Promise<IntroductionResult | null> = client
    .post<IntroductionResult>('/circles/requests/introductions/send-introductions', introduction)
    .then((response) => response.data)
    .then((introductionResult) => {
      Object.keys(introductionResult.recipientStatus).forEach((key) => {
        if (!introductionResult.recipientStatus[key]) {
          throw new Error(`Failed to send introduction to ${key}`);
        }
      });
      return introductionResult;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:sendIntroduction]', error);
      throw error;
    });

  return await promise;
};

export const confirmIntroduction = async (
  dotYouClient: DotYouClient,
  recipient: string
): Promise<boolean | null> => {
  const client = dotYouClient.createAxiosClient();

  return client
    .post<IntroductionResult>('/circles/connections/confirm-connection', { odinId: recipient })
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[DotYouCore-js:confirmIntroduction]', error);
      throw error;
    });
};

export interface Introduction {
  identity: string;
  message: string;
  introducerOdinId: string;
  lastProcessed: number;
  sendAttemptCount: number;
  received: number;
}

export const getReceivedIntroductions = async (
  dotYouClient: DotYouClient
): Promise<Introduction[] | null> => {
  const client = dotYouClient.createAxiosClient();

  return client
    .get<Introduction[]>('/circles/requests/introductions/received')
    .then((response) => response.data)
    .catch((error) => {
      console.error('[DotYouCore-js:getReceivedIntroductions]', error);
      throw error;
    });
};

export const removeAllReceivedIntroductions = async (
  dotYouClient: DotYouClient
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();

  return client
    .delete<Introduction[]>('/circles/requests/introductions')
    .then(() => true)
    .catch((error) => {
      console.error('[DotYouCore-js:removeAllReceivedIntroductions]', error);
      throw error;
    });
};
