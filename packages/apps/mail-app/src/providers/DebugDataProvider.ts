import {
  OdinClient,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import {
  MAIL_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailDeliveryStatus,
  getAllRecipients,
  getMailConversations,
  uploadMail,
} from './MailProvider';
import { getNewId } from '@homebase-id/js-lib/helpers';
import { getConnections } from '@homebase-id/js-lib/network';

export const rando = (arr: string[]) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const getFunName = () => {
  const adjectives = [
    'adorable',
    'beautiful',
    'clean',
    'drab',
    'elegant',
    'fancy',
    'glamorous',
    'handsome',
    'long',
    'magnificent',
    'old-fashioned',
    'plain',
    'quaint',
    'sparkling',
    'ugliest',
    'unsightly',
    'angry',
    'bewildered',
    'clumsy',
    'defeated',
    'embarrassed',
    'fierce',
    'grumpy',
    'helpless',
    'itchy',
    'jealous',
    'lazy',
    'mysterious',
    'nervous',
    'obnoxious',
    'panicky',
    'repulsive',
    'scary',
    'thoughtless',
    'uptight',
    'worried',
  ];

  const nouns = [
    'women',
    'men',
    'children',
    'teeth',
    'feet',
    'people',
    'leaves',
    'mice',
    'geese',
    'halves',
    'knives',
    'wives',
    'lives',
    'elves',
    'loaves',
    'potatoes',
    'tomatoes',
    'cacti',
    'foci',
    'fungi',
    'nuclei',
    'syllabuses',
    'analyses',
    'diagnoses',
    'oases',
    'theses',
    'crises',
    'phenomena',
    'criteria',
    'data',
  ];

  return `${rando(adjectives)} ${rando(adjectives)} ${rando(nouns)}`;
};

const sendOne = async (odinClient: OdinClient, threadId: string, recipients: string[]) => {
  const uniqueId = getNewId();
  const originId = getNewId();

  const newMailConversation: NewHomebaseFile<MailConversation> = {
    fileMetadata: {
      appData: {
        uniqueId: uniqueId,
        groupId: threadId,
        fileType: MAIL_CONVERSATION_FILE_TYPE,
        content: {
          subject: getFunName(),
          sender: odinClient.getHostIdentity(),
          message: [
            {
              type: 'p',
              children: [
                {
                  text: getFunName(),
                },
              ],
            },
          ],
          recipients: recipients,
          originId: originId,
          threadId: threadId,
          deliveryStatus: MailDeliveryStatus.Sent,
        },
        userDate: new Date().getTime(),
      },
    },
    serverMetadata: {
      accessControlList: {
        requiredSecurityGroup: SecurityGroupType.AutoConnected,
      },
    },
  };

  await uploadMail(odinClient, newMailConversation, undefined);
};

export const MakeConversation = async (odinClient: OdinClient) => {
  const connections = (
    await getConnections(odinClient, {
      cursor: undefined,
      count: 5,
    })
  ).results.map((result) => result.odinId);
  const recipients = connections;

  for (let i = 0; i < 25; i++) {
    const threadId = getNewId();
    await sendOne(odinClient, threadId, recipients);
  }
};

const PAGE_SIZE = 100;
export const BePolite = async (odinClient: OdinClient) => {
  const allThreads = await getMailConversations(odinClient, undefined, undefined, PAGE_SIZE);

  // Group the flattenedConversations by their groupId
  const threadsDictionary = allThreads.results.reduce(
    (acc, conversation) => {
      const threadId = conversation.fileMetadata.appData.groupId as string;

      if (!acc[threadId]) acc[threadId] = [conversation];
      else acc[threadId].push(conversation);

      return acc;
    },
    {} as Record<string, HomebaseFile<MailConversation>[]>
  );
  const threads = Object.values(threadsDictionary);

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i][0];
    if (!thread) continue;
    const recipients = getAllRecipients(thread, odinClient.getHostIdentity());

    await sendOne(odinClient, thread.fileMetadata.appData.content.threadId, recipients);
  }
};
