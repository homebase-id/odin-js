import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MailHomeHeader } from '../../components/Header/Header';
import { useMailThread } from '../../hooks/mail/useMailThread';
import { ConnectionName, RichTextRenderer, flattenInfinteData, t } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { MailConversation } from '../../providers/MailProvider';

const PAGE_SIZE = 100;
export const MailConversationDetail = () => {
  const { conversationKey } = useParams();
  const { data: messages } = useMailThread({ threadId: conversationKey }).thread;

  // Flatten all pages, sorted descending and slice on the max number expected
  const flattenedConversations = useMemo(
    () =>
      flattenInfinteData<DriveSearchResult<MailConversation>>(
        messages,
        PAGE_SIZE,
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
    [messages]
  );

  return (
    <>
      <MailHomeHeader />
      <div className="">{conversationKey}</div>
      <section className="mx-5 my-5 flex flex-col rounded-lg bg-background px-5 py-5">
        <div className="mb-7">
          <h1 className="text-2xl">
            {flattenedConversations?.[0]?.fileMetadata.appData.content.subject}
          </h1>
        </div>
        <div className="flex flex-col">
          {flattenedConversations?.map((message) => {
            const messageFromMe = !message.fileMetadata.senderOdinId;
            return (
              <div
                key={message.fileId}
                className={`flex ${messageFromMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div>
                  <p className="font-semibold">
                    {!messageFromMe ? (
                      <ConnectionName odinId={message.fileMetadata.senderOdinId} />
                    ) : (
                      t('Me')
                    )}
                  </p>
                  <RichTextRenderer body={message.fileMetadata.appData.content.message} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
};
