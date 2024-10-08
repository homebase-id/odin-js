import { DotYouClient } from '../../core/DotYouClient';

export interface IntroductionGroup {
  message: string;
  recipients: string[];
}

export interface IntroductionResult {
  recipientStatus: { [key: string]: boolean };
}

export interface Introduction {
  identity: string;
  timestamp: number;
}

export const sendIntroduction = async (
  dotYouClient: DotYouClient,
  introduction: IntroductionGroup
): Promise<IntroductionResult | null> => {
  const client = dotYouClient.createAxiosClient();

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

export const getSentIntroductions = async (
  dotYouClient: DotYouClient
): Promise<Introduction[] | null> => {
  const client = dotYouClient.createAxiosClient();

  return client
    .get<Introduction[]>('/circles/requests/introductions/sent')
    .then((response) => response.data)
    .catch((error) => {
      console.error('[DotYouCore-js:getSentIntroductions]', error);
      throw error;
    });
};
