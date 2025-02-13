import {
  useRemoveNotifications,
  OWNER_APP_ID,
  ActionButton,
  t,
  SubtleMessage,
  usePendingConnections,
  Pager,
  LoadingBlock,
  useSentConnections,
  useActiveConnections,
  ActionGroup,
  useReceivedIntroductions,
  DomainHighlighter,
  AuthorName,
  ErrorNotification,
} from '@homebase-id/common-app';
import PersonIncomingRequest from '../../components/Connection/PersonIncomingRequest/PersonIncomingRequest';
import PersonOutgoingRequest from '../../components/Connection/PersonOutgoingRequest/PersonOutgoingRequest';
import { SectionTitle } from '../../components/ui/Sections/Section';
import { useEffect, useState } from 'react';
import { PageMeta } from '@homebase-id/common-app';
import { OutgoingConnectionDialog } from '../../components/Connection/ConnectionDialogs/OutgoingConnectionDialog';
import { IntroductionDialog } from '../../components/Connection/ConnectionDialogs/IntroductionDialog';
import { Exclamation, HeartBeat, Persons, Plus } from '@homebase-id/common-app/icons';
import PersonCard from '../../components/Connection/PersonCard/PersonCard';
import ConnectionCard from '../../components/Connection/ConnectionCard/ConnectionCard';

const Connections = () => {
  const [isShowDebugInfo, setIsShowDebugInfo] = useState(false);
  const [hasActiveConnections, setActiveConnections] = useState(true);
  const [hasPendingConnections, setPendingConnections] = useState(true);
  const [hasSentConnections, setSentConnections] = useState(true);

  const [isSentConnectionOpen, setIsSentConnectionOpen] = useState(false);
  const [isIntroduceOpen, setIsIntroduceOpen] = useState(false);
  useRemoveNotifications({ appId: OWNER_APP_ID });

  return (
    <>
      <PageMeta
        icon={Persons}
        title={'Connections'}
        actions={
          <>
            <ActionButton onClick={() => setIsSentConnectionOpen(true)} icon={Plus}>
              {t('Send Request')}
            </ActionButton>
            <ActionGroup
              options={[
                {
                  label: t('Introduce'),
                  icon: Persons,
                  onClick: () => setIsIntroduceOpen(true),
                },
                isShowDebugInfo
                  ? {
                      label: t('Hide introductions'),
                      icon: HeartBeat,
                      onClick: () => setIsShowDebugInfo(false),
                    }
                  : {
                      label: t('Show introductions'),
                      icon: HeartBeat,
                      onClick: () => setIsShowDebugInfo(true),
                    },
              ]}
              type="mute"
            />
          </>
        }
      />

      {!hasActiveConnections && !hasSentConnections && !hasPendingConnections ? (
        <SubtleMessage className="flex flex-row items-center gap-3">
          <span>{t('Ready to add some connections?')}</span>
          <ActionButton
            onClick={(e) => {
              e.preventDefault();
              setIsSentConnectionOpen(true);

              return false;
            }}
            type="secondary"
            icon={Plus}
          >
            {t('Add')}
          </ActionButton>
        </SubtleMessage>
      ) : null}

      <PendingConnectionSection setNoPendingConnections={() => setPendingConnections(false)} />
      <SentConnectionSection setNoSentConnections={() => setSentConnections(false)} />

      <ActiveConnectionSection setNoActiveConnections={() => setActiveConnections(false)} />

      {isShowDebugInfo ? (
        <>
          <IncomingIntroductionsSection />
          <OutgoingIntroductionsSection />
        </>
      ) : null}

      <OutgoingConnectionDialog
        title={t('Send connection request')}
        isOpen={isSentConnectionOpen}
        onConfirm={() => setIsSentConnectionOpen(false)}
        onCancel={() => setIsSentConnectionOpen(false)}
      />
      <IntroductionDialog
        isOpen={isIntroduceOpen}
        onConfirm={() => setIsIntroduceOpen(false)}
        onCancel={() => setIsIntroduceOpen(false)}
      />
    </>
  );
};

export default Connections;

const PendingConnectionSection = ({
  setNoPendingConnections,
}: {
  setNoPendingConnections: () => void;
}) => {
  const [activePage, setActivePage] = useState(1);

  const { data, isLoading, isFetchedAfterMount, hasNextPage, fetchNextPage } =
    usePendingConnections().fetch;
  const flatPendingConnections = data?.pages?.map((page) => page.results).flat();

  useEffect(() => {
    if (!isFetchedAfterMount) return;
    if (data?.pages[0]?.results?.length === 0) setNoPendingConnections();

    if (data?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [activePage, isFetchedAfterMount]);

  if (!flatPendingConnections?.length) return null;

  return (
    <>
      <SectionTitle
        title={t('Connection requests')}
        actions={
          <Pager
            totalPages={hasNextPage ? activePage + 1 : activePage}
            setPage={setActivePage}
            currentPage={activePage}
          />
        }
      />
      <div className="-m-1 mt-5 flex flex-row flex-wrap">
        {isLoading && (
          <>
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
          </>
        )}

        {flatPendingConnections?.map((pendingConnection) => (
          <PersonIncomingRequest
            className="w-full p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6"
            senderOdinId={pendingConnection.senderOdinId}
            key={pendingConnection.senderOdinId}
          />
        ))}
      </div>

      <div className="flex flex-row justify-center pt-5 md:hidden">
        <Pager
          totalPages={hasNextPage ? activePage + 1 : activePage}
          setPage={setActivePage}
          currentPage={activePage}
          size="xl"
        />
      </div>
    </>
  );
};

const SentConnectionSection = ({ setNoSentConnections }: { setNoSentConnections: () => void }) => {
  const [activePage, setActivePage] = useState(1);
  const { data, isLoading, isFetchedAfterMount, hasNextPage, fetchNextPage } =
    useSentConnections().fetch;
  const flatSentConnections = data?.pages?.map((page) => page.results).flat();

  useEffect(() => {
    if (!isFetchedAfterMount) return;
    if (data?.pages[0]?.results?.length === 0) setNoSentConnections();

    if (data?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [activePage, isFetchedAfterMount]);

  if (!flatSentConnections?.length) return null;

  if (!flatSentConnections?.length) {
    return null;
  }

  return (
    <>
      <SectionTitle
        title={t('Sent Connection Requests')}
        actions={
          <Pager
            totalPages={hasNextPage ? activePage + 1 : activePage}
            setPage={setActivePage}
            currentPage={activePage}
          />
        }
      />
      <div className="-m-1 mt-5 flex flex-row flex-wrap">
        {isLoading && (
          <>
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
          </>
        )}

        {flatSentConnections?.map((sentRequest) => (
          <PersonOutgoingRequest
            className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6"
            recipientOdinId={sentRequest.recipient}
            key={sentRequest.recipient}
          />
        ))}
      </div>
      <div className="flex flex-row justify-center pt-5 md:hidden">
        <Pager
          totalPages={hasNextPage ? activePage + 1 : activePage}
          setPage={setActivePage}
          currentPage={activePage}
          size="xl"
        />
      </div>
    </>
  );
};

const IncomingIntroductionsSection = ({
  setNoIncomingIntroductions,
}: {
  setNoIncomingIntroductions?: () => void;
}) => {
  const {
    fetch: { data: introductions, isLoading: introductionsLoading },
    deleteAll: { mutate: deleteAllIntroductions, error: deleteError, status: deleteStatus },
  } = useReceivedIntroductions();

  useEffect(() => {
    if (!introductions?.length && setNoIncomingIntroductions) setNoIncomingIntroductions();
  }, [introductions]);

  return (
    <>
      <ErrorNotification error={deleteError} />
      <SectionTitle
        title={t('Incoming introductions')}
        actions={
          <ActionButton
            type="mute"
            confirmOptions={{
              title: t('Delete all introductions'),
              body: t(
                'Are you sure you want to delete all introductions? This action cannot be undone.'
              ),
              buttonText: t('Delete all introductions'),
            }}
            onClick={() => deleteAllIntroductions()}
            state={deleteStatus}
          >
            {t('Delete all introductions')}
          </ActionButton>
        }
      />
      <div className="-m-1 mt-5 flex flex-row flex-wrap">
        {introductionsLoading && (
          <>
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
          </>
        )}

        {!introductions?.length ? (
          <p className="text-slate-400">{t('No incoming introductions')}</p>
        ) : (
          introductions?.map((introduction) => (
            <PersonCard
              className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6"
              odinId={introduction.identity}
              key={introduction.identity}
              canSave={false}
              href={`/owner/connections/${introduction.identity}`}
            >
              <h2 className="font-thiner dark:text-white">
                <DomainHighlighter>{introduction.identity}</DomainHighlighter>
              </h2>
              <p className="text-sm text-slate-400">
                {t('Introduced by')}{' '}
                <AuthorName excludeLink={true} odinId={introduction?.introducerOdinId} />
                {introduction.received ? (
                  <>
                    {t(' on ')} {new Date(introduction.received).toLocaleDateString()}
                  </>
                ) : null}
              </p>
            </PersonCard>
          ))
        )}
      </div>
    </>
  );
};

const OutgoingIntroductionsSection = ({
  setNoSentConnections,
}: {
  setNoSentConnections?: () => void;
}) => {
  const [activePage, setActivePage] = useState(1);
  const { data, isLoading, isFetchedAfterMount, hasNextPage, fetchNextPage } = useSentConnections({
    includeIntroductions: 'only',
  }).fetch;
  const flatSentConnections = data?.pages?.map((page) => page.results).flat();

  useEffect(() => {
    if (!isFetchedAfterMount || !setNoSentConnections) return;
    if (data?.pages[0]?.results?.length === 0) setNoSentConnections();

    if (data?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [activePage, isFetchedAfterMount]);

  return (
    <>
      <SectionTitle
        title={t('Outgoing introductions')}
        actions={
          <Pager
            totalPages={hasNextPage ? activePage + 1 : activePage}
            setPage={setActivePage}
            currentPage={activePage}
          />
        }
      />
      <div className="-m-1 mt-5 flex flex-row flex-wrap">
        {isLoading && (
          <>
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
          </>
        )}

        {!flatSentConnections?.length ? (
          <p className="text-slate-400">{t('No outgoing introductions')}</p>
        ) : (
          flatSentConnections?.map((sentRequest) => (
            <PersonOutgoingRequest
              className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6"
              recipientOdinId={sentRequest.recipient}
              key={sentRequest.recipient}
            />
          ))
        )}
      </div>
      <div className="flex flex-row justify-center pt-5 md:hidden">
        <Pager
          totalPages={hasNextPage ? activePage + 1 : activePage}
          setPage={setActivePage}
          currentPage={activePage}
          size="xl"
        />
      </div>
    </>
  );
};

const ActiveConnectionSection = ({
  setNoActiveConnections,
}: {
  setNoActiveConnections: () => void;
}) => {
  const [activePage, setActivePage] = useState(1);

  const {
    data: activeConnections,
    isLoading: activeConnectionsLoading,
    isFetchedAfterMount: activeConnectionsFetchedAfterMount,
    hasNextPage: activeHasNextPageOnServer,
    fetchNextPage: fetchNextActivePage,
  } = useActiveConnections({
    pageSize: 18,
  }).fetch;

  useEffect(() => {
    if (!activeConnectionsFetchedAfterMount) return;
    if (activeConnections?.pages[0]?.results?.length === 0) setNoActiveConnections();

    if (activeConnections?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextActivePage();
    }
  }, [activePage, activeConnectionsFetchedAfterMount]);

  const activeHasNextPage = activeConnections?.pages[activePage] || activeHasNextPageOnServer;

  if (!activeConnections?.pages?.[0]?.results?.length) return null;

  return (
    <>
      {activeConnections?.pages?.[0]?.results?.length || activeConnectionsLoading ? (
        <>
          <SectionTitle
            title={t('Contacts')}
            actions={
              <Pager
                totalPages={activeHasNextPage ? activePage + 1 : activePage}
                setPage={setActivePage}
                currentPage={activePage}
              />
            }
          />
          <div className="mt-5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            {activeConnectionsLoading && (
              <>
                <LoadingBlock className="w-full" />
                <LoadingBlock className="w-full" />
              </>
            )}

            {activeConnections?.pages?.[activePage - 1]?.results?.map((activeConnection) =>
              typeof activeConnection === 'object' ? (
                <ConnectionCard
                  odinId={activeConnection.odinId}
                  href={
                    (activeConnection.odinId && `/owner/connections/${activeConnection.odinId}`) ??
                    undefined
                  }
                  canSave={true}
                  key={activeConnection.odinId}
                >
                  {!activeConnection.hasVerificationHash ? (
                    <div
                      className="absolute left-3 top-3 rounded-full bg-background p-[0.2rem] text-blue-400"
                      title={t('Missing confirmation hash')}
                    >
                      <Exclamation className="h-5 w-5" />
                    </div>
                  ) : null}
                </ConnectionCard>
              ) : null
            )}
            <div></div>
          </div>
          <div className="flex flex-row justify-center pt-5 md:hidden">
            <Pager
              totalPages={activeHasNextPage ? activePage + 1 : activePage}
              setPage={setActivePage}
              currentPage={activePage}
              size="xl"
            />
          </div>
        </>
      ) : null}
    </>
  );
};
