import {
  useRemoveNotifications,
  OWNER_APP_ID,
  ActionButton,
  t,
  SubtleMessage,
  Pager,
  LoadingBlock,
  useActiveConnections,
} from '@homebase-id/common-app';
import {SectionTitle} from '../../components/ui/Sections/Section';
import {useEffect, useState} from 'react';
import {PageMeta} from '@homebase-id/common-app';
import {Cog, Exclamation, Persons, Plus} from '@homebase-id/common-app/icons';
import ConnectionCard from '../../components/Connection/ConnectionCard/ConnectionCard';
import {NewShamirPlayerGroup} from "./NewShamirPlayerGroup";
import {ShamirDistributionDialog} from "./ShamirDistributionDialog";

const ShamirConfiguration = () => {
  const [hasActiveConnections, setActiveConnections] = useState(true);
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  useRemoveNotifications({appId: OWNER_APP_ID});

  return (
    <>
      <PageMeta
        icon={Persons}
        title={'Shmira Shamira'}
        actions={
          <>
            <ActionButton onClick={() => setIsConfigurationOpen(true)} icon={Cog}>
              {t('Configure')}
            </ActionButton>
            {/*<ActionGroup*/}
            {/*  options={[*/}
            {/*    {*/}
            {/*      label: t('Introduce'),*/}
            {/*      icon: Persons,*/}
            {/*      onClick: () => setIsIntroduceOpen(true),*/}
            {/*    },*/}
            {/*  ]}*/}
            {/*  type="mute"*/}
            {/*/>*/}
          </>
        }
      />

      <NewShamirPlayerGroup/>

      {!hasActiveConnections ? (
        <SubtleMessage className="flex flex-row items-center gap-3">
          <span>{t('Ready to add some connections?')}</span>
          <ActionButton
            onClick={(e) => {
              e.preventDefault();
              setIsConfigurationOpen(true);

              return false;
            }}
            type="secondary"
            icon={Plus}
          >
            {t('Add')}
          </ActionButton>
        </SubtleMessage>
      ) : null}

      <ActiveConnectionSection setNoActiveConnections={() => setActiveConnections(false)}/>

      <ShamirDistributionDialog
        title={t('Configure new password recovery')}
        isOpen={isConfigurationOpen}
        onConfirm={() => setIsConfigurationOpen(false)}
        onCancel={() => setIsConfigurationOpen(false)}
      />
    </>
  );
};

export default ShamirConfiguration;


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
          <div
            className="mt-5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
            {activeConnectionsLoading && (
              <>
                <LoadingBlock className="w-full"/>
                <LoadingBlock className="w-full"/>
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
                      <Exclamation className="h-5 w-5"/>
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
