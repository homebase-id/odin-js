import {
  ActionGroup,
  AuthorName,
  CHAT_ROOT_PATH,
  ConnectionImage,
  ErrorBoundary,
  ErrorNotification,
  SubtleMessage,
  t,
} from '@homebase-id/common-app';
import { useStarredMessages } from '../../../hooks/chat/useStarredMessages';
import { ChatSentTimeIndicator } from '../Detail/ChatSentTimeIndicator';
import { MessageContent } from '../Conversations/Item/ConversationItem';
import { ChatDeliveryIndicator } from '../Detail/ChatDeliveryIndicator';
import { ChevronDown } from '@homebase-id/common-app/icons';
import { useChatToggleMessageStar } from '../../../hooks/chat/useChatToggleMessageStar';
import { Link } from 'react-router-dom';

export const StarredChatMessages = () => {
  const { data: starredMessages } = useStarredMessages().all;
  const flattenedStarredMessages =
    starredMessages?.pages.flatMap((page) => page.searchResults) ?? [];

  const { mutate: toggleStar, error: toggleStarError } = useChatToggleMessageStar().toggleStar;

  return (
    <ErrorBoundary>
      <ErrorNotification error={toggleStarError} />
      <div className="flex flex-grow flex-col overflow-auto">
        {flattenedStarredMessages?.length ? (
          <>
            {flattenedStarredMessages?.map((msg) => {
              if (!msg) return null;
              return (
                <div className="group px-2" key={msg?.fileId}>
                  <Link
                    className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-primary/20`}
                    to={`${CHAT_ROOT_PATH}/${msg.fileMetadata.appData.groupId}/${msg.fileMetadata.appData.uniqueId}`}
                  >
                    <div className="h-[3rem] w-[3rem] flex-shrink-0">
                      <ConnectionImage
                        odinId={msg.fileMetadata.originalAuthor}
                        className="flex-shrink-0 border border-neutral-200 dark:border-neutral-800"
                        size="sm"
                      />
                    </div>

                    <div className="flex w-20 flex-grow flex-col gap-1">
                      <div className="flex flex-row justify-between gap-2 overflow-hidden">
                        <p className="font-semibold">
                          <AuthorName odinId={msg.fileMetadata.originalAuthor} />
                        </p>

                        <div
                          className={`ml-auto flex translate-x-8 flex-row items-center gap-2 transition-transform duration-500 md:group-hover:translate-x-0`}
                        >
                          <ChatSentTimeIndicator
                            msg={msg}
                            keepDetail={false}
                            className="whitespace-nowrap"
                          />
                          <ActionGroup
                            type="mute"
                            size="none"
                            alwaysInPortal={true}
                            options={[
                              {
                                label: t('Unstar'),
                                onClick: () => toggleStar(msg),
                              },
                            ]}
                            className="my-auto flex-shrink-0 rounded-lg bg-background"
                          >
                            <span className="block p-1">
                              <ChevronDown className="h-4 w-4" />
                            </span>
                          </ActionGroup>
                        </div>
                      </div>

                      <div className="flex flex-row items-center gap-1">
                        <ChatDeliveryIndicator msg={msg} />
                        <div className="w-20 flex-grow leading-tight text-foreground/80">
                          <MessageContent {...msg} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </>
        ) : (
          <div className="order-2 flex flex-row flex-wrap px-5">
            <SubtleMessage className="">{t('No starred messages found')}</SubtleMessage>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
