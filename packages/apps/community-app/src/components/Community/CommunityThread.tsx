import {
  ActionLink,
  t,
  LoadingBlock,
  ErrorBoundary,
  COMMUNITY_ROOT_PATH,
} from '@homebase-id/common-app';
import { ChevronLeft, Times } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useParams } from 'react-router-dom';
import { useCommunityMessage } from '../../hooks/community/messages/useCommunityMessage';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { CommunityChannel } from '../../providers/CommunityProvider';
import { CommunityHistory } from './channel/CommunityHistory';
import { memo, ReactNode, useEffect, useMemo, useState } from 'react';
import { useEditLastMessageShortcut } from '../../hooks/community/messages/useEditLastMessageShortcut';
import { MessageComposer } from './Message/composer/MessageComposer';

export const CommunityThread = memo(
  ({
    community,
    channel,
    threadId,
  }: {
    community: HomebaseFile<CommunityDefinition> | undefined;
    channel?: HomebaseFile<CommunityChannel> | undefined;
    threadId: string;
  }) => {
    const { odinKey, communityKey, channelKey } = useParams();
    const [participants, setParticipants] = useState<string[] | null>();

    const { data: originMessage } = useCommunityMessage({
      odinId: community?.fileMetadata.senderOdinId,
      communityId: community?.fileMetadata.appData.uniqueId,
      channelId: channel?.fileMetadata.appData.uniqueId,
      messageId: threadId,
      fileSystemType: 'Standard',
    }).get;

    const keyDownHandler = useEditLastMessageShortcut({
      community,
      channel,
      origin: originMessage || undefined,
    });

    if (!community || !threadId) return null;

    return (
      <ResizablePane>
        <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
          <ActionLink
            className="p-2 xl:hidden"
            size="none"
            type="mute"
            href={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey || 'all'}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </ActionLink>
          {t('Thread')}
          <ActionLink
            href={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey || 'all'}`}
            icon={Times}
            size="none"
            type="mute"
            className="hidden p-2 lg:-m-2 lg:ml-auto xl:flex"
          />
        </div>
        <div className="flex h-20 flex-grow flex-col overflow-auto bg-background">
          {!originMessage ? (
            <div className="flex flex-col gap-3 p-5">
              <LoadingBlock className="h-12 w-full" />
              <LoadingBlock className="h-12 w-full" />
              <LoadingBlock className="h-12 w-full" />
            </div>
          ) : (
            <CommunityHistory
              community={community}
              origin={originMessage}
              channel={channel}
              setParticipants={setParticipants}
              alignTop={true}
            />
          )}

          <ErrorBoundary>
            <MessageComposer
              community={community}
              thread={originMessage || undefined}
              channel={channel}
              key={threadId}
              threadParticipants={participants || undefined}
              onKeyDown={keyDownHandler}
              className="mt-auto xl:mt-0"
            />
          </ErrorBoundary>
        </div>
      </ResizablePane>
    );
  }
);
CommunityThread.displayName = 'CommunityThread';

const ResizablePane = memo(({ children }: { children: ReactNode }) => {
  const [clientXStart, setClientXStart] = useState<number>();
  const [clientX, setClientX] = useState<number>();

  const localStorageOffset = useMemo(
    () => parseInt(localStorage.getItem('THREAD_PANE_WIDTH_OFFSET') || '0'),
    []
  );

  useEffect(() => {
    if (clientX && clientXStart) {
      let newWidthDiff = localStorageOffset + (clientX - clientXStart);

      if (newWidthDiff > 200) newWidthDiff = 200;
      else if (newWidthDiff < -350) newWidthDiff = -350;
      localStorage.setItem('THREAD_PANE_WIDTH_OFFSET', newWidthDiff + '');
    }
  }, [clientX, clientXStart]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!e.clientX || e.clientX === 0) return;
      const newClientX = e.clientX;
      if (clientXStart) {
        const newWidthDiff = localStorageOffset + (newClientX - clientXStart);

        if (newWidthDiff > 200) return;
        else if (newWidthDiff < -350) return;
        else setClientX(newClientX);
      }
    };

    window.addEventListener('dragover', handler);
    return () => window.removeEventListener('dragover', handler);
  }, [localStorageOffset, clientXStart]);

  const [isXlWidth, setXlWidth] = useState<boolean>(window.innerWidth > 1280);
  useEffect(() => {
    const handler = () => setXlWidth(window.innerWidth > 1280);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });

  return (
    <div
      className="absolute inset-0 flex h-full w-full flex-col shadow-lg dark:border-l dark:border-slate-800 xl:relative xl:max-w-sm"
      style={
        isXlWidth
          ? {
              maxWidth: `calc(24rem - ${localStorageOffset}px - ${clientX && clientXStart ? clientX - clientXStart : 0}px)`,
              minWidth: '20rem',
            }
          : undefined
      }
    >
      <div
        className="absolute bottom-0 left-0 top-0 z-10 hidden w-5 cursor-col-resize border-l border-transparent hover:border-slate-300 dark:hover:border-slate-600 xl:block"
        onDragStart={(e) => {
          if (!clientXStart) setClientXStart(e.clientX);
        }}
        onDragEnd={() => {
          setClientXStart(undefined);
        }}
        draggable="true"
      ></div>
      {children}
    </div>
  );
});

ResizablePane.displayName = 'ResizablePane';
