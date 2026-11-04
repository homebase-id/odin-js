import { DotYouClient } from '../../core/DotYouClient';

// V2: /api/v2/connections/introductions
const IntroductionsRootV2 = '/connections/introductions';

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
  const client = dotYouClient.createAxiosClient({ v2: true });

  if (introduction.recipients.length < 2) {
    return null;
  }

  const promise: Promise<IntroductionResult | null> = client
    .post<IntroductionResult>(IntroductionsRootV2, introduction)
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
  const client = dotYouClient.createAxiosClient({ v2: true });

  return client
    .get<Introduction[]>(IntroductionsRootV2)
    .then((response) => response.data)
    .catch((error) => {
      console.error('[DotYouCore-js:getReceivedIntroductions]', error);
      throw error;
    });
};

export const removeAllReceivedIntroductions = async (
  dotYouClient: DotYouClient
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient({ v2: true });

  return client
    .delete(IntroductionsRootV2)
    .then(() => true)
    .catch((error) => {
      console.error('[DotYouCore-js:removeAllReceivedIntroductions]', error);
      throw error;
    });
};
