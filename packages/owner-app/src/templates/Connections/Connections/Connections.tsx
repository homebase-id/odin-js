import { ActionButton, Plus, SubtleMessage } from '@youfoundation/common-app';
import PersonIncomingRequest from '../../../components/Connection/PersonIncomingRequest/PersonIncomingRequest';
import PersonOutgoingRequest from '../../../components/Connection/PersonOutgoingRequest/PersonOutgoingRequest';
import { t, usePendingConnections, useSentConnections } from '@youfoundation/common-app';
import { SectionTitle } from '../../../components/ui/Sections/Section';
import OutgoingConnectionDialog from '../../../components/Dialog/ConnectionDialogs/OutgoingConnectionDialog';
import { useEffect, useState } from 'react';
import { Pager, Persons } from '@youfoundation/common-app';
import { LoadingBlock } from '@youfoundation/common-app';
import PersonActive from '../../../components/Connection/PersonActive/PersonActive';
import { DotYouProfile } from '@youfoundation/js-lib/network';
import { useActiveConnections } from '@youfoundation/common-app';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';

const Connections = () => {
  const [hasActiveConnections, setActiveConnections] = useState(true);
  const [hasPendingConnections, setPendingConnections] = useState(true);
  const [hasSentConnections, setSentConnections] = useState(true);

  const [isSentConnectionOpen, setIsSentConnectionOpen] = useState(false);

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
          </>
        }
      />

      <div className="-mt-6">
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
        <OutgoingConnectionDialog
          title={t('Send connection request')}
          isOpen={isSentConnectionOpen}
          onConfirm={() => setIsSentConnectionOpen(false)}
          onCancel={() => setIsSentConnectionOpen(false)}
        />
      </div>
    </>
  );
};

export default Connections;

const PendingConnectionSection = ({
  setNoPendingConnections,
}: {
  setNoPendingConnections: () => void;
}) => {
  const [pendingPage, setPendingPage] = useState(1);

  const { data: pendingConnections, isLoading: pendingConnectionsLoading } = usePendingConnections({
    pageSize: 6,
    pageNumber: pendingPage,
  }).fetch;

  useEffect(() => {
    if (!pendingConnections?.results?.length) setNoPendingConnections();
  }, [pendingConnections]);

  if (!pendingConnections?.results?.length) {
    return null;
  }

  return (
    <>
      <SectionTitle
        title={t('Connection requests')}
        actions={
          <Pager
            totalPages={pendingConnections?.totalPages}
            setPage={setPendingPage}
            currentPage={pendingPage}
          />
        }
      />
      <div className="-m-1 mt-5 flex flex-row flex-wrap">
        {pendingConnectionsLoading && (
          <>
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
          </>
        )}

        {pendingConnections?.results?.map((pendingConnection) => (
          <PersonIncomingRequest
            className="w-full p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6"
            senderOdinId={pendingConnection.senderOdinId}
            key={pendingConnection.senderOdinId}
          />
        ))}
      </div>

      <div className="flex flex-row justify-center pt-5 md:hidden">
        <Pager
          totalPages={pendingConnections?.totalPages}
          setPage={setPendingPage}
          currentPage={pendingPage}
          size="xl"
        />
      </div>
    </>
  );
};
const SentConnectionSection = ({ setNoSentConnections }: { setNoSentConnections: () => void }) => {
  const [sentPage, setSentPage] = useState(1);

  const { data: sentRequests, isLoading: sentRequestsLoading } = useSentConnections({
    pageSize: 6,
    pageNumber: sentPage,
  }).fetch;

  useEffect(() => {
    if (!sentRequests?.results?.length) setNoSentConnections();
  }, [sentRequests]);

  if (!sentRequests?.results?.length) {
    return null;
  }

  return (
    <>
      <SectionTitle
        title={t('Sent Connection Requests')}
        actions={
          <Pager
            totalPages={sentRequests?.totalPages}
            setPage={setSentPage}
            currentPage={sentPage}
          />
        }
      />
      <div className="-m-1 mt-5 flex flex-row flex-wrap">
        {sentRequestsLoading && (
          <>
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
          </>
        )}

        {sentRequests?.results?.map((sentRequest) => (
          <PersonOutgoingRequest
            className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6"
            recipientOdinId={sentRequest.recipient}
            key={sentRequest.recipient}
          />
        ))}
      </div>
      <div className="flex flex-row justify-center pt-5 md:hidden">
        <Pager
          totalPages={sentRequests?.totalPages}
          setPage={setSentPage}
          currentPage={sentPage}
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
                <PersonActive
                  className="min-w-[5rem]"
                  dotYouProfile={activeConnection as DotYouProfile}
                  key={activeConnection.odinId}
                />
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
