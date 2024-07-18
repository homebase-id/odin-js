import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useCommunity } from '../../hooks/community/useCommunity';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import {
  ActionLink,
  ChevronLeft,
  DialogWrapper,
  ErrorBoundary,
  usePortal,
} from '@youfoundation/common-app';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { COMMUNITY_ROOT } from './CommunityHome';
import { CommunityChannel } from '../../providers/CommunityProvider';
import { useCommunityChannel } from '../../hooks/community/channels/useCommunityChannel';
import { createPortal } from 'react-dom';
import { MessageComposer } from '../../components/Community/Message/MessageComposer';
import { CommunityMessage } from '../../providers/CommunityMessageProvider';
import { CommunityHistory } from '../../components/Community/channel/CommunityHistory';

export const CommunityChannelDetail = () => {
  const { communityKey, channelKey, dmKey } = useParams();
  const communityId = communityKey;
  const { data: community, isLoading, isFetched } = useCommunity({ communityId }).fetch;

  const { data: channelDsr, isFetched: isChannelFetched } = useCommunityChannel({
    communityId: communityId,
    channelId: channelKey,
  }).fetch;

  const [replyMsg, setReplyMsg] = useState<HomebaseFile<CommunityMessage> | undefined>();

  if (!communityId || isLoading || (!community && isFetched) || (!channelDsr && isChannelFetched))
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-grow flex-col overflow-hidden">
        <CommunityChannelHeader community={community || undefined} channel={channelDsr} />
        <ErrorBoundary>
          <div className="flex w-full flex-grow flex-col-reverse overflow-auto bg-background p-2 sm:p-5"></div>
          <CommunityHistory
            community={community || undefined}
            channel={channelDsr || undefined}
            setReplyMsg={setReplyMsg}
            setIsEmptyChat={(isEmpty: boolean) => {
              //
            }} // setIsEmptyChat={setIsEmptyChat}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <MessageComposer
            community={community || undefined}
            groupId={undefined} // Not sure if we need to set a groupId as channels would be volatile
            replyMsg={replyMsg}
            clearReplyMsg={() => setReplyMsg(undefined)}
            // onSend={onSend}
            key={channelKey || dmKey}
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

const CommunityChannelHeader = ({
  community,
  channel,
}: {
  community?: HomebaseFile<CommunityDefinition>;
  channel?: HomebaseFile<CommunityChannel>;
}) => {
  const communityId = community?.fileMetadata.appData.uniqueId;

  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);

  return (
    <>
      {/* <ErrorNotification error={clearChatError || deleteChatError} /> */}
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <ActionLink className="lg:hidden" type="mute" href={`${COMMUNITY_ROOT}/${communityId}`}>
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>

        <a
          onClick={() => setShowChatInfo(true)}
          className="flex cursor-pointer flex-row items-center gap-2"
        >
          # {channel?.fileMetadata.appData.content?.title}
          {/* {singleRecipient ? (
            <ConnectionImage
              odinId={singleRecipient}
              className="border border-neutral-200 dark:border-neutral-800"
              size="sm"
            />
          ) : withYourself ? (
            <div className="h-[3rem] w-[3rem] flex-shrink-0">
              <OwnerImage className="border border-neutral-200 dark:border-neutral-800" size="sm" />
            </div>
          ) : (
            <div className="rounded-full bg-primary/20 p-3">
              <Persons className="h-6 w-6" />
            </div>
          )}
          {singleRecipient ? (
            <ConnectionName odinId={singleRecipient} />
          ) : withYourself ? (
            <>
              <OwnerName />
              <span className="text-sm text-foreground/50">({t('you')})</span>
            </>
          ) : (
            conversation?.title
          )} */}
        </a>

        {/* {conversationDsr && !withYourself ? (
          <ActionGroup
            options={[
              {
                label: t('Chat info'),
                onClick: () => setShowChatInfo(true),
              },
              {
                label: t('Delete'),
                confirmOptions: {
                  title: t('Delete chat'),
                  buttonText: t('Delete'),
                  body: t('Are you sure you want to delete this chat? All messages will be lost.'),
                },
                onClick: () => {
                  deleteChat({ conversation: conversationDsr });
                },
              },
              {
                label: t('Clear'),
                confirmOptions: {
                  title: t('Clear chat'),
                  buttonText: t('Clear'),
                  body: t(
                    'Are you sure you want to clear all messages from this chat? All messages will be lost.'
                  ),
                },
                onClick: () => {
                  clearChat({ conversation: conversationDsr });
                },
              },
              // {label: t('Mute'), onClick: () => {}},
            ]}
            className="ml-auto"
            type={'mute'}
            size="square"
          >
            <>
              <ChevronDown className="h-5 w-5" />
              <span className="sr-only ml-1">{t('More')}</span>
            </>
          </ActionGroup>
        ) : null} */}
      </div>

      {showChatInfo && channel ? (
        <ChannelInfo channel={channel} onClose={() => setShowChatInfo(false)} />
      ) : null}
    </>
  );
};

const ChannelInfo = ({
  channel,
  onClose,
}: {
  channel: HomebaseFile<CommunityChannel>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  // const identity = useDotYouClient().getIdentity();
  const channelContent = channel.fileMetadata.appData.content;
  // const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

  // const withYourself = conversation?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  // const recipient = recipients.length === 1 ? recipients[0] : undefined;

  // const [isEditTitle, setIsEditTitle] = useState<boolean>(false);
  // const [newTitle, setNewTitle] = useState<string>(channelContent.title || '');

  // const { mutate: updateConversation, status: updateStatus } = useConversation().update;
  // const doSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   conversation.fileMetadata.appData.content.title = newTitle;
  //   updateConversation({
  //     conversation,
  //     distribute: true,
  //   });
  // };

  // useEffect(() => {
  //   updateStatus === 'success' && setIsEditTitle(false);
  // }, [updateStatus]);

  const dialog = (
    <DialogWrapper onClose={onClose} title={`${channelContent.title}`}>
      <></>
      {/* <div>
        <div className="flex flex-col items-center gap-4">
          {recipient ? (
            <ConnectionImage
              odinId={recipient}
              className="h-24 w-24 border border-neutral-200 dark:border-neutral-800"
              size="custom"
            />
          ) : withYourself ? (
            <OwnerImage
              className="h-24 w-24 border border-neutral-200 dark:border-neutral-800"
              size="custom"
            />
          ) : (
            <div className="rounded-full bg-primary/20 p-7">
              <Persons className="h-10 w-10" />
            </div>
          )}

          <>
            {recipient ? (
              <p className="text-center text-xl">
                <ConnectionName odinId={recipient} />
                <small className="flex flex-row gap-2 text-sm">
                  <House className="h-5 w-5" />
                  <a
                    href={new DotYouClient({ identity: recipient, api: ApiType.Guest }).getRoot()}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    {recipient}
                  </a>
                </small>
              </p>
            ) : withYourself ? (
              <p className="text-center text-xl">
                <OwnerName />
                <span className="text-sm text-foreground/50">({t('you')})</span>
              </p>
            ) : (
              <>
                {isEditTitle ? (
                  <form className="flex flex-col items-center gap-2" onSubmit={doSubmit}>
                    <Input
                      required
                      defaultValue={conversationContent?.title}
                      onChange={(e) => setNewTitle(e.currentTarget.value)}
                    />
                    <span className="flex flex-row">
                      <ActionButton
                        type="mute"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditTitle(false);
                        }}
                      >
                        {t('Cancel')}
                      </ActionButton>
                      <ActionButton type="mute" icon={Save}>
                        {t('Save')}
                      </ActionButton>
                    </span>
                  </form>
                ) : (
                  <a
                    onClick={() => setIsEditTitle(true)}
                    className="flex cursor-pointer flex-row items-center gap-2"
                  >
                    <span className="text-center text-xl">{conversationContent?.title}</span>
                    <Pencil className="h-5 w-5" />
                  </a>
                )}
              </>
            )}
          </>
        </div>
      </div>
      {recipients?.length > 1 ? (
        <div className="mt-10">
          <p className="mb-4 text-lg">{t('Recipients')}</p>
          <div className="flex flex-col gap-4">
            {recipients.map((recipient) => (
              <a
                href={`${new DotYouClient({ identity: recipient, api: ApiType.Guest }).getRoot()}/owner/connections/${recipient}`}
                rel="noreferrer noopener"
                target="_blank"
                className="group flex flex-row items-center gap-3"
                key={recipient}
              >
                <ConnectionImage
                  odinId={recipient}
                  className="border border-neutral-200 dark:border-neutral-800"
                  size="sm"
                />
                <div className="flex flex-col group-hover:underline">
                  <ConnectionName odinId={recipient} />
                  <p>{recipient}</p>
                </div>
                <Arrow className="ml-auto h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      ) : null} */}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
